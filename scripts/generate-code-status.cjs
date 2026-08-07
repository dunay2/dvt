#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const { resolveGeneratedDate } = require('./generated-doc-date.cjs');
const { defaultPgUrl } = require('./planning-db-run.cjs');

const repoRoot = path.resolve(__dirname, '..');
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

function pnpmCommand() {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function parsePnpmWorkspaceRows(output) {
  let rows;
  try {
    rows = JSON.parse(String(output ?? ''));
  } catch (error) {
    throw new Error(
      `Unable to parse effective pnpm workspace membership: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error }
    );
  }
  if (!Array.isArray(rows)) {
    throw new Error('Effective pnpm workspace membership must be a JSON array.');
  }
  return rows;
}

function listPnpmWorkspaceDirs(options = {}) {
  const spawn = options.spawnSync || spawnSync;
  const root = path.resolve(options.root || repoRoot);
  const result = spawn(pnpmCommand(), ['list', '-r', '--depth', '-1', '--json'], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `pnpm list failed with exit code ${result.status}: ${String(result.stderr ?? '').trim()}`
    );
  }

  const unique = new Map();
  for (const row of parsePnpmWorkspaceRows(result.stdout)) {
    if (!row || typeof row.path !== 'string') continue;
    const absolutePath = path.resolve(row.path);
    if (absolutePath === root) continue;
    const relativePath = toPosix(path.relative(root, absolutePath));
    if (!relativePath || relativePath.startsWith('..')) {
      throw new Error(`pnpm reported a workspace outside the repository: ${row.path}`);
    }
    unique.set(relativePath, absolutePath);
  }

  return [...unique.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([, absolutePath]) => absolutePath);
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
    ...(fs.existsSync(testDir) ? walk(testDir, (_, name) => /\.(ts|tsx|js|jsx)$/u.test(name)) : []),
    ...colocatedTestFiles,
  ];

  const exportedSymbols = (() => {
    const indexTs = path.join(dir, 'src', 'index.ts');
    if (!fs.existsSync(indexTs)) return '-';
    return String(
      fs
        .readFileSync(indexTs, 'utf8')
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line.startsWith('export ')).length
    );
  })();

  const workspacePath = relFromRepo(dir);
  const readmePath = path.join(dir, 'README.md');
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
    localReadmePath: fs.existsSync(readmePath) ? `${workspacePath}/README.md` : null,
  };
}

function collectRepositoryWorkspaceStats(options = {}) {
  const workspaceDirs = options.workspaceDirs || listPnpmWorkspaceDirs(options);
  return workspaceDirs.map(collectWorkspaceStats);
}

function renderCodeState(workspaces, utcDate) {
  const totalSrc = workspaces.reduce((acc, workspace) => acc + workspace.src, 0);
  const totalTests = workspaces.reduce((acc, workspace) => acc + workspace.tests, 0);
  const withBuild = workspaces.filter((workspace) => workspace.hasBuild === 'yes').length;
  const withTest = workspaces.filter((workspace) => workspace.hasTest === 'yes').length;

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
    `Generated automatically from effective pnpm workspace membership on ${utcDate}.`,
    '',
    '## Summary',
    '',
    ...markdownTable(
      ['Metric', 'Value'],
      [
        ['Total workspaces', String(workspaces.length)],
        ['Total source files', String(totalSrc)],
        ['Total test files', String(totalTests)],
        ['Workspaces with build script', `${withBuild}/${workspaces.length}`],
        ['Workspaces with test script', `${withTest}/${workspaces.length}`],
      ]
    ),
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
  const componentResult = await client.query(`
    select
      component_id,
      name,
      kind,
      layer,
      owner,
      repo_path,
      status
    from architecture.component_query
    where coalesce(status, '') not in ('deprecated', 'drift')
    order by repo_path, component_id
  `);
  const documentResult = await client.query(`
    select distinct
      component_document.component_id,
      component_document.document_path,
      lifecycle.canonicality,
      lifecycle.lifecycle_state,
      lifecycle.status
    from planning_query_store.component_engineering_document_query component_document
    inner join planning_query_store.documentation_lifecycle_query lifecycle
      on lifecycle.document_path = component_document.document_path
    where component_document.document_kind = 'governing'
    order by component_document.component_id, component_document.document_path
  `);
  return { components: componentResult.rows, documents: documentResult.rows };
}

function isCurrentCanonicalDocument(row) {
  const canonicality = String(row.canonicality ?? '').toLowerCase();
  const lifecycle = String(row.lifecycle_state ?? row.lifecycleState ?? '').toLowerCase();
  const status = String(row.status ?? '').toLowerCase();
  if (canonicality !== 'canonical') return false;
  return (
    !['archived', 'historical', 'superseded', 'retired', 'discarded'].includes(lifecycle) &&
    !['archived', 'historical', 'superseded', 'retired', 'discarded'].includes(status)
  );
}

function relativeDocLink(documentPath) {
  const normalized = normalizeRepoPath(documentPath);
  if (!normalized) return null;
  const relative = path.posix.relative('docs/concepts', normalized);
  return relative || './repository-map.md';
}

function resolveCanonicalDocuments(componentId, documents) {
  return documents
    .filter((document) => (document.component_id ?? document.componentId) === componentId)
    .filter(isCurrentCanonicalDocument)
    .map((document) => document.document_path ?? document.documentPath)
    .filter(Boolean)
    .sort((left, right) => String(left).localeCompare(String(right), 'en'));
}

function resolveWorkspaceArchitecture(workspace, components, documents = []) {
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
      gaps: ['missing-canonical-doc-binding'],
    };
  }

  const links = matchingDocs.map((documentPath) => {
    const relative = relativeDocLink(documentPath);
    return relative ? `[${documentPath}](${relative})` : null;
  });
  if (links.some((link) => link === null)) {
    return {
      component: componentId,
      componentStatus: component.status ?? '-',
      canonicalDoc: '-',
      gaps: ['missing-canonical-doc-binding'],
    };
  }
  return {
    component: componentId,
    componentStatus: component.status ?? '-',
    canonicalDoc: links.join(', '),
    gaps: matchingDocs.length > 1 ? ['ambiguous-canonical-doc-binding'] : [],
  };
}

function repositoryBrowserUrl() {
  const repository = safeReadJson(path.join(repoRoot, 'package.json'))?.repository;
  const configuredUrl = typeof repository === 'string' ? repository : repository?.url;
  const browserUrl = String(configuredUrl || '')
    .replace(/^git\+/u, '')
    .replace(/\.git$/u, '')
    .replace(/\/$/u, '');

  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+$/u.test(browserUrl)) {
    throw new Error(
      'Root package.json must declare a GitHub repository URL for local README links.'
    );
  }
  return browserUrl;
}

function localReadmeLink(workspace) {
  if (!workspace.localReadmePath) return '-';
  const documentPath = normalizeRepoPath(workspace.localReadmePath);
  if (!documentPath) return '-';
  return `[${documentPath}](${repositoryBrowserUrl()}/blob/main/${documentPath})`;
}

function resolveDocumentationProjection(workspace, architecture) {
  if (architecture.canonicalDoc !== '-') {
    return { entry: architecture.canonicalDoc, coverage: 'canonical' };
  }
  const localEntry = localReadmeLink(workspace);
  if (localEntry !== '-') {
    return { entry: localEntry, coverage: 'linked-local' };
  }
  return { entry: '-', coverage: 'reference-only' };
}

function buildRepositoryMapRows(workspaces, facts) {
  return workspaces.map((workspace) => {
    const architecture = resolveWorkspaceArchitecture(
      workspace,
      facts.components || [],
      facts.documents || []
    );
    const documentation = resolveDocumentationProjection(workspace, architecture);
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
      documentation.entry,
      documentation.coverage,
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
    'Use this map to locate every effective pnpm workspace, its exact architecture identity, and an exact documentation entry when one is mechanically available.',
    'Architecture identity comes from Planning DB; documentation coverage comes from an explicit canonical binding when registered or an exact workspace-local README fallback.',
    'Missing or conflicting identity is reported as a gap and is never inferred from package, directory, title, or document names.',
    '',
    '## Current state',
    '',
    ...markdownTable(
      ['Metric', 'Value'],
      [
        ['Workspaces', String(workspaces.length)],
        ['Rows with explicit gaps', String(gapCount)],
        ['Workspace source', '`pnpm list -r --depth -1 --json`'],
        ['Architecture source', '`architecture.component_query`'],
        ['Documentation source', 'exact component binding or workspace `README.md`'],
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
        'Documentation entry',
        'Coverage',
        'Gap',
      ],
      rows
    ),
    '',
    '## Reading rule',
    '',
    '- `canonical`: an exact canonical document binding exists for the workspace component.',
    '- `linked-local`: no canonical binding exists, but the effective workspace has an exact local `README.md`.',
    '- `reference-only`: neither an exact canonical binding nor a workspace-local README exists.',
    '- `unregistered-component`: no active non-drift Planning DB component has the exact workspace repository path.',
    '- `ambiguous-component`: more than one active non-drift component claims the exact workspace path.',
    '- `missing-canonical-doc-binding`: the component is registered but no exact canonical document relation is registered.',
    '- `ambiguous-canonical-doc-binding`: more than one canonical document is explicitly bound to the component.',
    '',
    '## Related authored context',
    '',
    '- [Component Map](../architecture/component-map.md) for authored component responsibilities and relations.',
    '- [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md) for topic-level code, test, command, and evidence navigation.',
    '- [System Delivery Status](../architecture/system-delivery-status.md) for current delivery and maturity interpretation.',
    '- [Glossary](./glossary.md) and [Domain Language](./domain-language.md) for repository terminology.',
    '',
    'This projection does not define behavior, maturity, or responsibility prose.',
    'Use the exact documentation entry when present and the related authored context for broader interpretation.',
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

function assertTrackedRepositoryMapClean(options = {}) {
  const check = options.check === true || Boolean(process.env.CI);
  if (!check) return;
  const run = options.spawnSync || spawnSync;
  const relativePath = relFromRepo(repositoryMapOutputPath);
  const result = run('git', ['diff', '--exit-code', '--', relativePath], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.status === 0) return;
  const generated = fs.readFileSync(repositoryMapOutputPath, 'utf8');
  console.error(`[docs:status:check] ${relativePath} is stale. Regenerate and commit it.`);
  if (result.stdout) console.error(result.stdout.trimEnd());
  if (result.stderr) console.error(result.stderr.trimEnd());
  console.error('--- BEGIN GENERATED REPOSITORY MAP ---');
  console.error(generated.trimEnd());
  console.error('--- END GENERATED REPOSITORY MAP ---');
  throw new Error(`${relativePath} is stale.`);
}

function resolveGenerationMode(argv) {
  const knownFlags = new Set(['--code-state-only', '--repository-map-only', '--check']);
  const unknownFlags = argv.filter(
    (argument) => argument.startsWith('--') && !knownFlags.has(argument)
  );
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
  const date = resolveGeneratedDate(codeStateOutputPath, (value) =>
    renderCodeState(workspaces, value)
  );
  const changed = writeIfChanged(codeStateOutputPath, renderCodeState(workspaces, date));
  console.log(
    changed
      ? `[docs:status:generate] Updated ${relFromRepo(codeStateOutputPath)}`
      : `[docs:status:generate] ${relFromRepo(codeStateOutputPath)} already up to date.`
  );
}

async function generateRepositoryMap(workspaces, ClientCtor, options = {}) {
  const client = new ClientCtor({ connectionString: databaseUrl() });
  await client.connect();
  try {
    const facts = await readRepositoryArchitectureFacts(client);
    const date = resolveGeneratedDate(repositoryMapOutputPath, (value) =>
      renderRepositoryMap(workspaces, facts, value)
    );
    const changed = writeIfChanged(
      repositoryMapOutputPath,
      renderRepositoryMap(workspaces, facts, date)
    );
    console.log(
      changed
        ? `[docs:status:generate] Updated ${relFromRepo(repositoryMapOutputPath)}`
        : `[docs:status:generate] ${relFromRepo(repositoryMapOutputPath)} already up to date.`
    );
    assertTrackedRepositoryMapClean({ check: options.check });
  } finally {
    await client.end();
  }
}

async function main(argv = process.argv.slice(2), dependencies = {}) {
  const mode = resolveGenerationMode(argv);
  const check = argv.includes('--check');
  const collectWorkspaces =
    dependencies.collectRepositoryWorkspaceStats || collectRepositoryWorkspaceStats;
  const generateCodeStateFn = dependencies.generateCodeState || generateCodeState;
  const ClientCtor = dependencies.ClientCtor || Client;
  const generateRepositoryMapFn =
    dependencies.generateRepositoryMap ||
    ((workspaces) => generateRepositoryMap(workspaces, ClientCtor, { check }));
  const workspaces = collectWorkspaces(dependencies.workspaceOptions || {});

  if (mode !== GENERATION_MODES.repositoryMapOnly) await generateCodeStateFn(workspaces);
  if (mode !== GENERATION_MODES.codeStateOnly) await generateRepositoryMapFn(workspaces);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  assertTrackedRepositoryMapClean,
  buildRepositoryMapRows,
  collectRepositoryWorkspaceStats,
  collectWorkspaceStats,
  isCurrentCanonicalDocument,
  listPnpmWorkspaceDirs,
  main,
  markdownCell,
  normalizeRepoPath,
  parsePnpmWorkspaceRows,
  readRepositoryArchitectureFacts,
  relativeDocLink,
  renderCodeState,
  renderRepositoryMap,
  resolveDocumentationProjection,
  resolveGenerationMode,
  resolveWorkspaceArchitecture,
};
