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

step "Typecheck"
npm run typecheck

step "Lint"
npm run lint

step "Build"
npm run build

step "Verify export"
npm run verify

printf '\n\033[32m✓ all checks passed\033[0m\n'
