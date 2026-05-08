#!/usr/bin/env node
/**
 * Generate and check the governance document-to-unit map.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const yaml = require('js-yaml');
const { findOwnerMatches, readManifest } = require('./check-governance-unit-coverage.cjs');
const {
  generatedStatusDir,
  governanceGeneratedPath,
  repoRoot,
  toPosix,
  unitManifestPath,
} = require('./governance-generated-paths.cjs');

const statusDir = generatedStatusDir;
const defaultManifestPath = unitManifestPath;
const outputYamlPath = governanceGeneratedPath('system-governance-document-unit-map.docs.yaml');
const outputMarkdownPath = governanceGeneratedPath(
  'system-governance-document-unit-map-20260501.md'
);

function getTrackedDocs() {
  const output = execFileSync('git', ['ls-files', 'docs'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const trackedDocs = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.endsWith('.md'))
    .map(toPosix)
    .sort();

  return trackedDocs.sort();
}

function classifyDocument(filePath) {
  const normalized = toPosix(filePath).toLowerCase();

  if (
    normalized === 'docs/contributing.md' ||
    normalized === 'docs/docs_readme.md' ||
    normalized === 'docs/index.md'
  ) {
    return 'governs unit';
  }

  if (normalized === 'docs/spanish_texts.md') {
    return 'describes unit';
  }

  if (normalized.includes('/archive/') || normalized.includes('/_archive/')) {
    return 'historical/reference only';
  }

  if (normalized.startsWith('docs/evidence/')) {
    return 'proves evidence';
  }

  if (normalized.startsWith('docs/risk-register/')) {
    return 'tracks risk';
  }

  if (
    normalized.startsWith('docs/adr/') ||
    normalized.startsWith('docs/contracts/') ||
    normalized.includes('/contracts/') ||
    normalized.includes('contract')
  ) {
    return 'governs unit';
  }

  if (
    normalized.startsWith('docs/planning/reviews/') ||
    normalized.startsWith('docs/reviews/') ||
    normalized.startsWith('docs/planning/gaps/') ||
    normalized.includes('drift') ||
    normalized.includes('closeout')
  ) {
    return 'tracks drift';
  }

  if (
    normalized.startsWith('docs/architecture/') ||
    normalized.startsWith('docs/concepts/') ||
    normalized.startsWith('docs/planning/domains/') ||
    normalized.startsWith('docs/planning/execution-model/') ||
    normalized.startsWith('docs/planning/proposals/') ||
    normalized.startsWith('docs/planning/proposals/mandatory/') ||
    normalized.startsWith('docs/planning/roadmap/') ||
    normalized.startsWith('docs/planning/templates/') ||
    normalized.includes('governance') ||
    normalized.includes('policy')
  ) {
    return 'governs unit';
  }

  if (
    normalized.startsWith('docs/runbooks/') ||
    normalized.startsWith('docs/guides/') ||
    normalized.startsWith('docs/planning/state/') ||
    normalized.startsWith('docs/planning/status/')
  ) {
    return 'describes unit';
  }

  return 'needs disposition';
}

function resolveSubjectUnit(filePath) {
  const normalized = toPosix(filePath).toLowerCase();

  const matchesPattern = (pattern) => {
    if (pattern.length <= 3) {
      return new RegExp(`(^|[\\/._-])${pattern}($|[\\/._-])`).test(normalized);
    }

    return normalized.includes(pattern);
  };

  const rules = [
    {
      unit: 'SYS-PLANSTORE',
      patterns: ['plan-store', 'planstore', 'planref', 'postgres-plan-store', 's08'],
    },
    {
      unit: 'SYS-WEB',
      patterns: ['frontend', 'web', 'ux', 'ui', 'cypress', 'admin-view', 'top-app-bar'],
    },
    {
      unit: 'SYS-API',
      patterns: ['api', 'backend-mvp-control-plane', 'control-plane'],
    },
    {
      unit: 'SYS-WORKERS',
      patterns: ['temporal-worker', 'outbox-worker', 'projector-worker', 'lineage-worker'],
    },
    {
      unit: 'SYS-ADAPTERS',
      patterns: ['adapter', 'temporal', 'postgres-proof', 'adapter-postgres', 'adapter-temporal'],
    },
    {
      unit: 'SYS-OBSERVABILITY',
      patterns: ['observability', 'otel', 'sla', 'metrics', 'dashboard', 'ar-c2'],
    },
    {
      unit: 'SYS-TRACEABILITY',
      patterns: ['traceability', 'lineage', 'adr-0000', 'knowledge-graph'],
    },
    {
      unit: 'SYS-CONTRACTS',
      patterns: ['contract', 'schema', 'versioning', 'rfc2119'],
    },
    {
      unit: 'SYS-PLANNER',
      patterns: ['planner', 'plan-compile', 'cycle-detection', 'planner-contracts'],
    },
    {
      unit: 'SYS-RUNTIME',
      patterns: [
        'engine',
        'runtime',
        'execution-model',
        'run-event',
        'state-store',
        'delivery',
        'event-sourcing',
      ],
    },
    {
      unit: 'SYS-CI-GOVERNANCE',
      patterns: ['ci', 'preflight', 'release', 'github', 'workflow', 'check'],
    },
    {
      unit: 'SYS-DOCS-GOVERNANCE',
      patterns: [
        'docs/',
        'doc',
        'governance',
        'planning',
        'adr',
        'risk-register',
        'evidence',
        'runbooks',
        'guides',
      ],
    },
  ];

  for (const rule of rules) {
    if (rule.patterns.some(matchesPattern)) {
      return rule.unit;
    }
  }

  return 'SYS-DOCS-GOVERNANCE';
}

function buildDocumentEntries(files, units) {
  return files.map((filePath) => {
    const ownerMatches = findOwnerMatches(filePath, units);
    return {
      path: filePath,
      classification: classifyDocument(filePath),
      documentOwnerUnit: ownerMatches[0]?.id || 'UNOWNED',
      subjectUnit: resolveSubjectUnit(filePath),
    };
  });
}

function countBy(entries, key) {
  const counts = new Map();
  for (const entry of entries) {
    counts.set(entry[key], (counts.get(entry[key]) || 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, count]) => ({ name, count }));
}

function renderYaml(entries) {
  return yaml.dump(
    {
      version: 1,
      generatedFrom: 'git ls-files docs',
      unitManifest: 'docs/planning/status/system-governance-unit-index.units.yaml',
      documentCount: entries.length,
      documents: entries,
    },
    {
      lineWidth: 100,
      noRefs: true,
      sortKeys: false,
    }
  );
}

function renderMarkdown(entries) {
  const classificationCounts = countBy(entries, 'classification');
  const unitCounts = countBy(entries, 'subjectUnit');

  const renderCountList = (counts) =>
    counts.map((item) => `- \`${item.name}\`: ${item.count}`).join('\n');

  return `---
title: System Governance Document Unit Map
status: Review
owner: Architecture / Docs / Delivery
last_reviewed: 2026-05-01
planning_type: status
---

# System Governance Document Unit Map

> This page is auto-generated by \`pnpm docs:governance:document-unit-map\`. Do not edit manually.

## Purpose

This map indexes every tracked Markdown document under \`docs/**\` and attaches
it to the system governance unit model. The extensive per-document inventory is
machine-readable:

- [system-governance-document-unit-map.docs.yaml](./system-governance-document-unit-map.docs.yaml)

This document is the navigation and rationale surface. The YAML file is the
complete index and must contain one entry per tracked document.

## Governing Sources

- \`AGENTS.md\`
- \`docs/planning/status/governance-document-rule-inventory.md\`
- \`docs/guides/ai-work-protocol.md\`
- \`docs/architecture/reference-architecture.md\`
- \`docs/architecture/command-query-rail-governance.md\`
- \`docs/architecture/fowler-opportunity-planning-governance.md\`
- \`docs/planning/status/system-governance-unit-taxonomy-20260501.md\`
- \`docs/planning/status/system-governance-unit-index-20260501.md\`

## Model

Each document entry records:

- \`path\`: tracked Markdown document path.
- \`classification\`: how the document participates in governance.
- \`documentOwnerUnit\`: the component/source unit that owns the file itself.
- \`subjectUnit\`: the system unit primarily governed, described, tracked, or
  evidenced by the document.

The split between \`documentOwnerUnit\` and \`subjectUnit\` is intentional.
Documentation files are operationally owned by docs governance, while their
subject may be runtime, plan-store, web, contracts, adapters, or another system
unit.

## Counts

- Documents indexed: ${entries.length}

### By Classification

${renderCountList(classificationCounts)}

### By Subject Unit

${renderCountList(unitCounts)}

## Diagram

\`\`\`mermaid
flowchart LR
  Doc["tracked docs/**/*.md"]
  Classification["classification"]
  Owner["documentOwnerUnit"]
  Subject["subjectUnit"]
  UnitIndex["system governance unit index"]

  Doc --> Classification
  Doc --> Owner
  Doc --> Subject
  Owner --> UnitIndex
  Subject --> UnitIndex
