#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const { resolveGeneratedDate } = require('./generated-doc-date.cjs');
const { schemaName } = require('./planning-db-migrate.cjs');
const { defaultPgUrl } = require('./planning-db-run.cjs');

const repoRoot = path.resolve(__dirname, '..');
const packagesRoot = path.join(repoRoot, 'packages');
const appsRoot = path.join(repoRoot, 'apps');
const codeStateOutputPath = path.join(
  repoRoot,
  '.generated-docs',
  'planning',
  'status',
  'generated-code-state.md'
);
const repositoryMapOutputPath = path.join(repoRoot, 'docs', 'concepts', 'repository-map.md');

const GENERATION_MODES = Object.freeze({
  all: 'all',
  codeStateOnly: 'code-state-only',
  repositoryMapOnly: 'repository-map-only',
});

function toPosix(value) {
  return value.replace(/\\/gu, '/');
}

function relFromRepo(abs) {
  return toPosix(path.relative(repoRoot, abs));
}

function normalizeRepoPath(value) {
  return toPosix(String(value ?? ''))
    .replace(/^\.\//u, '')
    .replace(/\/$/u, '')
    .trim();
}

function walk(dir, predicate) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'site') continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(abs, predicate));
      continue;
    }
    if (!predicate || predicate(abs, entry.name)) out.push(abs);
  }
  return out;
}

function safeReadJson(absPath) {
  if (!fs.existsSync(absPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch {
    return null;
  }
}

function isSourceCodeFile(name) {
  return /\.(ts|tsx|js|jsx|json)$/u.test(name);
}

function isColocatedTestFile(name) {
  return /\.(test|spec)\.(ts|tsx|js|jsx)$/u.test(name);
}

function markdownCell(value) {
  return String(value ?? '-')
    .replace(/\\/gu, '\\\\')
    .replace(/\r\n|\r|\n/gu, '<br>')
    .replace(/\|/gu, '\\|')
    .trim();
}

function markdownTable(headers, rows) {
  const normalizedRows = rows.map((row) => row.map(markdownCell));
  const normalizedHeaders = headers.map(markdownCell);
  const widths = normalizedHeaders.map((header, index) =>
    Math.max(header.length, ...normalizedRows.map((row) => String(row[index] ?? '').length))
  );
  const row = (cells) =>
    `| ${cells.map((cell, index) => String(cell ?? '').padEnd(widths[index], ' ')).join(' | ')} |`;
  const separator = `| ${widths.map((width) => '-'.repeat(Math.max(3, width))).join(' | ')} |`;
  return [row(normalizedHeaders), separator, ...normalizedRows.map((cells) => row(cells))];
}

function collectWorkspaceDirs(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const direct = fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(rootDir, entry.name));

  const out = [];
  for (const dir of direct) {
    const pkg = path.join(dir, 'package.json');
    if (fs.existsSync(pkg)) {
      out.push(dir);
      continue;
    }
    const nested = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(dir, entry.name))
      .filter((child) => fs.existsSync(path.join(child, 'package.json')));
    out.push(...nested);
  }

  return out.sort((left, right) => relFromRepo(left).localeCompare(relFromRepo(right), 'en'));
}

function collectWorkspaceStats(dir) {
  const pkgPath = path.join(dir, 'package.json');
  const pkg = safeReadJson(pkgPath) || {};
  const scripts = pkg.scripts || {};

  const srcDir = path.join(dir, 'src');
  const testDir = path.join(dir, 'test');
  const srcFiles = fs.existsSync(srcDir)
    ? walk(srcDir, (_, name) => isSourceCodeFile(name) && !isColocatedTestFile(name))
    : [];
  const colocatedTestFiles = fs.existsSync(srcDir)
    ? walk(srcDir, (_, name) => isColocatedTestFile(name))
    : [];
  const testFiles = [
    ...(fs.existsSync(testDir)
      ? walk(testDir, (_, name) => /\.(ts|tsx|js|jsx)$/u.test(name))
      : []),
    ...colocatedTestFiles,
  ];

  const exportedSymbols = (() => {
    const indexTs = path.join(dir, 'src', 'index.ts');
    if (!fs.existsSync(indexTs)) return '-';
    const content = fs.readFileSync(indexTs, 'utf8');
    const exportLines = content
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('export ')).length;
    return String(exportLines);
  })();

  const workspacePath = relFromRepo(dir);
  return {
    workspace: pkg.name || workspacePath,
    path: workspacePath,
    kind: workspacePath.startsWith('apps/') ? 'app' : 'package',
    src: srcFiles.length,
    tests: testFiles.length,
    hasBuild: scripts.build ? 'yes' : 'no',
    hasTest: scripts.test ? 'yes' : 'no',
    hasTypecheck: scripts.typecheck || scripts['type-check'] ? 'yes' : 'no',
    exports: exportedSymbols,
  };
}

