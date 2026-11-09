#!/usr/bin/env pwsh
# deploy.ps1 - Catalog refresh + push helper for tipind
#
#   1. Rebuilds the catalog from the live Google Sheet (via Apps Script)
#   2. Sets up git if needed (init, identity, remote)
#   3. Stages all changes and commits
#      (message defaults to "updated the catalog to catalog.<hash>.dat")
#   4. Pushes, walking you through GitHub login / merging remote history if needed
#
# This does NOT publish to Cloudflare. After it finishes, run:
#   npm run deploy
#
# Usage:
#   ./deploy.ps1                      # auto commit message
#   ./deploy.ps1 "custom message"     # override the message

param(
    [Parameter(Position = 0)]
    [string]$CommitMessage,

    [string]$Remote = "origin",
    [string]$DefaultBranch = "main"
)

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
Set-Location $scriptDir

# ---------- helpers ----------

function Invoke-Native {
    param([scriptblock]$Command, [string]$ErrorMessage)
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$ErrorMessage (exit code $LASTEXITCODE)"
    }
}

# Runs git, prints its output, and returns the exit code + text so we can react to errors.
function Invoke-GitCapture {
    param([string[]]$GitArgs)
    $old = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $lines = & git @GitArgs 2>&1 | ForEach-Object { $_.ToString() }
    $code = $LASTEXITCODE
    $ErrorActionPreference = $old
    $text = ($lines -join "`n")
    if ($text) { Write-Host $text }
    return [pscustomobject]@{ Code = $code; Text = $text }
}

function Get-EnvFileValue {
    param([string]$Path, [string]$Key)
    if (-not (Test-Path $Path)) { return $null }
    $line = Select-String -Path $Path -Pattern "^\s*$([regex]::Escape($Key))\s*=" | Select-Object -First 1
    if (-not $line) { return $null }
    $value = ($line.Line -split "=", 2)[1].Trim()
    return $value.Trim('"').Trim("'")
}

function Test-AuthError {
    param([string]$Text)
    return $Text -match 'Authentication failed|could not read Username|Permission to .* denied|permission denied|returned error: 40[13]|Invalid username|terminal prompts disabled|Support for password authentication|Repository not found'
}

function Test-Rejected {
    param([string]$Text)
    return $Text -match 'fetch first|non-fast-forward|Updates were rejected'
}

# Forget the saved GitHub credentials so the next push asks for a fresh login.
function Clear-GitHubCredentials {
    "protocol=https`nhost=github.com`n`n" | git credential reject 2>$null
    if (Get-Command gh -ErrorAction SilentlyContinue) {
        $old = $ErrorActionPreference; $ErrorActionPreference = "Continue"
        gh auth logout -h github.com 2>$null
        $ErrorActionPreference = $old
    }
    Write-Host "Cleared saved GitHub credentials." -ForegroundColor Gray
}

# Walks the user through logging in to GitHub.
function Connect-GitHub {
    Write-Host "`nGitHub login needed." -ForegroundColor Magenta

    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        Write-Host "The GitHub CLI (gh) makes login easy, but it isn't installed." -ForegroundColor Gray
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            $a = Read-Host "Install it now with winget? (Y/n)"
            if ($a -notmatch '^(n|no)$') {
                winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements
                # pick up the new PATH in this session
                $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
            }
        }
    }

    if (Get-Command gh -ErrorAction SilentlyContinue) {
        $old = $ErrorActionPreference; $ErrorActionPreference = "Continue"
        gh auth status -h github.com *> $null
        $loggedIn = ($LASTEXITCODE -eq 0)
        $ErrorActionPreference = $old

        if (-not $loggedIn) {
            Write-Host "Starting GitHub login. Pick: GitHub.com > HTTPS > Login with a web browser." -ForegroundColor Cyan
            Write-Host "Copy the one-time code it shows and paste it into the browser page." -ForegroundColor Cyan
            gh auth login -h github.com -p https -w
            if ($LASTEXITCODE -ne 0) { throw "GitHub login failed or was cancelled." }
        }
        gh auth setup-git
        Write-Host "Logged in to GitHub." -ForegroundColor Green
    } else {
        Write-Host "No GitHub CLI. Git for Windows will open a browser sign-in window on the next push." -ForegroundColor Cyan
        Write-Host "Sign in as the account that owns (or can write to) the repo." -ForegroundColor Cyan
        Read-Host "Press Enter to continue"
    }
}

# ---------- start ----------

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  tipind deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# -- XOR key --
if (-not $env:NEXT_PUBLIC_CATALOG_XOR_KEY) {
    foreach ($file in ".env.production", ".env") {
        $value = Get-EnvFileValue -Path (Join-Path $scriptDir $file) -Key "NEXT_PUBLIC_CATALOG_XOR_KEY"
        if ($value) {
            $env:NEXT_PUBLIC_CATALOG_XOR_KEY = $value
            Write-Host "Loaded NEXT_PUBLIC_CATALOG_XOR_KEY from $file" -ForegroundColor Gray
            break
        }
    }
}
if (-not $env:NEXT_PUBLIC_CATALOG_XOR_KEY) {
    throw "NEXT_PUBLIC_CATALOG_XOR_KEY is not set. Set it in .env, .env.production, or your shell before deploying."
}

# -- 1. Build catalog --
Write-Host "`n[1/4] Building catalog from the live sheet..." -ForegroundColor Yellow
Invoke-Native { npm run catalog:build } "Catalog build failed"

