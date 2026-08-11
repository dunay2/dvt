#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const { resolveGeneratedDate } = require('./generated-doc-date.cjs');
const { defaultPgUrl } = require('./planning-db-run.cjs');
const {
  readArchitectureComponentRows,
  readArchitectureDriftRows,
  readArchitectureMaturityRows,
  readArchitectureObservabilityRows,
  readArchitectureRelationRows,
  readArchitectureResponsibilityRows,
  readCommandQueryRailRows,
  readFeatureMechanizationFeatureRows,
} = require('./planning-db-query.cjs');

const repoRoot = path.resolve(__dirname, '..');
const codeStateOutputPath = path.join(
  repoRoot,
  '.generated-docs',
  'planning',
  'status',
  'generated-code-state.md'
);
const repositoryMapOutputPath = path.join(
  repoRoot,
  '.generated-docs',
  'concepts',
  'repository-map.md'
);
const componentMapOutputPath = path.join(
  repoRoot,
  '.generated-docs',
  'architecture',
  'component-map.md'
);
const systemDeliveryStatusOutputPath = path.join(
  repoRoot,
  '.generated-docs',
  'architecture',
  'system-delivery-status.md'
);

const GENERATION_MODES = Object.freeze({
  all: 'all',
  codeStateOnly: 'code-state-only',
  componentMapOnly: 'component-map-only',
  repositoryMapOnly: 'repository-map-only',
  systemDeliveryStatusOnly: 'system-delivery-status-only',
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
    const relativePath = toPosix(path.relative(root, absolutePath));
    if (relativePath.startsWith('..')) {
      throw new Error(`pnpm reported a workspace outside the repository: ${row.path}`);
    }
    unique.set(relativePath || '.', absolutePath);
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

function isWalkEligibleRepositoryPath(repositoryPath) {
  return normalizeRepoPath(repositoryPath)
    .split('/')
    .filter(Boolean)
    .every(
      (segment) =>
        !segment.startsWith('.') &&
        segment !== 'node_modules' &&
        segment !== 'dist' &&
        segment !== 'site'
    );
}

function collectWorkspaceStats(dir, options = {}) {
  const root = path.resolve(options.root || repoRoot);
  const workspacePath = toPosix(path.relative(root, path.resolve(dir))) || '.';
  if (
    (options.root || options.gitTreePaths) &&
    (workspacePath === '..' || workspacePath.startsWith('../') || path.isAbsolute(workspacePath))
  ) {
    throw new Error(`Workspace ${dir} is outside the evaluated repository.`);
  }
  const gitTreePaths = options.gitTreePaths;
  const repositoryPath = (relativePath) =>
    workspacePath === '.' ? relativePath : `${workspacePath}/${relativePath}`;
  const pkgPath = path.join(dir, 'package.json');
  if (gitTreePaths && gitTreePaths.get(repositoryPath('package.json')) !== 'blob') {
    throw new Error(`Workspace ${workspacePath} is not part of the evaluated Git tree.`);
  }
  const pkg = safeReadJson(pkgPath) || {};
  const scripts = pkg.scripts || {};
  const srcDir = path.join(dir, 'src');
  const testDir = path.join(dir, 'test');
  const treeFiles = gitTreePaths
    ? [...gitTreePaths]
        .filter(([, entryType]) => entryType === 'blob')
        .map(([entryPath]) => normalizeRepoPath(entryPath))
        .filter((entryPath) =>
          workspacePath === '.' ? true : entryPath.startsWith(`${workspacePath}/`)
        )
        .map((entryPath) =>
          workspacePath === '.' ? entryPath : entryPath.slice(workspacePath.length + 1)
        )
    : null;
  const srcFiles = treeFiles
    ? treeFiles.filter(
        (filePath) =>
          filePath.startsWith('src/') &&
          isWalkEligibleRepositoryPath(filePath.slice('src/'.length)) &&
          isSourceCodeFile(path.posix.basename(filePath)) &&
          !isColocatedTestFile(path.posix.basename(filePath))
      )
    : fs.existsSync(srcDir)
      ? walk(srcDir, (_, name) => isSourceCodeFile(name) && !isColocatedTestFile(name))
      : [];
  const colocatedTestFiles = treeFiles
    ? treeFiles.filter(
        (filePath) =>
          filePath.startsWith('src/') &&
          isWalkEligibleRepositoryPath(filePath.slice('src/'.length)) &&
          isColocatedTestFile(path.posix.basename(filePath))
      )
    : fs.existsSync(srcDir)
      ? walk(srcDir, (_, name) => isColocatedTestFile(name))
      : [];
  const testFiles = treeFiles
    ? [
        ...treeFiles.filter(
          (filePath) =>
            filePath.startsWith('test/') &&
            isWalkEligibleRepositoryPath(filePath.slice('test/'.length)) &&
            /\.(ts|tsx|js|jsx)$/u.test(path.posix.basename(filePath))
        ),
        ...colocatedTestFiles,
      ]
    : [
        ...(fs.existsSync(testDir)
          ? walk(testDir, (_, name) => /\.(ts|tsx|js|jsx)$/u.test(name))
          : []),
        ...colocatedTestFiles,
      ];

  const exportedSymbols = (() => {
    const indexTs = path.join(dir, 'src', 'index.ts');
    if (
      (gitTreePaths && gitTreePaths.get(repositoryPath('src/index.ts')) !== 'blob') ||
      !fs.existsSync(indexTs)
    )
      return '-';
    return String(
      fs
        .readFileSync(indexTs, 'utf8')
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line.startsWith('export ')).length
    );
  })();

  const readmePath = path.join(dir, 'README.md');
  const hasReadme = gitTreePaths
    ? gitTreePaths.get(repositoryPath('README.md')) === 'blob'
    : fs.existsSync(readmePath);
  return {
    workspace: pkg.name || workspacePath,
    path: workspacePath,
    kind: workspacePath === '.' ? 'root' : workspacePath.startsWith('apps/') ? 'app' : 'package',
    src: srcFiles.length,
    tests: testFiles.length,
    hasBuild: scripts.build ? 'yes' : 'no',
    hasTest: scripts.test ? 'yes' : 'no',
    hasTypecheck: scripts.typecheck || scripts['type-check'] ? 'yes' : 'no',
    exports: exportedSymbols,
    localReadmePath: hasReadme
      ? workspacePath === '.'
        ? 'README.md'
        : `${workspacePath}/README.md`
      : null,
  };
}

function collectRepositoryWorkspaceStats(options = {}) {
  const workspaceDirs = options.workspaceDirs || listPnpmWorkspaceDirs(options);
  return workspaceDirs.map((workspaceDir) => collectWorkspaceStats(workspaceDir, options));
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

function readRepositoryReleaseFacts(options = {}) {
  const root = path.resolve(options.root || repoRoot);
  const packageJson = Object.prototype.hasOwnProperty.call(options, 'packageJson')
    ? options.packageJson
    : safeReadJson(path.join(root, 'package.json'));
  const releaseManifest = Object.prototype.hasOwnProperty.call(options, 'releaseManifest')
    ? options.releaseManifest
    : safeReadJson(path.join(root, '.release-please-manifest.json'));
  const changelog = Object.prototype.hasOwnProperty.call(options, 'changelog')
    ? options.changelog
    : fs.existsSync(path.join(root, 'CHANGELOG.md'))
      ? fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8')
      : null;
  const packageVersion = String(packageJson?.version || '').trim();
  const manifestVersion = String(releaseManifest?.['.'] || '').trim();
  const changelogVersion =
    String(changelog || '')
      .match(/^##\s+v?([^\s(]+)/mu)?.[1]
      ?.trim() || '';
  const sources = [
    ['package.json', packageVersion],
    ['.release-please-manifest.json', manifestVersion],
    ['CHANGELOG.md', changelogVersion],
  ];
  const missingSources = sources.filter(([, version]) => !version).map(([source]) => source);
  if (missingSources.length > 0) {
    throw new Error(
      `Required repository release fact is missing from ${missingSources.join(', ')}.`
    );
  }
  const versions = [...new Set(sources.map(([, version]) => version))];
  if (versions.length !== 1) {
    throw new Error(
      `Contradictory repository release identity: ${sources
        .map(([source, version]) => `${source}=${version}`)
        .join(', ')}.`
    );
  }
  return { version: versions[0] };
}

function assertGitWorktreeMatchesCommit(expectedGitSha, options = {}) {
  const root = path.resolve(options.root || repoRoot);
  const spawn = options.spawnSync || spawnSync;
  const actualGitSha = currentGitSha({ root, spawnSync: spawn });
  if (actualGitSha !== expectedGitSha) {
    throw new Error(
      `System Delivery Status Git input changed during generation: expected ${expectedGitSha}, found ${actualGitSha}.`
    );
  }

  const result = spawn('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) {
    throw new Error(`Cannot inspect the evaluated Git worktree: ${result.error.message}.`, {
      cause: result.error,
    });
  }
  if (result.status !== 0) {
    throw new Error(
      `Cannot inspect the evaluated Git worktree: ${String(result.stderr ?? '').trim()}.`
    );
  }

  const changedEntries = String(result.stdout || '')
    .split(/\r?\n/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (changedEntries.length > 0) {
    const visibleEntries = changedEntries.slice(0, 10).join(', ');
    const remainder = changedEntries.length > 10 ? `, +${changedEntries.length - 10} more` : '';
    throw new Error(
      `System Delivery Status requires a clean Git worktree matching evaluated commit ${expectedGitSha}; found ${visibleEntries}${remainder}.`
    );
  }
}

function assertEvaluatedRepositorySnapshot(snapshot, options = {}) {
  const gitSha = String(snapshot?.gitSha || '').trim();
  const expectedVersion = String(snapshot?.release?.version || '').trim();
  if (!gitSha) throw new Error('Required evaluated Git commit is unavailable.');
  if (!expectedVersion)
    throw new Error('Required repository release fact "version" is unavailable.');

  assertGitWorktreeMatchesCommit(gitSha, options);
  const release = options.release || readRepositoryReleaseFacts(options);
  if (String(release.version).trim() !== expectedVersion) {
    throw new Error(
      `System Delivery Status release input changed during generation: expected ${expectedVersion}, found ${release.version}.`
    );
  }
  return snapshot;
}

function readEvaluatedRepositorySnapshot(options = {}) {
  const root = path.resolve(options.root || repoRoot);
  const gitSha = currentGitSha({ root, spawnSync: options.spawnSync });
  const snapshot = {
    gitSha,
    gitTreePaths:
      options.gitTreePaths || readGitTreePaths({ root, gitSha, spawnSync: options.spawnSync }),
    release: options.release || readRepositoryReleaseFacts({ root }),
  };
  return assertEvaluatedRepositorySnapshot(snapshot, { ...options, root });
}

async function readSystemDeliveryStatusFacts(client, readers = {}) {
  const limit = 100000;
  const componentReader = readers.readArchitectureComponentRows || readArchitectureComponentRows;
  const maturityReader = readers.readArchitectureMaturityRows || readArchitectureMaturityRows;
  const railReader = readers.readCommandQueryRailRows || readCommandQueryRailRows;
  const featureReader =
    readers.readFeatureMechanizationFeatureRows || readFeatureMechanizationFeatureRows;
  return {
    components: await componentReader(client, { limit }),
    maturity: await maturityReader(client, { limit }),
    rails: await railReader(client, { limit }),
    features: await featureReader(client, { limit }),
  };
}

function requiredFactRows(facts, key) {
  const rows = facts?.[key];
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`Required Planning DB fact set "${key}" is unavailable or empty.`);
  }
  return rows;
}

function exactValueCounts(values) {
  return Object.fromEntries(
    [...values]
      .sort((left, right) => String(left).localeCompare(String(right), 'en', { numeric: true }))
      .reduce((counts, value) => {
        const key = String(value);
        counts.set(key, (counts.get(key) || 0) + 1);
        return counts;
      }, new Map())
  );
}

function requiredRowText(row, snakeKey, camelKey, factKind) {
  const value = String(row?.[snakeKey] ?? row?.[camelKey] ?? '').trim();
  if (!value) throw new Error(`Required Planning DB ${factKind} fact "${snakeKey}" is missing.`);
  return value;
}

function buildSystemDeliveryStatusProjection(workspaces, facts, options = {}) {
  const gitSha = String(options.gitSha || currentGitSha(options)).trim();
  const version = String(options.release?.version || '').trim();
  if (!gitSha) throw new Error('Required evaluated Git commit is unavailable.');
  if (!version) throw new Error('Required repository release fact "version" is unavailable.');

  const components = requiredFactRows(facts, 'components');
  const maturityRows = requiredFactRows(facts, 'maturity');
  const rails = requiredFactRows(facts, 'rails');
  const features = requiredFactRows(facts, 'features');
  const componentIds = new Set();
  for (const component of components) {
    const componentId = requiredRowText(component, 'component_id', 'componentId', 'component');
    if (componentIds.has(componentId)) {
      throw new Error(`Duplicate Planning DB component identity ${componentId}.`);
    }
    componentIds.add(componentId);
  }

  const maturityByComponent = new Map();
  for (const maturity of maturityRows) {
    const componentId = requiredRowText(maturity, 'component_id', 'componentId', 'maturity');
    if (!componentIds.has(componentId)) {
      throw new Error(`Planning DB maturity references unknown component ${componentId}.`);
    }
    if (maturityByComponent.has(componentId)) {
      throw new Error(`Duplicate Planning DB maturity identity ${componentId}.`);
    }
    const score = maturity.maturity_score ?? maturity.maturityScore;
    if (score === null || score === undefined || String(score).trim() === '') {
      throw new Error(`Required Planning DB maturity score is missing for ${componentId}.`);
    }
    maturityByComponent.set(componentId, String(score));
  }
  const componentsMissingMaturity = [...componentIds]
    .filter((componentId) => !maturityByComponent.has(componentId))
    .sort((left, right) => left.localeCompare(right, 'en'));

  const railStatuses = [];
  const railGaps = [];
  for (const rail of rails) {
    const railName = requiredRowText(rail, 'rail_name', 'railName', 'rail');
    const railType = requiredRowText(rail, 'rail_type', 'railType', 'rail');
    const railStatus = requiredRowText(rail, 'rail_status', 'railStatus', 'rail');
    if (rail.is_duplicate ?? rail.isDuplicate) {
      throw new Error(`Duplicate command/query rail authority detected for ${railName}.`);
    }
    railStatuses.push(railStatus);
    if (rail.is_gap ?? rail.isGap) railGaps.push(`rail:${railType}:${railName}:${railStatus}`);
  }

  const featureIds = new Set();
  const featureStatuses = [];
  for (const feature of features) {
    const featureId = requiredRowText(feature, 'feature_id', 'featureId', 'feature');
    const status = requiredRowText(
      feature,
      'mechanization_status',
      'mechanizationStatus',
      'feature'
    );
    if (featureIds.has(featureId)) {
      throw new Error(`Duplicate Planning DB feature identity ${featureId}.`);
    }
    featureIds.add(featureId);
    featureStatuses.push(status);
  }

  const gaps = [
    ...componentsMissingMaturity.map((componentId) => `component:${componentId}:missing-maturity`),
    ...railGaps,
  ].sort((left, right) => left.localeCompare(right, 'en'));
  return {
    repository: {
      gitSha,
      version,
      workspaceCount: workspaces.length,
      sourceFileCount: workspaces.reduce((total, workspace) => total + workspace.src, 0),
      testFileCount: workspaces.reduce((total, workspace) => total + workspace.tests, 0),
      buildScriptCount: workspaces.filter((workspace) => workspace.hasBuild === 'yes').length,
      testScriptCount: workspaces.filter((workspace) => workspace.hasTest === 'yes').length,
    },
    architecture: {
      componentCount: componentIds.size,
      maturityRegisteredCount: maturityByComponent.size,
      componentsMissingMaturity,
      maturityScoreCounts: exactValueCounts(maturityByComponent.values()),
    },
    delivery: {
      railCount: rails.length,
      railGapCount: railGaps.length,
      duplicateRailCount: 0,
      featureCount: featureIds.size,
      featureStatuses: exactValueCounts(featureStatuses),
      railStatuses: exactValueCounts(railStatuses),
    },
    gaps,
  };
}

function renderCountRows(counts) {
  return Object.entries(counts).map(([value, count]) => [value, String(count)]);
}

function renderSystemDeliveryStatus(projection, utcDate) {
  const { repository, architecture, delivery, gaps } = projection;
  return [
    '---',
    'title: System Delivery Status',
    'status: Active',
    'owner: Architecture / Docs',
    `last_reviewed: ${utcDate}`,
    '---',
    '',
    '# System Delivery Status',
    '',
    'This page is the mandatory current-state consultation surface for architecture and design work.',
    'It is an on-demand projection: Git and repository release files own repository facts; Planning DB owns structured architecture, maturity, rail, and feature facts.',
    'Exact Planning DB status only is shown. File presence, test presence, GitHub issue state, and capability heuristics are not semantic delivery truth.',
    '',
    '## Evaluated repository',
    '',
    ...markdownTable(
      ['Fact', 'Exact value', 'Authority'],
      [
        ['Evaluated Git commit', `\`${repository.gitSha}\``, 'Git'],
        ['Repository release', repository.version, 'repository release files'],
        ['Effective workspaces', String(repository.workspaceCount), '`pnpm list`'],
        ['Conventional source files', String(repository.sourceFileCount), 'workspace scan'],
        ['Conventional test files', String(repository.testFileCount), 'workspace scan'],
        [
          'Workspaces with build script',
          `${repository.buildScriptCount}/${repository.workspaceCount}`,
          'workspace package manifests',
        ],
        [
          'Workspaces with test script',
          `${repository.testScriptCount}/${repository.workspaceCount}`,
          'workspace package manifests',
        ],
      ]
    ),
    '',
    '## Architecture registration and maturity',
    '',
    ...markdownTable(
      ['Fact', 'Exact value'],
      [
        ['Registered components', String(architecture.componentCount)],
        ['Registered maturity rows', String(architecture.maturityRegisteredCount)],
        ['Components missing maturity', String(architecture.componentsMissingMaturity.length)],
      ]
    ),
    '',
    '### Exact maturity score distribution',
    '',
    ...markdownTable(
      ['Maturity score', 'Components'],
      renderCountRows(architecture.maturityScoreCounts)
    ),
    '',
    '## Command/query rails and feature mechanization',
    '',
    ...markdownTable(
      ['Fact', 'Exact value'],
      [
        ['Effective command/query rail rows', String(delivery.railCount)],
        ['Rails with explicit gaps', String(delivery.railGapCount)],
        ['Duplicate rail authorities', String(delivery.duplicateRailCount)],
        ['Registered features', String(delivery.featureCount)],
      ]
    ),
    '',
    '### Exact rail-status distribution',
    '',
    ...markdownTable(['Rail status', 'Rails'], renderCountRows(delivery.railStatuses)),
    '',
    '### Exact feature-status distribution',
    '',
    ...markdownTable(['Feature status', 'Features'], renderCountRows(delivery.featureStatuses)),
    '',
    '## Explicit gaps',
    '',
    `Total explicit gaps: **${gaps.length}**.`,
    '',
    ...(gaps.length > 0 ? gaps.map((gap) => `- \`${gap}\``) : ['- none']),
    '',
    '## Reading and decision rule',
    '',
    '- Consult this projection before architecture or design changes, then follow the linked authored ADRs and component pages for rationale and invariants.',
    '- Missing or contradictory required repository/DB facts fail generation rather than being guessed.',
    '- GitHub Issues own MVP task lifecycle and are not queried or copied into this projection.',
    '- Generate explicitly with `pnpm docs:status:generate --system-delivery-status-only` or as part of `pnpm docs:publish`; ordinary `docs:build` consumes the existing publication tree.',
    '',
    '## Related detail',
    '',
    '- [Component Map](./component-map.md)',
    '- [Repository Map](../concepts/repository-map.md)',
    '- [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md)',
    '- [Command and Query Rail Governance](./command-query-rail-governance.md)',
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
  const documents = await readArchitectureComponentDocumentRows(client);
  return { components: componentResult.rows, documents };
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
    "Conventional source/test counts cover only each workspace's `src/` and `test/` trees, including colocated tests under `src/`. Root-level `scripts/` and `tools/` are outside these counts.",
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
        'Conventional src files',
        'Conventional test files',
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
    '- [Component Map](../architecture/component-map.md) for the DB-first component catalog and exact directed relations.',
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

async function readArchitectureComponentDocumentRows(client) {
  const result = await client.query(`
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
  return result.rows;
}

async function readComponentTopologyFacts(client, readers = {}) {
  const limit = 100000;
  const componentReader = readers.readArchitectureComponentRows || readArchitectureComponentRows;
  const relationReader = readers.readArchitectureRelationRows || readArchitectureRelationRows;
  const responsibilityReader =
    readers.readArchitectureResponsibilityRows || readArchitectureResponsibilityRows;
  const maturityReader = readers.readArchitectureMaturityRows || readArchitectureMaturityRows;
  const observabilityReader =
    readers.readArchitectureObservabilityRows || readArchitectureObservabilityRows;
  const driftReader = readers.readArchitectureDriftRows || readArchitectureDriftRows;
  const documentReader =
    readers.readArchitectureComponentDocumentRows || readArchitectureComponentDocumentRows;
  const [
    components,
    relations,
    responsibilities,
    maturity,
    observability,
    componentDrift,
    relationDrift,
    documents,
  ] = await Promise.all([
    componentReader(client, { limit }),
    relationReader(client, { limit }),
    responsibilityReader(client, { limit }),
    maturityReader(client, { limit }),
    observabilityReader(client, { limit }),
    driftReader(client, { limit, subjectKind: 'component' }),
    driftReader(client, { limit, subjectKind: 'relation' }),
    documentReader(client),
  ]);
  return {
    components,
    relations,
    responsibilities,
    maturity,
    observability,
    drift: [...componentDrift, ...relationDrift],
    documents,
  };
}

function currentGitSha(options = {}) {
  if (options.gitSha) return String(options.gitSha).trim();
  const spawn = options.spawnSync || spawnSync;
  const result = spawn('git', ['rev-parse', 'HEAD'], {
    cwd: options.root || repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Cannot resolve evaluated Git input: ${String(result.stderr).trim()}.`);
  }
  return String(result.stdout).trim();
}

function readGitTreePaths(options = {}) {
  const root = path.resolve(options.root || repoRoot);
  const gitSha = currentGitSha({ root, gitSha: options.gitSha });
  const spawn = options.spawnSync || spawnSync;
  const result = spawn('git', ['ls-tree', '-rz', '-t', '--full-tree', gitSha], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) {
    throw new Error(`Cannot read Component Map Git tree: ${result.error.message}.`, {
      cause: result.error,
    });
  }
  if (result.status !== 0) {
    throw new Error(
      `Cannot read Component Map Git tree at ${gitSha}: ${String(result.stderr).trim()}.`
    );
  }

  const entries = new Map();
  for (const record of String(result.stdout || '').split('\0')) {
    if (!record) continue;
    const separator = record.indexOf('\t');
    if (separator < 0) {
      throw new Error(`Cannot parse Component Map Git tree entry: ${record}.`);
    }
    const metadata = record.slice(0, separator).split(' ');
    const entryType = metadata[1];
    const repositoryPath = normalizeRepoPath(record.slice(separator + 1));
    if (!repositoryPath || (entryType !== 'tree' && entryType !== 'blob')) {
      throw new Error(`Cannot parse Component Map Git tree entry: ${record}.`);
    }
    entries.set(repositoryPath, entryType);
  }
  return entries;
}

function groupRowsByComponent(
  rows,
  knownComponentIds,
  rowKind,
  componentIdentity = (row) => row.component_id ?? row.componentId
) {
  const grouped = new Map();
  for (const row of rows || []) {
    const componentId = String(componentIdentity(row) ?? '').trim();
    if (!knownComponentIds.has(componentId)) {
      throw new Error(`Unknown Planning DB ${rowKind} component ${componentId || '<empty>'}.`);
    }
    const group = grouped.get(componentId) || [];
    group.push(row);
    grouped.set(componentId, group);
  }
  return grouped;
}

function uniqueRowsByComponent(rows, knownComponentIds, rowKind) {
  const grouped = groupRowsByComponent(rows, knownComponentIds, rowKind);
  for (const [componentId, group] of grouped) {
    if (group.length > 1) {
      throw new Error(`Duplicate Planning DB ${rowKind} identity ${componentId}.`);
    }
  }
  return new Map([...grouped].map(([componentId, group]) => [componentId, group[0]]));
}

function componentDocumentLink(documentPath) {
  return path.posix.relative('docs/architecture', normalizeRepoPath(documentPath));
}

function buildComponentTopologyProjection(facts, options = {}) {
  const root = path.resolve(options.root || repoRoot);
  const gitSha = currentGitSha({ root, gitSha: options.gitSha });
  const gitTreePaths =
    options.gitTreePaths || readGitTreePaths({ root, gitSha, spawnSync: options.spawnSync });
  const gitTreeEntry = (sourcePath) => {
    const normalizedPath = normalizeRepoPath(sourcePath);
    const relativePath = toPosix(path.relative(root, path.resolve(root, normalizedPath)));
    if (
      !normalizedPath ||
      relativePath === '..' ||
      relativePath.startsWith('../') ||
      path.isAbsolute(relativePath)
    ) {
      return null;
    }
    return gitTreePaths.get(normalizedPath) || null;
  };
  const repositoryUrl = String(options.repositoryUrl || repositoryBrowserUrl()).replace(/\/$/u, '');
  const componentRows = [...(facts.components || [])];
  const componentById = new Map();
  for (const component of componentRows) {
    const componentId = String(component.component_id ?? component.componentId ?? '').trim();
    if (!componentId) throw new Error('Planning DB component identity cannot be empty.');
    if (componentById.has(componentId)) {
      throw new Error(`Duplicate Planning DB component identity ${componentId}.`);
    }
    componentById.set(componentId, component);
  }
  const knownComponentIds = new Set(componentById.keys());

  const relations = (facts.relations || [])
    .map((relation) => {
      const relationId = String(relation.relation_id ?? relation.relationId ?? '').trim();
      const sourceComponentId = String(
        relation.source_component_id ?? relation.sourceComponentId ?? ''
      ).trim();
      const targetComponentId = String(
        relation.target_component_id ?? relation.targetComponentId ?? ''
      ).trim();
      for (const endpoint of [sourceComponentId, targetComponentId]) {
        if (!knownComponentIds.has(endpoint)) {
          throw new Error(`Unknown Planning DB relation endpoint ${endpoint} in ${relationId}.`);
        }
      }
      return {
        direction: String(relation.direction || '-'),
        relationId,
        relationType: String(relation.relation_type ?? relation.relationType ?? '-'),
        sourceComponentId,
        status: String(relation.status || '-'),
        targetComponentId,
      };
    })
    .sort((left, right) =>
      [left.sourceComponentId, left.targetComponentId, left.relationType, left.relationId]
        .join('\0')
        .localeCompare(
          [
            right.sourceComponentId,
            right.targetComponentId,
            right.relationType,
            right.relationId,
          ].join('\0'),
          'en'
        )
    );
  const responsibilityByComponent = groupRowsByComponent(
    facts.responsibilities || [],
    knownComponentIds,
    'responsibility'
  );
  const observabilityByComponent = groupRowsByComponent(
    facts.observability || [],
    knownComponentIds,
    'observability'
  );
  const relationById = new Map(relations.map((relation) => [relation.relationId, relation]));
  const maturityByComponent = uniqueRowsByComponent(
    facts.maturity || [],
    knownComponentIds,
    'maturity'
  );
  const driftByComponent = groupRowsByComponent(
    facts.drift || [],
    knownComponentIds,
    'drift',
    (row) => {
      const subjectKind = String(row.subject_kind ?? row.subjectKind ?? '').trim();
      const subjectId = String(row.subject_id ?? row.subjectId ?? '').trim();
      if (subjectKind === 'component') return subjectId;
      if (subjectKind === 'relation') {
        const relation = relationById.get(subjectId);
        if (!relation) {
          throw new Error(`Unknown Planning DB drift relation ${subjectId || '<empty>'}.`);
        }
        return relation.sourceComponentId;
      }
      throw new Error(
        `Unsupported Planning DB drift subject kind ${subjectKind || '<empty>'} for ${subjectId || '<empty>'}.`
      );
    }
  );
  const currentDocuments = (facts.documents || []).filter(isCurrentCanonicalDocument);
  for (const document of currentDocuments) {
    const componentId = String(document.component_id ?? document.componentId ?? '').trim();
    const documentPath = normalizeRepoPath(document.document_path ?? document.documentPath ?? '');
    if (!documentPath.startsWith('docs/') || gitTreeEntry(documentPath) !== 'blob') {
      throw new Error(
        `Invalid canonical component document for ${componentId || '<empty>'}: ${documentPath || '<empty>'}.`
      );
    }
  }
  const orphanDocuments = currentDocuments.filter(
    (document) =>
      !knownComponentIds.has(String(document.component_id ?? document.componentId ?? '').trim())
  );
  const documentByComponent = groupRowsByComponent(
    currentDocuments.filter((document) =>
      knownComponentIds.has(String(document.component_id ?? document.componentId ?? '').trim())
    ),
    knownComponentIds,
    'canonical document'
  );

  const relationCounts = new Map(
    [...knownComponentIds].map((componentId) => [componentId, { inbound: 0, outbound: 0 }])
  );
  for (const relation of relations) {
    relationCounts.get(relation.sourceComponentId).outbound += 1;
    relationCounts.get(relation.targetComponentId).inbound += 1;
  }

  const components = [...componentById]
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([componentId, component]) => {
      const repositoryPath = normalizeRepoPath(component.repo_path ?? component.repoPath ?? '');
      const repositoryEntryType = gitTreeEntry(repositoryPath);
      const canonicalDocuments = (documentByComponent.get(componentId) || [])
        .map((document) => {
          const documentPath = normalizeRepoPath(
            document.document_path ?? document.documentPath ?? ''
          );
          return { documentPath, link: componentDocumentLink(documentPath) };
        })
        .sort((left, right) => left.documentPath.localeCompare(right.documentPath, 'en'));
      const responsibilities = (responsibilityByComponent.get(componentId) || [])
        .map((responsibility) => ({
          dddOwner: String(responsibility.ddd_owner ?? responsibility.dddOwner ?? '-'),
          responsibility: String(responsibility.responsibility || '-'),
          responsibilityId: String(
            responsibility.responsibility_id ?? responsibility.responsibilityId ?? '-'
          ),
          status: String(responsibility.status || '-'),
        }))
        .sort((left, right) => left.responsibilityId.localeCompare(right.responsibilityId, 'en'));
      const maturity = maturityByComponent.get(componentId);
      const observability = (observabilityByComponent.get(componentId) || [])
        .map((signal) => ({
          observabilityId: String(signal.observability_id ?? signal.observabilityId ?? '-'),
          required: Boolean(signal.required),
          signalKind: String(signal.signal_kind ?? signal.signalKind ?? '-'),
          signalName: String(signal.signal_name ?? signal.signalName ?? '-'),
          status: String(signal.status || '-'),
        }))
        .sort((left, right) => left.observabilityId.localeCompare(right.observabilityId, 'en'));
      const drift = (driftByComponent.get(componentId) || [])
        .map((row) => String(row.drift_code ?? row.driftCode ?? '-'))
        .sort((left, right) => left.localeCompare(right, 'en'));
      const gaps = [];
      if (!repositoryEntryType) gaps.push('missing-repository-path');
      if (canonicalDocuments.length === 0) gaps.push('missing-canonical-document');
      if (canonicalDocuments.length > 1) gaps.push('ambiguous-canonical-document');
      if (responsibilities.length === 0) gaps.push('missing-responsibility');
      if (!maturity) gaps.push('missing-maturity');
      return {
        canonicalDocuments,
        componentId,
        criticality: String(component.criticality || '-'),
        drift,
        gaps,
        kind: String(component.kind || '-'),
        layer: String(component.layer || '-'),
        maturityScore: maturity
          ? String(maturity.maturity_score ?? maturity.maturityScore ?? '-')
          : '-',
        name: String(component.name || componentId),
        owner: String(component.owner || '-'),
        observability,
        publicContract: String(component.public_contract ?? component.publicContract ?? '-'),
        relationCounts: relationCounts.get(componentId),
        repositoryLink: repositoryEntryType
          ? `${repositoryUrl}/${repositoryEntryType === 'tree' ? 'tree' : 'blob'}/${gitSha}/${encodeURI(repositoryPath)}`
          : null,
        repositoryPath: repositoryPath || '-',
        responsibilities,
        runtime: String(component.runtime || '-'),
        status: String(component.status || '-'),
      };
    });

  return {
    components,
    gapComponentCount: components.filter((component) => component.gaps.length > 0).length,
    gitSha,
    globalGaps: orphanDocuments
      .map((document) => {
        const componentId = String(document.component_id ?? document.componentId ?? '').trim();
        const documentPath = normalizeRepoPath(
          document.document_path ?? document.documentPath ?? ''
        );
        return `orphan-canonical-document-binding:${componentId}:${documentPath}`;
      })
      .sort((left, right) => left.localeCompare(right, 'en')),
    relationCount: relations.length,
    relations,
  };
}

function renderComponentMap(projection, utcDate) {
  const componentRows = projection.components.map((component) => [
    `\`${component.componentId}\`<br>${component.name}`,
    `${component.layer}<br>${component.kind}<br>${component.runtime}`,
    `${component.status}<br>maturity ${component.maturityScore}<br>${component.criticality}`,
    [component.owner, ...component.responsibilities.map((item) => item.responsibility)].join(
      '<br>'
    ),
    component.repositoryLink
      ? `[${component.repositoryPath}](${component.repositoryLink})`
      : `\`${component.repositoryPath}\``,
    component.canonicalDocuments.length > 0
      ? component.canonicalDocuments
          .map((document) => `[${document.documentPath}](${document.link})`)
          .join('<br>')
      : '-',
    `out ${component.relationCounts.outbound}<br>in ${component.relationCounts.inbound}`,
    component.drift.length > 0 ? component.drift.join('<br>') : 'none',
    component.observability.length > 0
      ? component.observability
          .map(
            (signal) =>
              `\`${signal.observabilityId}\`<br>${signal.signalKind}: ${signal.signalName}<br>${signal.status}${signal.required ? ' (required)' : ''}`
          )
          .join('<br>')
      : 'none',
    component.gaps.length > 0 ? component.gaps.join('<br>') : 'none',
  ]);
  const relationRows = projection.relations.map((relation) => [
    `\`${relation.relationId}\``,
    `${relation.sourceComponentId} → ${relation.targetComponentId}`,
    relation.relationType,
    relation.direction,
    relation.status,
  ]);

  return [
    '---',
    'title: Component Map',
    'status: Active',
    'owner: Architecture / Docs',
    `last_reviewed: ${utcDate}`,
    '---',
    '',
    '# DVT Component Map',
    '',
    'This is the current DB-first projection of registered DVT components and their exact directed relations.',
    'Planning DB is the current architecture and design authority; Git at the evaluated commit owns repository-path existence.',
    'Architecture and design consultation must use the Planning DB query rails. Authored pages are supporting context, not parallel current authority.',
    'This disposable page changes only when an operator explicitly requests generation; build, serve and CI do not regenerate it.',
    '',
    '## Current state',
    '',
    ...markdownTable(
      ['Metric', 'Value'],
      [
        ['Evaluated Git commit', `\`${projection.gitSha}\``],
        ['Registered components', String(projection.components.length)],
        ['Registered directed relations', String(projection.relationCount)],
        ['Components with explicit gaps', String(projection.gapComponentCount)],
        ['Projection-wide gaps', String(projection.globalGaps.length)],
        ['Component authority', '`architecture-components`'],
        ['Relation authority', '`architecture-relations`'],
        ['Responsibility authority', '`architecture-responsibilities`'],
        ['Observability authority', '`component-profile` / `architecture-components`'],
        ['Maturity authority', '`architecture-maturity`'],
      ]
    ),
    '',
    '## Projection-wide gaps',
    '',
    ...(projection.globalGaps.length > 0
      ? projection.globalGaps.map((gap) => `- \`${gap}\``)
      : ['- none']),
    '',
    '## Component catalog',
    '',
    ...markdownTable(
      [
        'Component',
        'Layer / kind / runtime',
        'Status / maturity / criticality',
        'Owner / registered responsibility',
        'Exact repository path',
        'Current canonical document',
        'Direct relations',
        'Drift',
        'Registered observability',
        'Gap',
      ],
      componentRows
    ),
    '',
    '## Directed relation topology',
    '',
    'Every row below is one registered Planning DB relation. The arrow is source → target; no edge is inferred from imports, folders, or vocabulary.',
    '',
    ...markdownTable(['Relation', 'Source → target', 'Type', 'Direction', 'Status'], relationRows),
    '',
    '## Reading rule',
    '',
    '- A missing repository path is reported; it is not replaced by a guessed file.',
    '- Zero or multiple current canonical documents are reported as explicit gaps.',
    '- Responsibilities, observability, maturity and drift appear only when registered by their owning read models.',
    '- Duplicate component identity, unknown relation endpoints, and invalid current document paths fail generation.',
    '',
    '## Related authored context',
    '',
    '- [Architecture Component Surfaces](./components/index.md)',
    '- [Reference Architecture](./reference-architecture.md)',
    '- [System Architecture](./system/index.md)',
    '- [System Delivery Status](./system-delivery-status.md)',
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

function resolveGenerationMode(argv) {
  const knownFlags = new Set([
    '--code-state-only',
    '--component-map-only',
    '--repository-map-only',
    '--system-delivery-status-only',
    '--check',
  ]);
  const unknownFlags = argv.filter(
    (argument) => argument.startsWith('--') && !knownFlags.has(argument)
  );
  if (unknownFlags.length > 0) {
    throw new Error(`Unknown generate-code-status option: ${unknownFlags.join(', ')}`);
  }
  const codeStateOnly = argv.includes('--code-state-only');
  const componentMapOnly = argv.includes('--component-map-only');
  const repositoryMapOnly = argv.includes('--repository-map-only');
  const systemDeliveryStatusOnly = argv.includes('--system-delivery-status-only');
  if (
    [codeStateOnly, componentMapOnly, repositoryMapOnly, systemDeliveryStatusOnly].filter(Boolean)
      .length > 1
  ) {
    throw new Error(
      'Choose either one generation mode: --code-state-only, --component-map-only, --repository-map-only, or --system-delivery-status-only.'
    );
  }
  if (codeStateOnly) return GENERATION_MODES.codeStateOnly;
  if (componentMapOnly) return GENERATION_MODES.componentMapOnly;
  if (repositoryMapOnly) return GENERATION_MODES.repositoryMapOnly;
  if (systemDeliveryStatusOnly) return GENERATION_MODES.systemDeliveryStatusOnly;
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

async function generateRepositoryMap(workspaces, ClientCtor) {
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
  } finally {
    await client.end();
  }
}

async function generateComponentMap(ClientCtor) {
  const client = new ClientCtor({ connectionString: databaseUrl() });
  await client.connect();
  try {
    const facts = await readComponentTopologyFacts(client);
    const projection = buildComponentTopologyProjection(facts);
    const date = resolveGeneratedDate(componentMapOutputPath, (value) =>
      renderComponentMap(projection, value)
    );
    const changed = writeIfChanged(componentMapOutputPath, renderComponentMap(projection, date));
    console.log(
      changed
        ? `[docs:status:generate] Updated ${relFromRepo(componentMapOutputPath)}`
        : `[docs:status:generate] ${relFromRepo(componentMapOutputPath)} already up to date.`
    );
  } finally {
    await client.end();
  }
}

async function generateSystemDeliveryStatus(workspaces, ClientCtor, evaluatedRepository) {
  const repositorySnapshot = evaluatedRepository || readEvaluatedRepositorySnapshot();
  const client = new ClientCtor({ connectionString: databaseUrl() });
  await client.connect();
  try {
    const facts = await readSystemDeliveryStatusFacts(client);
    const projection = buildSystemDeliveryStatusProjection(workspaces, facts, repositorySnapshot);
    assertEvaluatedRepositorySnapshot(repositorySnapshot);
    const date = resolveGeneratedDate(systemDeliveryStatusOutputPath, (value) =>
      renderSystemDeliveryStatus(projection, value)
    );
    const changed = writeIfChanged(
      systemDeliveryStatusOutputPath,
      renderSystemDeliveryStatus(projection, date)
    );
    console.log(
      changed
        ? `[docs:status:generate] Updated ${relFromRepo(systemDeliveryStatusOutputPath)}`
        : `[docs:status:generate] ${relFromRepo(systemDeliveryStatusOutputPath)} already up to date.`
    );
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
  const generateComponentMapFn =
    dependencies.generateComponentMap || (() => generateComponentMap(ClientCtor));
  const generateSystemDeliveryStatusFn =
    dependencies.generateSystemDeliveryStatus ||
    ((workspaces, evaluatedRepository) =>
      generateSystemDeliveryStatus(workspaces, ClientCtor, evaluatedRepository));
  const requiresSystemDeliveryStatus =
    mode === GENERATION_MODES.all || mode === GENERATION_MODES.systemDeliveryStatusOnly;
  const readRepositorySnapshot =
    dependencies.readEvaluatedRepositorySnapshot || readEvaluatedRepositorySnapshot;
  const evaluatedRepository = requiresSystemDeliveryStatus
    ? readRepositorySnapshot(dependencies.repositoryEvaluationOptions || {})
    : null;
  const workspaces =
    mode === GENERATION_MODES.componentMapOnly
      ? []
      : collectWorkspaces({
          ...(dependencies.workspaceOptions || {}),
          ...(requiresSystemDeliveryStatus
            ? {
                gitTreePaths: evaluatedRepository.gitTreePaths,
                root:
                  dependencies.workspaceOptions?.root ||
                  dependencies.repositoryEvaluationOptions?.root ||
                  repoRoot,
              }
            : {}),
        });

  if (mode === GENERATION_MODES.all || mode === GENERATION_MODES.codeStateOnly) {
    await generateCodeStateFn(workspaces);
  }
  if (mode === GENERATION_MODES.all || mode === GENERATION_MODES.repositoryMapOnly) {
    await generateRepositoryMapFn(workspaces);
  }
  if (mode === GENERATION_MODES.all || mode === GENERATION_MODES.componentMapOnly) {
    await generateComponentMapFn();
  }
  if (mode === GENERATION_MODES.all || mode === GENERATION_MODES.systemDeliveryStatusOnly) {
    await generateSystemDeliveryStatusFn(workspaces, evaluatedRepository);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  assertEvaluatedRepositorySnapshot,
  buildSystemDeliveryStatusProjection,
  buildComponentTopologyProjection,
  buildRepositoryMapRows,
  collectRepositoryWorkspaceStats,
  collectWorkspaceStats,
  isCurrentCanonicalDocument,
  listPnpmWorkspaceDirs,
  main,
  markdownCell,
  normalizeRepoPath,
  parsePnpmWorkspaceRows,
  readGitTreePaths,
  readArchitectureComponentDocumentRows,
  readComponentTopologyFacts,
  readEvaluatedRepositorySnapshot,
  readRepositoryArchitectureFacts,
  readRepositoryReleaseFacts,
  readSystemDeliveryStatusFacts,
  relativeDocLink,
  renderCodeState,
  renderComponentMap,
  renderRepositoryMap,
  renderSystemDeliveryStatus,
  resolveDocumentationProjection,
  resolveGenerationMode,
  resolveWorkspaceArchitecture,
};
