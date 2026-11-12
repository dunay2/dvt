/** Owned concern: prove hosted ownership preserves every local or delegated obligation. */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import test from 'node:test';

import { resolveHostedCiToolOwnership } from '../../scripts/lib/hosted-ci-tool-ownership.cjs';
import { buildCiToolTestList } from './ci-tool-test-suite.mjs';
import { main } from '../../scripts/verify-changed.cjs';
import { createGitRepositoryEnvironment } from '../../scripts/lib/git-repository-environment.cjs';

const baseSha = 'a'.repeat(40);
const headSha = 'b'.repeat(40);
const changedFiles = ['tools/ci/ci-tool-test-suite.mjs'];
const complete = { kind: 'test', command: 'pnpm', args: ['test:ci-tools'] };
const before = { kind: 'test', command: 'node', args: ['--test', 'scripts/other.test.cjs'] };
const after = { kind: 'test', command: 'pnpm', args: ['test:ci-tools:executable'] };
const plan = [before, complete, after];
const context = {
  version: 'v1',
  eventName: 'pull_request',
  baseSha,
  headSha,
  githubSha: headSha,
};
const comparison = { baseSha, headSha };

function snapshot(overrides = {}) {
  return {
    before: comparison,
    after: comparison,
    clean: true,
    changedFiles,
    scope: { ci_tool_executable_contracts_relevant: true },
    catalog: { all: ['one', 'two'], static: ['one'], executable: ['two'] },
    ...overrides,
  };
}

function resolve({ input = context, observed = snapshot(), steps = plan, readSnapshot } = {}) {
  return resolveHostedCiToolOwnership(steps, changedFiles, input, {
    readSnapshot: readSnapshot ?? (async () => observed),
  });
}

test('same-snapshot complete ownership delegates one exact step and preserves all others', async () => {
  const original = structuredClone(plan);
  const result = await resolve();
  assert.deepEqual(result.plan, [before, after]);
  assert.equal(result.plan[0], before);
  assert.equal(result.plan[1], after);
  assert.deepEqual(plan, original);
  assert.deepEqual(result.delegation, {
    status: 'delegated',
    producer: 'Code Quality Required for Merge',
    baseSha,
    headSha,
    members: ['one', 'two'],
  });
  assert.equal(Object.hasOwn(result.delegation, 'passed'), false);
});

test('unsupported or missing PR context retains the original plan before querying', async () => {
  for (const input of [
    undefined,
    {},
    { ...context, version: 'v2' },
    { ...context, eventName: 'push' },
    { ...context, baseSha: 'origin/main' },
    { ...context, headSha: 'HEAD' },
    { ...context, githubSha: baseSha },
  ]) {
    const result = await resolveHostedCiToolOwnership(plan, changedFiles, input, {
      readSnapshot: () => assert.fail('unadmitted context must not query'),
    });
    assert.equal(result.plan, plan);
    assert.equal(result.delegation.status, 'retained');
    assert.ok(result.delegation.reason);
  }
});

test('unknown or changed Git state and unmatched frontiers retain the complete execution', async () => {
  for (const observed of [
    snapshot({ clean: false }),
    snapshot({ before: { ...comparison, baseSha: headSha } }),
    snapshot({ before: { ...comparison, headSha: baseSha } }),
    snapshot({ after: { ...comparison, headSha: baseSha } }),
    snapshot({ changedFiles: [...changedFiles, 'deleted.cjs'] }),
    snapshot({ changedFiles: [] }),
    snapshot({ scope: { ci_tool_executable_contracts_relevant: false } }),
    snapshot({ scope: { ci_tool_executable_contracts_relevant: 'true' } }),
    snapshot({ scope: {} }),
  ]) {
    const result = await resolve({ observed });
    assert.equal(result.plan, plan);
    assert.equal(result.delegation.status, 'retained');
    assert.ok(result.delegation.reason);
  }
});

test('ancestry, scope and snapshot query failures remain visible and retain coverage', async () => {
  const result = await resolve({
    readSnapshot: async () => {
      throw new Error('unknown ancestry');
    },
  });
  assert.equal(result.plan, plan);
  assert.equal(result.delegation.status, 'retained');
  assert.match(result.delegation.reason, /unknown ancestry/);
});

