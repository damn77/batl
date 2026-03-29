#!/usr/bin/env bash
# Check GitHub CI pipeline status for a branch
# Usage: ./scripts/check-ci.sh [--branch <branch>]

REPO="damn77/batl"
BRANCH=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch) BRANCH="$2"; shift 2 ;;
    *) BRANCH="$1"; shift ;;
  esac
done

if [[ -z "$BRANCH" ]]; then
  BRANCH=$(git branch --show-current 2>/dev/null)
  if [[ -z "$BRANCH" ]]; then
    echo "Could not determine current branch"
    exit 1
  fi
fi

# Single API call — extract all fields via --jq into tab-separated line
RESULT=$(gh run list --repo "$REPO" --branch "$BRANCH" --limit 1 \
  --json status,conclusion,name,url \
  --jq '.[0] | [.status, .conclusion, .name, .url] | @tsv' 2>/dev/null)

if [[ -z "$RESULT" ]]; then
  echo "No CI runs found for branch '$BRANCH'"
  exit 0
fi

IFS=$'\t' read -r STATUS CONCLUSION NAME URL <<< "$RESULT"

if [[ "$STATUS" == "in_progress" || "$STATUS" == "queued" ]]; then
  echo "CI is running ($NAME)... $URL"
  exit 0
fi

if [[ "$CONCLUSION" == "success" ]]; then
  echo "CI passed ($NAME) $URL"
  exit 0
fi

if [[ "$CONCLUSION" == "failure" || "$CONCLUSION" == "cancelled" ]]; then
  echo "CI FAILED ($NAME) $URL"
  exit 1
fi

echo "CI status: $STATUS/$CONCLUSION ($NAME) $URL"
exit 0
