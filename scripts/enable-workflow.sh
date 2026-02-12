#!/bin/bash
#
# Workflow Isolation Testing Helper
#
# Usage:
#   bash scripts/enable-workflow.sh test.yml
#   bash scripts/enable-workflow.sh contracts.yml
#   bash scripts/enable-workflow.sh golden-paths.yml
#

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: bash scripts/enable-workflow.sh <workflow-name>"
  echo ""
  echo "Available workflows:"
  echo "  - test.yml"
  echo "  - contracts.yml"
  echo "  - golden-paths.yml"
  exit 1
fi

WORKFLOW="$1"
WORKFLOW_PATH=".github/workflows/$WORKFLOW"

if [ ! -f "$WORKFLOW_PATH" ]; then
  echo "❌ Workflow not found: $WORKFLOW_PATH"
  exit 1
fi

echo "📋 Enabling pull_request trigger in $WORKFLOW..."

# Uncomment pull_request trigger
sed -i 's/^  # pull_request:/  pull_request:/g' "$WORKFLOW_PATH"

if grep -q "^  pull_request:" "$WORKFLOW_PATH"; then
  echo "✅ pull_request trigger enabled"

  echo ""
  echo "📝 Committing changes..."
  git add "$WORKFLOW_PATH"
  git commit -m "test(ci): Enable $WORKFLOW for isolated verification"

  echo ""
  echo "🚀 Pushing to remote..."
  git push

  echo ""
  echo "✅ Done! Monitor GitHub Actions:"
  echo "   https://github.com/dunay2/dvt/actions"
  echo ""
  echo "Next workflow to enable:"
  if [ "$WORKFLOW" = "test.yml" ]; then
    echo "   bash scripts/enable-workflow.sh contracts.yml"
  elif [ "$WORKFLOW" = "contracts.yml" ]; then
    echo "   bash scripts/enable-workflow.sh golden-paths.yml"
  fi
else
  echo "❌ Failed to enable pull_request trigger"
  exit 1
fi