test('missing, duplicate, overlapping or foreign partition members cannot admit delegation', async () => {
  for (const catalog of [
    { all: [], static: [], executable: [] },
    { all: ['one', 'two'], static: ['one'], executable: [] },
    { all: ['one'], static: ['one'], executable: ['one'] },
    { all: ['one'], static: [], executable: ['foreign'] },
    { all: ['one', 'one'], static: ['one'], executable: [] },
    { all: ['one'], static: ['one', 'one'], executable: [] },
  ]) {
    const result = await resolve({ observed: snapshot({ catalog }) });
    assert.equal(result.plan, plan);
    assert.equal(result.delegation.status, 'retained');
  }
});

test('filtered, direct and repeated complete commands are never silently removed', async () => {
  for (const steps of [
    [before, after],
    [{ ...complete, args: ['test:ci-tools', '--filtered'] }],
    [{ ...complete, kind: 'static' }],
    [complete, complete],
    [{ kind: 'test', command: 'node', args: ['--test', 'tools/ci/example.test.mjs'] }],
  ]) {
    const result = await resolve({ steps });
    assert.equal(result.plan, steps);
    assert.equal(result.delegation.status, 'retained');
  }
});

test('real single catalog remains the complete disjoint producer membership', async () => {
  const catalog = Object.fromEntries(
    ['all', 'static', 'executable'].map((mode) => [mode, buildCiToolTestList(mode)])
  );
  const result = await resolve({ observed: snapshot({ catalog }) });
  assert.deepEqual(result.delegation.members, catalog.all);
  assert.equal(new Set([...catalog.static, ...catalog.executable]).size, catalog.all.length);
});

test('CLI reports delegation while executing and preserving failures from uncovered tests', async () => {
  let printed;
  const result = await main(['--committed-tests', '--hosted-ci-tools=v1'], {
    env: {
      GIT_BASE: baseSha,
      GIT_HEAD: headSha,
      GITHUB_SHA: headSha,
      GITHUB_EVENT_NAME: 'pull_request',
    },
    listCommittedChangedFiles: () => [...changedFiles, 'scripts/verify-changed.cjs'],
    resolveHostedCiToolOwnership: (steps, files, input) =>
      resolveHostedCiToolOwnership(steps, files, input, {
        readSnapshot: async () => snapshot({ changedFiles: files }),
      }),
    printPlan: (_files, _steps, metadata) => {
      printed = metadata;
    },
    executeFocusedChangedTestPlan: (steps) => {
      assert.ok(steps.some((step) => step.args.includes('scripts/verify-changed.test.cjs')));
      assert.ok(steps.every((step) => !step.args.includes('test:ci-tools')));
      return 7;
    },
  });
  assert.equal(result, 7);
  assert.equal(printed.ciToolOwnership.status, 'delegated');
});

test('scope queries cannot read a different repository through their implicit cwd', async () => {
  const result = await resolveHostedCiToolOwnership(plan, changedFiles, context, {
    repoRootPath: '..',
    readSnapshot: () => assert.fail('wrong repository must retain execution before reading'),
  });
  assert.equal(result.plan, plan);
  assert.match(result.delegation.reason, /repository root/);
});

test('inherited repository-local Git context retains coverage before snapshot queries', () => {
  const moduleUrl = new URL('../../scripts/lib/hosted-ci-tool-ownership.cjs', import.meta.url).href;
  const child = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import { resolveHostedCiToolOwnership as resolve } from ${JSON.stringify(moduleUrl)};
    const result = await resolve(${JSON.stringify(plan)}, [], ${JSON.stringify(context)}, {
      readSnapshot: () => { throw new Error('unexpected snapshot query'); }
    });
    console.log(JSON.stringify(result.delegation));
  `,
    ],
    { env: { ...process.env, GIT_DIR: 'foreign-repository' }, encoding: 'utf8' }
  );
  assert.equal(child.status, 0, child.stderr);
  assert.match(JSON.parse(child.stdout).reason, /Repository-local Git environment/);
});

test('real default reader retains a reflexive Git frontier without an executable producer', async () => {
  const current = execFileSync('git', ['rev-parse', 'HEAD'], {
    env: createGitRepositoryEnvironment(),
    encoding: 'utf8',
  }).trim();
  const result = await resolveHostedCiToolOwnership(plan, [], {
    ...context,
    baseSha: current,
    headSha: current,
    githubSha: current,
  });
  assert.equal(result.plan, plan);
  assert.match(
    result.delegation.reason,
    /Git snapshot is dirty|Required executable producer is not selected|Repository-local Git environment/
  );
});