function collectRepositoryWorkspaceStats() {
  const workspaceDirs = [
    ...collectWorkspaceDirs(packagesRoot),
    ...collectWorkspaceDirs(appsRoot),
  ].sort((left, right) => relFromRepo(left).localeCompare(relFromRepo(right), 'en'));
  return workspaceDirs.map(collectWorkspaceStats);
}

function renderCodeState(workspaces, utcDate) {
  const totalSrc = workspaces.reduce((acc, workspace) => acc + workspace.src, 0);
  const totalTests = workspaces.reduce((acc, workspace) => acc + workspace.tests, 0);
  const withBuild = workspaces.filter((workspace) => workspace.hasBuild === 'yes').length;
  const withTest = workspaces.filter((workspace) => workspace.hasTest === 'yes').length;

  const summaryRows = [
    ['Total workspaces', String(workspaces.length)],
    ['Total source files', String(totalSrc)],
    ['Total test files', String(totalTests)],
    ['Workspaces with build script', `${withBuild}/${workspaces.length}`],
    ['Workspaces with test script', `${withTest}/${workspaces.length}`],
  ];

  const workspaceRows = workspaces.map((workspace) => [
    workspace.workspace,
    `\`${workspace.path}\``,
    String(workspace.src),
    String(workspace.tests),
    workspace.hasBuild,
    workspace.hasTest,
    workspace.hasTypecheck,
    workspace.exports,
  ]);

  return [
    '---',
    'title: Generated Code State',
    'status: Active',
    'owner: docs',
    `last_reviewed: ${utcDate}`,
    'planning_type: status',
    '---',
    '',
    '# Generated Code State',
    '',
    `Generated automatically from repository code on ${utcDate}.`,
    '',
    '## Summary',
    '',
    ...markdownTable(['Metric', 'Value'], summaryRows),
    '',
    '## Workspace Matrix',
    '',
    ...markdownTable(
      [
        'Workspace',
        'Path',
        'Src Files',
        'Test Files',
        'Build',
        'Test',
        'Typecheck',
        'Exports in src/index.ts',
      ],
      workspaceRows
    ),
    '',
    '> This page is auto-generated by `pnpm docs:status:generate`. Do not edit manually.',
    '',
  ].join('\n');
}

function databaseUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

async function readRepositoryArchitectureFacts(client) {
  const [componentResult, documentationResult] = await Promise.all([
    client.query(`
      select
        component_id,
        name,
        kind,
        layer,
        owner,
        repo_path,
        status
      from architecture.component_query
      where coalesce(status, '') <> 'deprecated'
      order by repo_path, component_id
    `),
    client.query(`
      select distinct
        panel.component_id,
        lifecycle.document_path,
        lifecycle.canonicality,
        lifecycle.lifecycle_state,
        lifecycle.status
      from ${schemaName}.documentation_panel_query panel
      join ${schemaName}.documentation_lifecycle_query lifecycle
        on lifecycle.document_path = panel.source_path
      where panel.entity_kind = 'document'
        and panel.panel_surface = 'metadata'
        and nullif(panel.component_id, '') is not null
        and lifecycle.canonicality = 'canonical'
      order by panel.component_id, lifecycle.document_path
    `),
  ]);

  return {
    components: componentResult.rows,
    documents: documentationResult.rows,
  };
}

function isCurrentCanonicalDocument(row) {
  const canonicality = String(row.canonicality ?? '').toLowerCase();
  const lifecycle = String(row.lifecycle_state ?? row.lifecycleState ?? '').toLowerCase();
  const status = String(row.status ?? '').toLowerCase();
  if (canonicality && canonicality !== 'canonical') return false;
  return !['archived', 'historical', 'superseded', 'retired', 'discarded'].includes(lifecycle) &&
    !['archived', 'historical', 'superseded', 'retired', 'discarded'].includes(status);
}

function relativeDocLink(documentPath) {
  const normalized = normalizeRepoPath(documentPath);
  if (!normalized.startsWith('docs/')) return null;
  const relative = path.posix.relative('docs/concepts', normalized);
  return relative || './repository-map.md';
}

function documentComponentId(document) {
  return document.component_id ?? document.componentId ?? null;
}

function documentPath(document) {
  return document.document_path ?? document.documentPath ?? null;
}

function resolveCanonicalDocuments(componentId, documents) {
  return documents
    .filter((document) => documentComponentId(document) === componentId)
    .filter(isCurrentCanonicalDocument)
    .map(documentPath)
    .filter(Boolean)
    .sort((left, right) => String(left).localeCompare(String(right), 'en'));
}

