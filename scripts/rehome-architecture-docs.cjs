#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();

function repoPath(...parts) {
  return path.join(repoRoot, ...parts);
}

const prefixMoves = [
  ['docs/architecture/subsystems/', 'docs/architecture/system/subsystems/'],
  ['docs/architecture/frontend/appshell/', 'docs/architecture/components/web/appshell/'],
  ['docs/architecture/frontend/artifacts/', 'docs/architecture/components/web/artifacts/'],
  ['docs/architecture/frontend/git/', 'docs/architecture/components/web/git/'],
  ['docs/architecture/frontend/graph/', 'docs/architecture/components/web/graph/'],
  ['docs/architecture/frontend/inspector/', 'docs/architecture/components/web/inspector/'],
  ['docs/architecture/frontend/lineage/', 'docs/architecture/components/web/lineage/'],
  ['docs/architecture/frontend/observability/', 'docs/architecture/components/web/observability/'],
  ['docs/architecture/frontend/planning/', 'docs/architecture/components/web/planning/'],
  ['docs/architecture/frontend/runs/', 'docs/architecture/components/web/runs/'],
  ['docs/architecture/frontend/views/', 'docs/architecture/components/web/views/'],
  ['docs/architecture/frontend/workspace/', 'docs/architecture/components/web/workspace/'],
  ['docs/architecture/engine/adapters/', 'docs/architecture/components/engine/adapters/'],
  ['docs/architecture/engine/contracts/', 'docs/architecture/components/engine/contracts/'],
  ['docs/architecture/engine/dev/', 'docs/architecture/components/engine/dev/'],
  ['docs/architecture/engine/ops/', 'docs/architecture/components/engine/ops/'],
  ['docs/architecture/engine/roadmap/', 'docs/architecture/components/engine/roadmap/'],
  ['docs/architecture/engine/schemas/', 'docs/architecture/components/engine/schemas/'],
  ['docs/architecture/engine/security/', 'docs/architecture/components/engine/security/'],
];

const fileMoves = [
  ['docs/architecture/frontend/index.md', 'docs/archive/architecture/frontend/index.md'],
  ['docs/architecture/frontend/astproposal.md', 'docs/architecture/components/web/astproposal.md'],
  [
    'docs/architecture/frontend/dvt-frontend-architecture-introduction.md',
    'docs/architecture/components/web/dvt-frontend-architecture-introduction.md',
  ],
  [
    'docs/architecture/frontend/dvt_frontend_architecture_blueprint.md',
    'docs/architecture/components/web/dvt_frontend_architecture_blueprint.md',
  ],
  [
    'docs/architecture/frontend/f04-frontend-data-boundary-technical-manual-20260404.md',
    'docs/architecture/components/web/f04-frontend-data-boundary-technical-manual-20260404.md',
  ],
  [
    'docs/architecture/frontend/frontend-backend-contract-mvp-e1-20260404.md',
    'docs/architecture/components/web/frontend-backend-contract-mvp-e1-20260404.md',
  ],
  [
    'docs/architecture/frontend/frontend-data-boundary-architecture.md',
    'docs/architecture/components/web/frontend-data-boundary-architecture.md',
  ],
  [
    'docs/architecture/frontend/frontend-fowler-implementation-pattern.md',
    'docs/architecture/components/web/frontend-fowler-implementation-pattern.md',
  ],
  [
    'docs/architecture/frontend/frontend-runtime-modes-user-manual.md',
    'docs/architecture/components/web/frontend-runtime-modes-user-manual.md',
  ],
  [
    'docs/architecture/frontend/iconography-and-design-tokens-contract.md',
    'docs/architecture/components/web/iconography-and-design-tokens-contract.md',
  ],
  [
    'docs/architecture/frontend/library-and-open-source-reference-stack.md',
    'docs/architecture/components/web/library-and-open-source-reference-stack.md',
  ],
  [
    'docs/architecture/frontend/main-workspace-views-and-ux.md',
    'docs/architecture/components/web/main-workspace-views-and-ux.md',
  ],
  [
    'docs/architecture/frontend/screen-layout-and-cross-surface-behavior-rules.md',
    'docs/architecture/components/web/screen-layout-and-cross-surface-behavior-rules.md',
  ],
  [
    'docs/architecture/frontend/screen-manuals-and-user-stories.md',
    'docs/architecture/components/web/screen-manuals-and-user-stories.md',
  ],
  [
    'docs/architecture/frontend/top-app-bar-component-technical-manual-20260404.md',
    'docs/architecture/components/web/top-app-bar-component-technical-manual-20260404.md',
  ],
  [
    'docs/architecture/frontend/ux-implementation-guide.md',
    'docs/architecture/components/web/ux-implementation-guide.md',
  ],
  [
    'docs/architecture/frontend/workbench-ui-contract-and-component-inventory.md',
    'docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md',
  ],
  ['docs/architecture/engine/index.md', 'docs/archive/architecture/engine/index.md'],
  ['docs/architecture/engine/audit.md', 'docs/architecture/components/engine/audit.md'],
  ['docs/architecture/engine/c4-engine.md', 'docs/architecture/components/engine/c4-engine.md'],
  [
    'docs/architecture/engine/engine-class-review-and-gaps-2026-03-31.md',
    'docs/architecture/components/engine/engine-class-review-and-gaps-2026-03-31.md',
  ],
  [
    'docs/architecture/engine/metrics-catalog.md',
    'docs/architecture/components/engine/metrics-catalog.md',
  ],
  [
    'docs/architecture/engine/refactor-listStaleSnapshotRunsSql.md',
    'docs/architecture/components/engine/refactor-listStaleSnapshotRunsSql.md',
  ],
  ['docs/architecture/engine/VERSIONING.md', 'docs/architecture/components/engine/VERSIONING.md'],
  [
    'docs/architecture/engine/workflow-engine-subsystem-context.md',
    'docs/architecture/components/engine/workflow-engine-subsystem-context.md',
  ],
  [
    'docs/architecture/engine/workflow-engine-target-architecture.v1.md',
    'docs/architecture/components/engine/workflow-engine-target-architecture.v1.md',
  ],
];

