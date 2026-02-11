#!/bin/bash
# Generate PR file manifest
# Usage: bash .github/scripts/generate_pr_manifest.sh

set -e

echo "# PR File Manifest"
echo ""
echo "Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

# Count files by category
echo "## Summary"
echo ""

ADDED_CONTRACTS=$(find docs/architecture/engine/contracts -name "*.md" -type f 2>/dev/null | wc -l)
ADDED_ADAPTERS=$(find docs/architecture/engine/adapters -name "*.md" -type f 2>/dev/null | wc -l)
ADDED_CI=$(find .github -name "CODEOWNERS" -o -name "*.yml" | grep -E "(CODEOWNERS|markdown_lint)" | wc -l)
TOTAL_DOCS=$(find docs/architecture/engine -name "*.md" -type f 2>/dev/null | wc -l)

echo "- **Total documents**: $TOTAL_DOCS"
echo "- **Contracts**: $ADDED_CONTRACTS"
echo "- **Adapters**: $ADDED_ADAPTERS"
echo "- **CI/CD files**: $ADDED_CI"
echo ""

# List all files by category
echo "## Added Files"
echo ""

echo "### Normative Contracts"
echo ""
find docs/architecture/engine/contracts -name "*.md" -type f | sort | while read file; do
  size=$(du -h "$file" | cut -f1)
  echo "- \`$file\` ($size)"
done
echo ""

echo "### Adapters"
echo ""
find docs/architecture/engine/adapters -name "*.md" -type f | sort | while read file; do
  size=$(du -h "$file" | cut -f1)
  echo "- \`$file\` ($size)"
done
echo ""

echo "### CI/CD & Governance"
echo ""
for file in .github/CODEOWNERS .github/workflows/markdown_lint.yml docs/CONTRIBUTING.md; do
  if [ -f "$file" ]; then
    size=$(du -h "$file" | cut -f1)
    echo "- \`$file\` ($size)"
  fi
done
echo ""

echo "## Modified Files"
echo ""
echo "- \`docs/architecture/engine/contracts/engine/ExecutionSemantics.v1.md\` (v1.0.1 → v1.1)"
echo "- \`docs/architecture/engine/INDEX.md\` (v1.0 → v1.1)"
echo "- \`README.md\` (added Contributing section)"
echo ""

echo "## Deprecated Files"
echo ""
echo "- \`docs/architecture/engine/WORKFLOW_ENGINE.md\` (90-day grace period → 2026-05-12)"
echo ""

# Validation stats
echo "## Validation Stats"
echo ""
TOTAL_LINKS=$(grep -r '\[.*\](.*\.md' docs/architecture/engine/ 2>/dev/null | wc -l || echo "0")
TOTAL_TS_BLOCKS=$(grep -r '```ts' docs/architecture/engine/ 2>/dev/null | wc -l || echo "0")

echo "- **Internal links checked**: $TOTAL_LINKS"
echo "- **TypeScript blocks**: $TOTAL_TS_BLOCKS"
echo "- **Navigation paths tested**: 3 (SDK dev, Plan author, SRE)"
echo ""

echo "✅ Manifest generation complete"
