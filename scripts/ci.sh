#!/usr/bin/env bash
# Verification gate. Run this before you deploy, or wire it into any CI.
#
#   ./scripts/ci.sh
#
# It is exactly what .github/workflows/ci.yml would run (see README →
# "Continuous integration"), minus the deploy step. Everything here is
# reproducible on a laptop, so a green run locally means a green run in CI.
set -euo pipefail

cd "$(dirname "$0")/.."

step() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }

# The repo declares bun; npm still works. Pick whichever is installed.
if command -v bun >/dev/null 2>&1; then RUN="bun run"; else RUN="npm run"; fi

step "Typecheck"
$RUN typecheck

step "Lint"
$RUN lint

step "Build"
$RUN build

step "Verify export"
$RUN verify

step "Content and config audit"
node scripts/content-audit.mjs

step "Security checks"
node scripts/security-check.mjs

printf '\n\033[32m✓ all checks passed\033[0m\n'