# -- Commit message from the newest catalog file --
if (-not $CommitMessage) {
    $catalogFile = Get-ChildItem -Path $scriptDir -Recurse -File -Filter "catalog.*.dat" -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch '[\\/](node_modules|\.git|\.next)[\\/]' } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if ($catalogFile) {
        $CommitMessage = "updated the catalog to $($catalogFile.Name)"
    } else {
        $CommitMessage = "updated the catalog ($(Get-Date -Format 'yyyy-MM-dd HH:mm'))"
        Write-Host "Couldn't find a catalog.*.dat file, using a generic message." -ForegroundColor Gray
    }
}
Write-Host "Commit message: $CommitMessage" -ForegroundColor Gray

# -- 2. Git setup --
Write-Host "`n[2/4] Checking git repo..." -ForegroundColor Yellow
$freshRepo = $false

if (-not (Test-Path (Join-Path $scriptDir ".git"))) {
    Write-Host "No git repo found. Setting one up." -ForegroundColor Magenta

    $repoUrl = ""
    while (-not $repoUrl) {
        $repoUrl = (Read-Host "Enter the remote repo URL to push to (e.g. https://github.com/user/tipind.git)").Trim()
    }

    $gitignore = Join-Path $scriptDir ".gitignore"
    if (-not (Test-Path $gitignore)) {
        @(
            "node_modules/"
            ".next/"
            "out/"
            ".vercel/"
            ".wrangler/"
            ".open-next/"
            "*.log"
        ) | Set-Content -Path $gitignore -Encoding UTF8
        Write-Host "Created .gitignore" -ForegroundColor Gray
    }

    Invoke-Native { git init } "git init failed"
    Invoke-Native { git checkout -B $DefaultBranch } "Couldn't create branch $DefaultBranch"
    Invoke-Native { git remote add $Remote $repoUrl } "Couldn't add remote"
    $freshRepo = $true
} else {
    $remotes = @(git remote)
    if ($remotes -notcontains $Remote) {
        $repoUrl = ""
        while (-not $repoUrl) {
            $repoUrl = (Read-Host "No remote '$Remote' set. Enter the repo URL to push to").Trim()
        }
        Invoke-Native { git remote add $Remote $repoUrl } "Couldn't add remote"
    }
}

# Identity: ask instead of failing
$gitName  = (git config user.name)
$gitEmail = (git config user.email)
if (-not $gitName) {
    $n = ""
    while (-not $n) { $n = (Read-Host "Git needs your name for commits. Enter your name").Trim() }
    git config --global user.name $n
}
if (-not $gitEmail) {
    $e = ""
    while (-not $e) { $e = (Read-Host "Enter your email (use your GitHub email or noreply address)").Trim() }
    git config --global user.email $e
}

# -- 3. Stage + commit --
Write-Host "`n[3/4] Staging and committing..." -ForegroundColor Yellow
Invoke-Native { git add -A } "git add failed"

$status = git status --porcelain
if (-not $status) {
    Write-Host "No changes to commit - skipping commit." -ForegroundColor Gray
} else {
    Invoke-Native { git commit -m $CommitMessage } "git commit failed"
}

# -- 4. Push --
$branch = git branch --show-current
if (-not $branch) {
    throw "Detached HEAD - check out a branch before deploying."
}
Write-Host "`n[4/4] Pushing branch '$branch' to '$Remote'..." -ForegroundColor Yellow

$r = Invoke-GitCapture @("push", "-u", $Remote, $branch)

# Not logged in -> walk through login, retry
if ($r.Code -ne 0 -and (Test-AuthError $r.Text)) {
    Connect-GitHub
    $r = Invoke-GitCapture @("push", "-u", $Remote, $branch)
}

# Remote has commits we don't -> merge them in (no force push), retry
if ($r.Code -ne 0 -and (Test-Rejected $r.Text)) {
    Write-Host "`nThe remote has commits you don't have locally (README, license, etc.)." -ForegroundColor Magenta
    Write-Host "Merging them in (your files win on conflicts), then pushing normally..." -ForegroundColor Gray
    $m = Invoke-GitCapture @("pull", $Remote, $branch, "--allow-unrelated-histories", "--no-rebase", "-X", "ours", "--no-edit")
    if ($m.Code -ne 0) {
        throw "Merge with the remote failed. Resolve it manually (git status), then run deploy again."
    }
    $r = Invoke-GitCapture @("push", "-u", $Remote, $branch)
}

# Still denied -> probably the wrong account is saved; offer to switch
if ($r.Code -ne 0 -and (Test-AuthError $r.Text)) {
    Write-Host "`nGitHub says you don't have permission to push to this repo." -ForegroundColor Red
    Write-Host "Most likely you're signed in as a different account than the repo owner." -ForegroundColor Gray
    $a = Read-Host "Sign out and log in again as a different account? (Y/n)"
    if ($a -notmatch '^(n|no)$') {
        Clear-GitHubCredentials
        Connect-GitHub
        $r = Invoke-GitCapture @("push", "-u", $Remote, $branch)
    }
}

if ($r.Code -ne 0) {
    Write-Host "`nPush still failed. Things to check:" -ForegroundColor Red
    Write-Host "  - The signed-in account has write access to the repo (Settings > Collaborators)." -ForegroundColor Gray
    Write-Host "  - Branch protection / rulesets on '$branch' aren't blocking direct pushes (repo Settings > Branches)." -ForegroundColor Gray
    Write-Host "  - The repo URL is correct: $(git remote get-url $Remote)" -ForegroundColor Gray
    throw "git push failed (exit code $($r.Code))"
}

Write-Host "`nDeploy complete." -ForegroundColor Green