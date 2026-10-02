/** Owned concern: prove test-process Git isolation against disposable real repositories. */
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const {
  buildPrepushPlan,
  buildVerifyChangedPlan,
  executeCommandPlan,
} = require('../local-validation-plan.cjs');

const repoRoot = path.resolve(__dirname, '../..');
const launcher = path.join(repoRoot, 'scripts/local-validation-plan.cjs');

function sandbox(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-git-isolation-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const sentinel = path.join(root, 'sentinel');
  fs.mkdirSync(sentinel);
  // Bootstrap must not trust the implementation being tested or any caller Git variable.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) => !name.toUpperCase().startsWith('GIT_') && name !== 'NODE_TEST_CONTEXT'
    )
  );
  const git = (...args) =>
    execFileSync('git', args, { cwd: sentinel, env, encoding: 'utf8' }).trim();
  git('init', '--quiet', '--initial-branch=main');
  git('config', 'user.name', 'Git isolation sentinel');
  git('config', 'user.email', 'sentinel@example.invalid');
  fs.writeFileSync(path.join(sentinel, 'sentinel.txt'), 'Preserve this repository\n');
  git('add', 'sentinel.txt');
  const head = git('commit-tree', git('write-tree'), '-m', 'Sentinel');
  git('update-ref', 'HEAD', head);
  const snapshot = () =>
    ['HEAD', 'refs/heads/main', 'config', 'index'].map((file) =>
      fs.readFileSync(path.join(sentinel, '.git', file)).toString('base64')
    );
  return {
    root,
    snapshot,
    env: {
      ...env,
      GIT_DIR: path.join(sentinel, '.git'),
      GIT_COMMON_DIR: path.join(sentinel, '.git'),
      GIT_WORK_TREE: sentinel,
      GIT_INDEX_FILE: path.join(sentinel, '.git/index'),
      GIT_OBJECT_DIRECTORY: path.join(sentinel, '.git/objects'),
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'core.bare',
      GIT_CONFIG_VALUE_0: 'false',
      GIT_BASE: 'comparison-base',
      GIT_HEAD: 'comparison-head',
    },
  };
}

function runContaminatedPlan(root, plan, env, shell = true) {
  return spawnSync(
    process.execPath,
    [
      '-e',
      [
        `const { executeCommandPlan } = require(${JSON.stringify(launcher)});`,
        `process.exitCode = executeCommandPlan(${JSON.stringify(plan)},`,
        `{ repoRootPath: ${JSON.stringify(root)}, shell: ${JSON.stringify(shell)} });`,
      ].join('\n'),
    ],
    { cwd: root, env, encoding: 'utf8', timeout: 60000 }
  );
}

test('Git supplies the isolated variable set without changing the caller environment', () => {
  const { createGitRepositoryEnvironment } = require('./git-repository-environment.cjs');
  const parent = { ...process.env };
  const names = execFileSync('git', ['rev-parse', '--local-env-vars'], { encoding: 'utf8' })
    .trim()
    .split(/\r?\n/u);
  const inherited = {
    ...parent,
    GIT_BASE: 'base-ref',
    GIT_HEAD: 'head-ref',
    DVT_TEST_VALUE: 'keep',
  };
  for (const name of names) inherited[name] = 'foreign-context';
  inherited.GIT_CONFIG_KEY_0 = 'core.bare';
  inherited.GIT_CONFIG_VALUE_0 = 'true';
  const before = { ...inherited };
  const isolated = createGitRepositoryEnvironment(inherited);
  for (const name of names) assert.equal(isolated[name], undefined, name);
  assert.equal(isolated.GIT_CONFIG_KEY_0, undefined);
  assert.equal(isolated.GIT_CONFIG_VALUE_0, undefined);
  assert.equal(isolated.GIT_BASE, 'base-ref');
  assert.equal(isolated.GIT_HEAD, 'head-ref');
  assert.equal(isolated.DVT_TEST_VALUE, 'keep');
  assert.deepEqual(inherited, before);
  assert.deepEqual({ ...process.env }, parent);
});

test('Git discovery failure rejects instead of returning an unsafe environment', () => {
  const failure = new Error('Git executable unavailable');
  const module = { exports: {} };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, 'git-repository-environment.cjs'), 'utf8'),
    {
      module,
      require: (name) => {
        assert.equal(name, 'node:child_process');
        return {
          execFileSync: () => {
            throw failure;
          },
        };
      },
    }
  );
  assert.throws(
    () => module.exports.createGitRepositoryEnvironment({ GIT_DIR: 'foreign' }),
    (error) => error === failure
  );
});

