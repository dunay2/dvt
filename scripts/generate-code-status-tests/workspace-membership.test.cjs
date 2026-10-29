const { repoRoot } = require('./helpers.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  collectRepositoryWorkspaceStats,
  listPnpmWorkspaceDirs,
  parsePnpmWorkspaceRows,
} = require('../generate-code-status.cjs');
function createWorkspaceFixture(t, relativePath, packageName, options = {}) {
  const root = options.root || fs.mkdtempSync(path.join(os.tmpdir(), 'repository-map-'));
  if (!options.root) t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, ...relativePath.split('/'));
  fs.mkdirSync(path.join(directory, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(directory, 'package.json'),
    `${JSON.stringify({ name: packageName, scripts: { build: 'x', test: 'x', typecheck: 'x' } }, null, 2)}\n`,
    'utf8'
  );
  fs.writeFileSync(path.join(directory, 'src', 'index.ts'), 'export const value = 1;\n', 'utf8');
  if (options.readme) fs.writeFileSync(path.join(directory, 'README.md'), '# Local\n', 'utf8');
  return { root, directory };
}

test('pnpm workspace JSON is the sole membership input', () => {
  assert.deepEqual(parsePnpmWorkspaceRows('[{"path":"/repo"}]'), [{ path: '/repo' }]);
  assert.throws(() => parsePnpmWorkspaceRows('{}'), /JSON array/u);
  assert.throws(() => parsePnpmWorkspaceRows('not-json'), /Unable to parse/u);

  const outside = path.resolve(repoRoot, '..', 'outside');
  assert.throws(
    () =>
      listPnpmWorkspaceDirs({
        spawnSync: () => ({ status: 0, stdout: JSON.stringify([{ path: outside }]) }),
      }),
    /outside the repository/u
  );
});

test('effective membership can include non-standard layouts and exclude existing directories', (t) => {
  const first = createWorkspaceFixture(t, 'custom/alpha', '@fixture/alpha');
  const second = createWorkspaceFixture(t, 'legacy/beta', '@fixture/beta', { root: first.root });
  const ignored = createWorkspaceFixture(t, 'packages/ignored', '@fixture/ignored', {
    root: first.root,
  });

  const workspaces = collectRepositoryWorkspaceStats({
    workspaceDirs: [second.directory, first.directory],
  });
  assert.deepEqual(
    workspaces.map((workspace) => workspace.workspace),
    ['@fixture/beta', '@fixture/alpha']
  );
  assert.equal(
    workspaces.some((workspace) => workspace.workspace === '@fixture/ignored'),
    false
  );
  assert.ok(fs.existsSync(ignored.directory));
});

test('evaluated workspace facts exclude files absent from the Git tree', (t) => {
  const workspace = createWorkspaceFixture(t, 'apps/alpha', '@fixture/alpha');
  fs.mkdirSync(path.join(workspace.directory, 'src', 'tmp'), { recursive: true });
  fs.mkdirSync(path.join(workspace.directory, 'test', 'results'), { recursive: true });
  fs.writeFileSync(
    path.join(workspace.directory, 'src', 'tmp', 'ignored.ts'),
    'export const ignored = true;\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(workspace.directory, 'test', 'results', 'ignored.ts'),
    'export const ignoredTest = true;\n',
    'utf8'
  );

  const [facts] = collectRepositoryWorkspaceStats({
    root: workspace.root,
    workspaceDirs: [workspace.directory],
    gitTreePaths: new Map([
      ['apps/alpha', 'tree'],
      ['apps/alpha/package.json', 'blob'],
      ['apps/alpha/src', 'tree'],
      ['apps/alpha/src/index.ts', 'blob'],
    ]),
  });

  assert.equal(facts.src, 1);
  assert.equal(facts.tests, 0);
});

test('evaluated workspace membership rejects a package absent from the Git tree', (t) => {
  const workspace = createWorkspaceFixture(t, 'apps/tmp', '@fixture/ignored');

  assert.throws(
    () =>
      collectRepositoryWorkspaceStats({
        root: workspace.root,
        workspaceDirs: [workspace.directory],
        gitTreePaths: new Map(),
      }),
    /Workspace apps\/tmp is not part of the evaluated Git tree/u
  );
});

test('workspace add, rename, and removal are expressed only by effective membership', (t) => {
  const first = createWorkspaceFixture(t, 'alpha', '@fixture/alpha');
  const second = createWorkspaceFixture(t, 'beta', '@fixture/beta', { root: first.root });

  assert.deepEqual(
    collectRepositoryWorkspaceStats({ workspaceDirs: [first.directory, second.directory] }).map(
      (workspace) => workspace.workspace
    ),
    ['@fixture/alpha', '@fixture/beta']
  );
  const renamed = path.join(first.root, 'gamma');
  fs.renameSync(first.directory, renamed);
  assert.deepEqual(
    collectRepositoryWorkspaceStats({ workspaceDirs: [renamed] }).map(
      (workspace) => workspace.workspace
    ),
    ['@fixture/alpha']
  );
  assert.equal(
    collectRepositoryWorkspaceStats({ workspaceDirs: [] }).some(
      (workspace) => workspace.workspace === '@fixture/beta'
    ),
    false
  );
});

test('pnpm workspace rules drive real add, rename, exclusion, and removal fixtures', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repository-map-pnpm-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(
    path.join(root, 'package.json'),
    `${JSON.stringify({ name: 'fixture-root', private: true }, null, 2)}\n`,
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, 'pnpm-workspace.yaml'),
    "packages:\n  - 'apps/*'\n  - 'packages/*'\n  - '!packages/excluded'\n",
    'utf8'
  );
  const alpha = createWorkspaceFixture(t, 'apps/alpha', '@fixture/alpha', { root });
  const beta = createWorkspaceFixture(t, 'packages/beta', '@fixture/beta', { root });
  createWorkspaceFixture(t, 'packages/excluded', '@fixture/excluded', { root });

  const selectedPaths = () =>
    listPnpmWorkspaceDirs({ root }).map(
      (directory) => path.relative(root, directory).split(path.sep).join('/') || '.'
    );
  assert.deepEqual(selectedPaths(), ['.', 'apps/alpha', 'packages/beta']);

  const renamed = path.join(root, 'apps', 'renamed');
  fs.renameSync(alpha.directory, renamed);
  assert.deepEqual(selectedPaths(), ['.', 'apps/renamed', 'packages/beta']);

  fs.rmSync(beta.directory, { recursive: true, force: true });
  assert.deepEqual(selectedPaths(), ['.', 'apps/renamed']);
});

test('the effective pnpm root is rendered as an explicit repository workspace', () => {
  assert.deepEqual(
    collectRepositoryWorkspaceStats({ workspaceDirs: [repoRoot] }).map((workspace) => ({
      workspace: workspace.workspace,
      path: workspace.path,
      kind: workspace.kind,
      localReadmePath: workspace.localReadmePath,
    })),
    [{ workspace: 'dvt', path: '.', kind: 'root', localReadmePath: 'README.md' }]
  );
});