const redirectMap = new Map(
  [
    ['docs/architecture/frontend/index.md', 'docs/architecture/components/web/index.md'],
    ['docs/architecture/engine/index.md', 'docs/architecture/components/engine/index.md'],
  ].map(([from, to]) => [normalize(from), normalize(to)])
);

const sourceRootsToRemove = [
  repoPath('docs', 'architecture', 'frontend'),
  repoPath('docs', 'architecture', 'engine'),
  repoPath('docs', 'architecture', 'subsystems'),
];

function normalize(relPath) {
  return relPath.replace(/\\/g, '/');
}

function exists(relPath) {
  return fs.existsSync(repoPath(...relPath.split('/')));
}

function ensureDirForFile(absFilePath) {
  fs.mkdirSync(path.dirname(absFilePath), { recursive: true });
}

function getAllFiles(absDir) {
  if (!fs.existsSync(absDir)) {
    return [];
  }
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absEntry = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(absEntry));
    } else {
      files.push(absEntry);
    }
  }
  return files;
}

const moveMap = new Map();
const movedMarkdownOldByNew = new Map();

for (const [from, to] of fileMoves) {
  if (!exists(from)) {
    continue;
  }
  moveMap.set(normalize(from), normalize(to));
}

for (const [fromPrefix, toPrefix] of prefixMoves) {
  const absFromPrefix = repoPath(...fromPrefix.split('/'));
  for (const absFile of getAllFiles(absFromPrefix)) {
    const relFile = normalize(path.relative(repoRoot, absFile));
    const relTarget = normalize(
      path.join(toPrefix, normalize(path.relative(absFromPrefix, absFile)))
    );
    moveMap.set(relFile, relTarget);
  }
}

function remapResolvedAbs(absPath) {
  const rel = normalize(path.relative(repoRoot, absPath));
  const redirected = redirectMap.get(rel);
  if (redirected) {
    return repoPath(...redirected.split('/'));
  }

  for (const [from, to] of moveMap.entries()) {
    if (rel === from) {
      return repoPath(...to.split('/'));
    }
    if (rel.startsWith(`${from}/`)) {
      const suffix = rel.slice(from.length + 1);
      return repoPath(...normalize(path.join(to, suffix)).split('/'));
    }
  }

  return absPath;
}

for (const [from, to] of moveMap.entries()) {
  const absFrom = repoPath(...from.split('/'));
  const absTo = repoPath(...to.split('/'));
  ensureDirForFile(absTo);
  fs.renameSync(absFrom, absTo);
  if (absTo.endsWith('.md')) {
    movedMarkdownOldByNew.set(absTo, absFrom);
  }
}

for (const root of sourceRootsToRemove) {
  if (fs.existsSync(root)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function isExternalTarget(target) {
  return (
    target.startsWith('http://') ||
    target.startsWith('https://') ||
    target.startsWith('mailto:') ||
    target.startsWith('tel:') ||
    target.startsWith('#') ||
    target.startsWith('data:')
  );
}

function normalizeRelativeLink(relPath) {
  let out = normalize(relPath);
  if (!out.startsWith('.') && !out.startsWith('/')) {
    out = `./${out}`;
  }
  return out;
}

function rewriteMarkdownFile(absFilePath) {
  const oldAbsPath = movedMarkdownOldByNew.get(absFilePath) ?? absFilePath;
  const original = fs.readFileSync(absFilePath, 'utf8');
  const updated = original.replace(
    /(!?\[[^\]]*]\()([^)]+)(\))/g,
    (_m, prefix, rawTarget, suffix) => {
      const trimmedTarget = rawTarget.trim();
      const spaceIndex = trimmedTarget.search(/\s+"/);
      const targetCore = spaceIndex >= 0 ? trimmedTarget.slice(0, spaceIndex) : trimmedTarget;
      const titleSuffix = spaceIndex >= 0 ? trimmedTarget.slice(spaceIndex) : '';

      if (isExternalTarget(targetCore)) {
        return `${prefix}${rawTarget}${suffix}`;
      }

      const [bareTarget, hash = ''] = targetCore.split('#');
      const resolvedOld = path.resolve(path.dirname(oldAbsPath), bareTarget);
      const resolvedNew = remapResolvedAbs(resolvedOld);
      const relative = normalizeRelativeLink(path.relative(path.dirname(absFilePath), resolvedNew));
      const rebuilt = `${relative}${hash ? `#${hash}` : ''}${titleSuffix}`;
      return `${prefix}${rebuilt}${suffix}`;
    }
  );

  if (updated !== original) {
    fs.writeFileSync(absFilePath, updated);
  }
}

for (const absMd of getAllFiles(repoPath('docs')).filter((file) => file.endsWith('.md'))) {
  rewriteMarkdownFile(absMd);
}

console.log(`[rehome-architecture-docs] Moved ${moveMap.size} files and rewrote markdown links.`);