test('real publication fixtures and assembler reads cannot mutate the hook repository', (t) => {
  const sentinel = sandbox(t);
  const before = sentinel.snapshot();
  const parent = { ...process.env };
  const plan = buildVerifyChangedPlan(['scripts/documentation-publication.cjs']).filter(
    (step) => step.id === 'test-documentation-publication'
  );
  assert.equal(plan.length, 1);
  const focusedPlan = plan.map((step) => ({
    ...step,
    args: [
      '--test',
      '--test-name-pattern=CRLF worktree content|source is deleted from the index|source is staged but absent from HEAD',
      ...step.args.slice(1),
    ],
  }));
  const result = runContaminatedPlan(repoRoot, focusedPlan, sentinel.env, false);
  assert.deepEqual(sentinel.snapshot(), before, 'sentinel HEAD, ref, config and index changed');
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /accepts CRLF worktree content/u);
  assert.match(result.stdout, /deleted from the index/u);
  assert.match(result.stdout, /staged but absent from HEAD/u);
  assert.match(result.stdout, /^# pass 3\r?$/mu);
  assert.match(result.stdout, /^# fail 0\r?$/mu);
  assert.deepEqual({ ...process.env }, parent);
});

test('a real pnpm test alias isolates all descendant Git commands', (t) => {
  const sentinel = sandbox(t);
  const fixture = path.join(sentinel.root, 'fixture');
  fs.mkdirSync(fixture);
  fs.writeFileSync(
    path.join(fixture, 'package.json'),
    JSON.stringify({
      private: true,
      scripts: { 'test:planning:db': 'node --test fixture.test.cjs' },
    })
  );
  fs.writeFileSync(
    path.join(fixture, 'fixture.test.cjs'),
    `
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const test = require('node:test');
test('Git writes belong to the fixture', () => {
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  git('init', '--quiet');
  git('config', 'user.name', 'Fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  fs.writeFileSync('fixture.txt', 'new fixture');
  git('add', 'fixture.txt');
  git('update-ref', 'HEAD', git('commit-tree', git('write-tree'), '-m', 'Fixture'));
  assert.equal(git('rev-parse', '--show-toplevel').replaceAll('\\\\', '/'), process.cwd().replaceAll('\\\\', '/'));
  assert.equal(git('ls-tree', '--name-only', 'HEAD'), 'fixture.txt');
  assert.equal(process.env.GIT_BASE, 'comparison-base');
  assert.equal(process.env.GIT_HEAD, 'comparison-head');
});
`
  );
  const plan = buildVerifyChangedPlan(['infra/planning-db/compose.yml']).filter(
    (step) => step.id === 'test-planning-db'
  );
  assert.equal(plan.length, 1);
  const before = sentinel.snapshot();
  const result = runContaminatedPlan(fixture, plan, sentinel.env);
  assert.deepEqual(sentinel.snapshot(), before, 'pnpm alias changed sentinel repository');
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(fs.existsSync(path.join(fixture, '.git', 'index')), true);
});

test('ordinary validation commands preserve the caller Git and index environment', () => {
  const before = { ...process.env };
  const files = ['apps/web/src/example.ts', 'scripts/local-validation-plan.cjs'];
  const plan = [...buildVerifyChangedPlan(files), ...buildPrepushPlan(files, { full: true })];
  const ordinary = plan.filter((step) =>
    ['feature-mechanization-implementation', 'lint-md-changed', 'type-check-prepush'].includes(
      step.id
    )
  );
  assert.ok(
    ordinary.some((step) => step.args.includes('docs:feature-mechanization:implementation'))
  );
  assert.ok(ordinary.some((step) => step.args.includes('lint:md:changed')));
  assert.ok(ordinary.some((step) => step.args.includes('scripts/type-check-prepush.cjs')));
  const seen = [];
  assert.equal(
    executeCommandPlan(ordinary, {
      spawn: (_command, _args, options) => {
        seen.push(options.env);
        return { status: 0 };
      },
    }),
    0
  );
  for (const env of seen) assert.ok(env === undefined || env === process.env);
  assert.deepEqual({ ...process.env }, before);
});

test('the canonical plan marks all test commands, including nested package aliases', () => {
  const files = [
    'scripts/documentation-publication.cjs',
    'scripts/lib/feature-mechanization-git-diff.cjs',
    'tools/ci/scope-config-git.test.mjs',
    'tools/ci/arc-policy-state-store.test.mjs',
    'infra/planning-db/compose.yml',
    'apps/web/src/example.ts',
    'scripts/local-validation-plan.cjs',
  ];
  const plan = [...buildVerifyChangedPlan(files), ...buildPrepushPlan(files, { full: true })];
  for (const step of plan) {
    const invokesTests =
      (step.command === 'node' && step.args.includes('--test')) ||
      (step.command === 'pnpm' && step.args[0].startsWith('test:'));
    assert.equal(step.kind === 'test', invokesTests, step.id);
  }
  for (const source of [
    'scripts/lib/git-repository-environment.cjs',
    'scripts/lib/git-repository-environment.test.cjs',
  ]) {
    const tests = buildVerifyChangedPlan([source]).filter((step) =>
      step.args.includes('scripts/lib/git-repository-environment.test.cjs')
    );
    assert.equal(tests.length, 1);
    assert.equal(tests[0].kind, 'test');
  }
});
