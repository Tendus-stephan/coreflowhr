#!/usr/bin/env bash
# scripts/promote-to-prod.sh
#
# Promotes the current main branch to production.
# Run this locally after you have manually verified staging.
#
# Usage:
#   bash scripts/promote-to-prod.sh
#
# What it does:
#   1. Verifies you are on main and fully up-to-date with origin
#   2. Runs unit tests locally as a final sanity check
#   3. Walks through the pre-production checklist interactively
#   4. Fast-forward merges main into prod and pushes
#   5. The push triggers deploy-production.yml on GitHub Actions

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}=== CoreflowHR — Promote to Production ===${RESET}"
echo ""

# ── Guard: must be on main ─────────────────────────────────────
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "main" ]; then
  echo -e "${RED}Error: you must be on main to promote. Currently on: $current_branch${RESET}"
  exit 1
fi

# ── Guard: must be up-to-date with origin/main ────────────────
echo "Fetching origin..."
git fetch origin main --quiet

local_sha=$(git rev-parse HEAD)
remote_sha=$(git rev-parse origin/main)
if [ "$local_sha" != "$remote_sha" ]; then
  echo -e "${RED}Error: local main is not up-to-date with origin/main.${RESET}"
  echo "Run: git pull origin main"
  exit 1
fi

echo -e "${GREEN}✓ On main and up-to-date with origin${RESET}"
echo ""

# ── Step 1: Unit tests ─────────────────────────────────────────
echo -e "${BOLD}Step 1/3 — Running unit tests${RESET}"
if ! npm run test:run; then
  echo -e "${RED}Unit tests failed. Fix them before promoting.${RESET}"
  exit 1
fi
echo -e "${GREEN}✓ Unit tests passed${RESET}"
echo ""

# ── Step 2: Pre-production checklist ──────────────────────────
echo -e "${BOLD}Step 2/3 — Pre-production checklist${RESET}"
echo ""
echo "Before continuing, confirm each item has been done against staging"
echo -e "(${YELLOW}https://staging.coreflowhr.com${RESET}):"
echo ""

items=(
  "npm run test:e2e was run against staging and passed"
  "npm run test:visual was run against staging and passed"
  "The specific feature/fix being promoted was manually verified on staging"
  "No prod database was used during staging testing"
  "Staging Supabase project was used (not prod: lpjyxpxkagctaibmqcoi)"
)

all_confirmed=true
for item in "${items[@]}"; do
  while true; do
    read -rp "  [ ] $item  (yes/no): " answer
    case "$answer" in
      yes|y) echo -e "      ${GREEN}✓ confirmed${RESET}"; break ;;
      no|n)  echo -e "      ${RED}✗ not done — please complete this before promoting${RESET}"
             all_confirmed=false; break ;;
      *)     echo "      Please answer yes or no." ;;
    esac
  done
done

echo ""
if [ "$all_confirmed" != "true" ]; then
  echo -e "${RED}Promotion aborted — complete all checklist items first.${RESET}"
  exit 1
fi

echo -e "${GREEN}✓ All checklist items confirmed${RESET}"
echo ""

# ── Step 3: Merge main → prod and push ────────────────────────
echo -e "${BOLD}Step 3/3 — Merging main → prod${RESET}"
echo ""
echo "This will push to the prod branch, which triggers the production"
echo "GitHub Actions deployment (deploy-production.yml)."
echo ""
read -rp "Proceed? (yes/no): " final_confirm
if [ "$final_confirm" != "yes" ]; then
  echo "Promotion cancelled."
  exit 0
fi

# Create prod branch if it doesn't exist locally, then fast-forward to main
if git show-ref --verify --quiet refs/heads/prod; then
  git checkout prod
  git merge main --ff-only
else
  git checkout -b prod
fi

git push origin prod

git checkout main
echo ""
echo -e "${GREEN}${BOLD}✓ Pushed to prod branch.${RESET}"
echo -e "  GitHub Actions will now run tests and deploy to ${BOLD}coreflowhr.com${RESET}."
echo -e "  Monitor: https://github.com/Tendus-stephan/coreflowhr/actions"
echo ""