function resolveWorkspaceArchitecture(workspace, components, documents) {
  const exactMatches = components.filter(
    (component) => normalizeRepoPath(component.repo_path ?? component.repoPath) === workspace.path
  );

  if (exactMatches.length === 0) {
    return {
      component: '-',
      componentStatus: '-',
      canonicalDoc: '-',
      gaps: ['unregistered-component'],
    };
  }

  if (exactMatches.length > 1) {
    return {
      component: exactMatches
        .map((component) => component.component_id ?? component.componentId)
        .sort((left, right) => String(left).localeCompare(String(right), 'en'))
        .join(', '),
      componentStatus: '-',
      canonicalDoc: '-',
      gaps: ['ambiguous-component'],
    };
  }

  const component = exactMatches[0];
  const componentId = component.component_id ?? component.componentId;
  const matchingDocs = resolveCanonicalDocuments(componentId, documents);

  if (matchingDocs.length === 0) {
    return {
      component: componentId,
      componentStatus: component.status ?? '-',
      canonicalDoc: '-',
      gaps: ['missing-doc-entry'],
    };
  }

  const linkedDocuments = matchingDocs.map((currentDocumentPath) => {
    const link = relativeDocLink(currentDocumentPath);
    return link ? `[${currentDocumentPath}](${link})` : null;
  });

  if (linkedDocuments.some((link) => link === null)) {
    return {
      component: componentId,
      componentStatus: component.status ?? '-',
      canonicalDoc: '-',
      gaps: ['missing-doc-entry'],
    };
  }

  return {
    component: componentId,
    componentStatus: component.status ?? '-',
    canonicalDoc: linkedDocuments.join(', '),
    gaps: matchingDocs.length > 1 ? ['ambiguous-doc-entry'] : [],
  };
}

function buildRepositoryMapRows(workspaces, facts) {
  return workspaces.map((workspace) => {
    const architecture = resolveWorkspaceArchitecture(
      workspace,
      facts.components || [],
      facts.documents || []
    );
    return [
      workspace.workspace,
      `\`${workspace.path}\``,
      workspace.kind,
      String(workspace.src),
      String(workspace.tests),
      workspace.hasBuild,
      workspace.hasTest,
      workspace.hasTypecheck,
      architecture.component,
      architecture.componentStatus,
      architecture.canonicalDoc,
      architecture.gaps.length > 0 ? architecture.gaps.join(', ') : 'none',
    ];
  });
}

function renderRepositoryMap(workspaces, facts, utcDate) {
  const rows = buildRepositoryMapRows(workspaces, facts);
  const gapCount = rows.filter((row) => row[row.length - 1] !== 'none').length;

  return [
    '---',
    'title: Repository Map',
    'status: Active',
    'owner: Architecture / Docs',
    `last_reviewed: ${utcDate}`,
    '---',
    '',
    '# Repository Map',
    '',
    'Use this map to locate a workspace, its exact architecture identity, and its canonical documentation entry point.',
    'Repository facts come from package manifests and source/test files; architecture and documentation identity come from Planning DB read models.',
    'Missing or conflicting identity is reported as a gap and is never inferred from package, directory, title, or document names.',
    '',
    '## Current state',
    '',
    ...markdownTable(
      ['Metric', 'Value'],
      [
        ['Workspaces', String(workspaces.length)],
        ['Rows with explicit gaps', String(gapCount)],
        ['Workspace source', '`apps/*` and `packages/*` package manifests'],
        ['Architecture source', '`architecture.component_query`'],
        ['Documentation source', `\`${schemaName}.documentation_panel_query\``],
      ]
    ),
    '',
    '## Workspace map',
    '',
    ...markdownTable(
      [
        'Workspace',
        'Path',
        'Kind',
        'Src',
        'Tests',
        'Build',
        'Test',
        'Typecheck',
        'Planning DB component',
        'Component status',
        'Canonical documentation',
        'Gap',
      ],
      rows
    ),
    '',
    '## Reading rule',
    '',
    '- `unregistered-component`: no active Planning DB component has the exact workspace repository path.',
    '- `ambiguous-component`: more than one active Planning DB component claims the exact workspace path.',
    '- `missing-doc-entry`: the matched component has no current canonical document linked by explicit component identity.',
    '- `ambiguous-doc-entry`: more than one current canonical document is linked to the same component identity.',
    '',
    'This projection does not define behavior, maturity, or responsibility prose.',
    'Use the linked canonical document for authored meaning and design rationale.',
    '',
    '> This page is auto-generated by `pnpm docs:status:generate`. Do not edit manually.',
    '',
  ].join('\n');
}