\`\`\`

## Mechanical Rule

Run:

\`\`\`bash
pnpm docs:governance:document-unit-map:check
\`\`\`

The check regenerates both outputs and fails if the committed map is stale.
Every new tracked Markdown document under \`docs/**\` must therefore appear in
the YAML index before the docs governance gate can pass.

## Related Surfaces

- [System Governance File Index](./system-governance-file-index-20260501.md)
- [System Governance Component Index](./system-governance-component-index-20260501.md)
- [System Governance Unit Index](./system-governance-unit-index-20260501.md)
- [System Governance Unit Taxonomy](./system-governance-unit-taxonomy-20260501.md)
`;
}

function writeIfChanged(filePath, next) {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  if (current === next) {
    return false;
  }
  fs.writeFileSync(filePath, next, 'utf8');
  return true;
}

function buildOutputs(manifestPath = defaultManifestPath) {
  const manifest = readManifest(manifestPath);
  const units = Array.isArray(manifest.units) ? manifest.units : [];
  const entries = buildDocumentEntries(getTrackedDocs(), units);
  const documentMap = {
    version: 1,
    generatedFrom: 'git ls-files docs',
    unitManifest: 'docs/planning/status/system-governance-unit-index.units.yaml',
    documentCount: entries.length,
    documents: entries,
  };
  return {
    entries,
    documentMap,
    yaml: renderYaml(entries),
    markdown: renderMarkdown(entries),
  };
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const outputs = buildOutputs();
  fs.mkdirSync(statusDir, { recursive: true });
  const wroteYaml = writeIfChanged(outputYamlPath, outputs.yaml);
  const wroteMarkdown = writeIfChanged(outputMarkdownPath, outputs.markdown);

  if (checkOnly && (wroteYaml || wroteMarkdown)) {
    console.error('[docs:governance:document-unit-map] FAILED');
    console.error('Document unit map was stale. Regenerate and commit the outputs.');
    process.exitCode = 1;
    return;
  }

  console.log(`[docs:governance:document-unit-map] indexed ${outputs.entries.length} documents`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildDocumentEntries,
  buildOutputs,
  classifyDocument,
  resolveSubjectUnit,
  renderMarkdown,
  renderYaml,
};
