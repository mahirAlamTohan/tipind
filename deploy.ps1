#!/usr/bin/env pwsh
# deploy.ps1 — One-command deploy for tipind
#
#   1. Rebuilds the catalog from the live Google Sheet (via Apps Script)
#   2. Stages all changes (catalog artifact, source snapshot, .env.production)
#   3. Commits with the supplied message
#   4. Pushes to the current branch on origin
#
# Usage:
#   ./deploy.ps1 "Rebuild catalog — 2 July 2026"
#
# Requirements:
#   - NEXT_PUBLIC_CATALOG_XOR_KEY must be set (in .env or the shell env)
#     for the catalog build to work. It is also read from .env.production
#     automatically if present.

param(
    [Parameter(Mandatory = $true)]
    [string]$CommitMessage,

    [string]$Remote = "origin"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptDir

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  tipind deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# ── Ensure the XOR key is available to the catalog build ──
if (-not $env:NEXT_PUBLIC_CATALOG_XOR_KEY) {
    $envFile = Join-Path $scriptDir ".env.production"
    if (Test-Path $envFile) {
        $line = Select-String -Path $envFile -Pattern "^NEXT_PUBLIC_CATALOG_XOR_KEY=" | Select-Object -First 1
        if ($line) {
            $env:NEXT_PUBLIC_CATALOG_XOR_KEY = ($line.Line -split "=", 2)[1].Trim().Trim('"')
            Write-Host "Loaded NEXT_PUBLIC_CATALOG_XOR_KEY from .env.production" -ForegroundColor Gray
        }
    }
}
if (-not $env:NEXT_PUBLIC_CATALOG_XOR_KEY) {
    Write-Error "NEXT_PUBLIC_CATALOG_XOR_KEY is not set. Set it in .env or your shell before deploying."
}

# ── 1. Rebuild the catalog from the live sheet ──
Write-Host "`n[1/4] Building catalog from the live sheet..." -ForegroundColor Yellow
npm run catalog:build

# ── 2. Stage all changes ──
Write-Host "`n[2/4] Staging changes..." -ForegroundColor Yellow
git add -A

# ── 3. Commit (skip gracefully if nothing changed) ──
Write-Host "`n[3/4] Committing..." -ForegroundColor Yellow
$status = git status --porcelain
if (-not $status) {
    Write-Host "No changes to commit — skipping commit." -ForegroundColor Gray
} else {
    git commit -m $CommitMessage
}

# ── 4. Push ──
$branch = git branch --show-current
Write-Host "`n[4/4] Pushing branch '$branch' to '$Remote'..." -ForegroundColor Yellow
git push $Remote $branch

Write-Host "`nDeploy complete." -ForegroundColor Green