function writeIfChanged(absPath, content) {
  const current = fs.existsSync(absPath) ? fs.readFileSync(absPath, 'utf8') : null;
  if (current === content) return false;
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content, 'utf8');
  return true;
}

function assertTrackedRepositoryMapCleanInCi() {
  if (!process.env.CI) return;

  const relPath = relFromRepo(repositoryMapOutputPath);
  const result = spawnSync('git', ['diff', '--exit-code', '--', relPath], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.status === 0) return;

  const generated = fs.readFileSync(repositoryMapOutputPath, 'utf8');
  console.error(`[docs:status:generate] ${relPath} is stale. Regenerate and commit it.`);
  if (result.stdout) console.error(result.stdout.trimEnd());
  if (result.stderr) console.error(result.stderr.trimEnd());
  console.error('--- BEGIN GENERATED REPOSITORY MAP ---');
  console.error(generated.trimEnd());
  console.error('--- END GENERATED REPOSITORY MAP ---');
  throw new Error(`${relPath} is stale.`);
}

function resolveGenerationMode(argv) {
  const knownFlags = new Set(['--code-state-only', '--repository-map-only']);
  const unknownFlags = argv.filter((argument) => argument.startsWith('--') && !knownFlags.has(argument));
  if (unknownFlags.length > 0) {
    throw new Error(`Unknown generate-code-status option: ${unknownFlags.join(', ')}`);
  }

  const codeStateOnly = argv.includes('--code-state-only');
  const repositoryMapOnly = argv.includes('--repository-map-only');
  if (codeStateOnly && repositoryMapOnly) {
    throw new Error('Choose either --code-state-only or --repository-map-only, not both.');
  }
  if (codeStateOnly) return GENERATION_MODES.codeStateOnly;
  if (repositoryMapOnly) return GENERATION_MODES.repositoryMapOnly;
  return GENERATION_MODES.all;
}

function generateCodeState(workspaces) {
  const codeStateDate = resolveGeneratedDate(codeStateOutputPath, (date) =>
    renderCodeState(workspaces, date)
  );
  const codeState = renderCodeState(workspaces, codeStateDate);
  const changed = writeIfChanged(codeStateOutputPath, codeState);
  console.log(
    changed
      ? `[docs:status:generate] Updated ${relFromRepo(codeStateOutputPath)}`
      : `[docs:status:generate] ${relFromRepo(codeStateOutputPath)} already up to date.`
  );
}

async function generateRepositoryMap(workspaces, ClientCtor) {
  const client = new ClientCtor({ connectionString: databaseUrl() });
  await client.connect();
  try {
    const facts = await readRepositoryArchitectureFacts(client);
    const repositoryMapDate = resolveGeneratedDate(repositoryMapOutputPath, (date) =>
      renderRepositoryMap(workspaces, facts, date)
    );
    const repositoryMap = renderRepositoryMap(workspaces, facts, repositoryMapDate);
    const changed = writeIfChanged(repositoryMapOutputPath, repositoryMap);
    console.log(
      changed
        ? `[docs:status:generate] Updated ${relFromRepo(repositoryMapOutputPath)}`
        : `[docs:status:generate] ${relFromRepo(repositoryMapOutputPath)} already up to date.`
    );
    assertTrackedRepositoryMapCleanInCi();
  } finally {
    await client.end();
  }
}

async function main(argv = process.argv.slice(2), dependencies = {}) {
  const mode = resolveGenerationMode(argv);
  const collectWorkspaces =
    dependencies.collectRepositoryWorkspaceStats || collectRepositoryWorkspaceStats;
  const generateCodeStateFn = dependencies.generateCodeState || generateCodeState;
  const ClientCtor = dependencies.ClientCtor || Client;
  const generateRepositoryMapFn =
    dependencies.generateRepositoryMap ||
    ((workspaces) => generateRepositoryMap(workspaces, ClientCtor));
  const workspaces = collectWorkspaces();

  if (mode !== GENERATION_MODES.repositoryMapOnly) {
    await generateCodeStateFn(workspaces);
  }
  if (mode !== GENERATION_MODES.codeStateOnly) {
    await generateRepositoryMapFn(workspaces);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  buildRepositoryMapRows,
  collectRepositoryWorkspaceStats,
  collectWorkspaceDirs,
  collectWorkspaceStats,
  isCurrentCanonicalDocument,
  main,
  markdownCell,
  normalizeRepoPath,
  readRepositoryArchitectureFacts,
  relativeDocLink,
  renderCodeState,
  renderRepositoryMap,
  resolveGenerationMode,
  resolveWorkspaceArchitecture,
};
