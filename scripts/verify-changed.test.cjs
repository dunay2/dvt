/**
 * Owned concern: prove the changed-slice CLI awaits execution and never stamps failed or partial runs.
 * @baseline Local Changed Files Gate: preserve each selected contract and failure boundary.
 * @decision Move existing assertions with their concrete owner instead of copying routing data.
 * @consequence Partial selection cannot hide lost coverage or acceptance obligations.
 * @version 1.0.0
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { buildVerifyChangedPlan } = require('./local-validation-plan.cjs');

const { commandLabel } = require('./lib/local-validation-plan-values.cjs');
const catalogTest = 'node --test tools/ci/repository-command-catalog.test.mjs';
const cryptoTest =
  'node --test --test-name-pattern=tooling crypto mechanics tools/ci/architecture-dependency-guard.test.mjs';

const MIXED_CHANGED_FILES = [
  'apps/web/src/testing/vitestSuites.architecture.test.ts',
  'tools/planning-db/schema/manifest.cjs',
  'scripts/local-validation-plan.cjs',
  'scripts/check-changed.cjs',
];

const { main, parseArgs, executeVerifyChangedPlan } = require('./verify-changed.cjs');
function completedChild(code) {
  const child = new EventEmitter();
  queueMicrotask(() => {
    child.exitCode = code;
    child.emit('exit', code, null);
  });
  return child;
}

test('main executes every gate once before building and writing the success stamp', async () => {
  const plan = buildVerifyChangedPlan(MIXED_CHANGED_FILES);
  const events = [];
  const stamps = [];
  const status = await main([], {
    changedFiles: MIXED_CHANGED_FILES,
    executeVerifyChangedPlan: (steps, options) =>
      executeVerifyChangedPlan(steps, {
        ...options,
        spawn: (command, args, spawnOptions) => {
          assert.ok(Number(spawnOptions.env.DVT_VALIDATION_DEADLINE_MS) > Date.now());
          events.push(commandLabel({ command, args }));
          return completedChild(0);
        },
      }),
    printPlan: () => {},
    buildPrepushStamp: (files) => {
      events.push('build-stamp');
      return {
        validationLevel: 'default',
        changedFiles: files,
        stateFingerprint: 'same-tree',
      };
    },
    writePrepushStamp: (stamp) => {
      events.push('write-stamp');
      stamps.push(stamp);
    },
  });

  assert.equal(status, 0);
  assert.deepEqual(events, [...plan.map(commandLabel), 'build-stamp', 'write-stamp']);
  assert.deepEqual(stamps, [
    {
      validationLevel: 'default',
      changedFiles: MIXED_CHANGED_FILES,
      stateFingerprint: 'same-tree',
    },
  ]);
});

test('main preserves static failure without running any tests, later gates or stamp operations', async () => {
  const plan = buildVerifyChangedPlan(MIXED_CHANGED_FILES);
  const calls = [];
  const status = await main([], {
    changedFiles: MIXED_CHANGED_FILES,
    executeVerifyChangedPlan: (steps, options) =>
      executeVerifyChangedPlan(steps, {
        ...options,
        spawn: (command, args) => {
          const label = commandLabel({ command, args });
          calls.push(label);
          return completedChild(label === 'node scripts/check-changed.cjs' ? 7 : 0);
        },
      }),
    printPlan: () => {},
    buildPrepushStamp: () => assert.fail('Failed validation must not build a stamp'),
    writePrepushStamp: () => assert.fail('Failed validation must not write a stamp'),
  });

  assert.equal(status, 7);
  const failedIndex = plan.findIndex((step) => step.id === 'check-changed');
  assert.deepEqual(calls, plan.slice(0, failedIndex + 1).map(commandLabel));
  assert.deepEqual(
    plan.filter((step) => step.kind === 'test' && calls.includes(commandLabel(step))),
    []
  );
});

test('a selected CI contract failure starts no Web tests and writes no validation stamp', async () => {
  const calls = [];
  const status = await main([], {
    changedFiles: [
      'docs/architecture/components/web/code-workbench-workspace-files-component.md',
      'apps/web/src/app/views/CodeView.tsx',
    ],
    executeVerifyChangedPlan: (steps, options) =>
      executeVerifyChangedPlan(steps, {
        ...options,
        spawn: (command, args) => {
          calls.push(commandLabel({ command, args }));
          return completedChild(args.includes('tools/ci/docs-disposition-canon.test.mjs') ? 11 : 0);
        },
      }),
    printPlan: () => {},
    buildPrepushStamp: () => assert.fail('Failed CI contract must not build a stamp'),
    writePrepushStamp: () => assert.fail('Failed CI contract must not write a stamp'),
  });
  assert.equal(status, 11);
  assert.ok(calls.includes('node --test tools/ci/docs-disposition-canon.test.mjs'));
  assert.ok(!calls.includes('pnpm test:web:changed'));
});

test('main runs focused tests from the exact committed diff without writing a local stamp', async () => {
  const calls = [];
  const stamps = [];
  const status = await main(['--committed-tests'], {
    listCommittedChangedFiles: () => ['scripts/planning-db-query.cjs'],
    executeFocusedChangedTestPlan: (plan) => {
      calls.push(...plan.map(commandLabel));
      return 0;
    },
    printPlan: () => {},
    writePrepushStamp: (stamp) => stamps.push(stamp),
  });

  assert.equal(status, 0);
  assert.deepEqual(calls, [
    'node --test scripts/planning-db-query.test.cjs',
    catalogTest,
    cryptoTest,
  ]);
  assert.deepEqual(stamps, []);
});

test('parseArgs supports dry-run planning without executing commands', () => {
  assert.deepEqual(parseArgs(['--dry-run']), { dryRun: true, committedTests: false });
  assert.deepEqual(parseArgs(['--committed-tests']), {
    dryRun: false,
    committedTests: true,
  });
  assert.throws(() => parseArgs(['--unknown']), /Unknown argument: --unknown/);
});

test('iteration CLI resolves and strictly reads one delta, prints its partial scope and never stamps', async () => {
  const baseSha = 'a'.repeat(40);
  const headSha = 'b'.repeat(40);
  const events = [];
  const before = { ...process.env };
  const status = await main(['--iteration-base=origin/main'], {
    repoRootPath: 'explicit-root',
    resolveIterationComparison: (options) => {
      events.push(['resolve', options]);
      return { baseSha, headSha };
    },
    listLocalChangedFiles: (options) => {
      events.push(['read', options]);
      return ['apps/web/src/example.ts'];
    },
    printPlan: (_files, _plan, context) => events.push(['print', context]),
    executeVerifyChangedPlan: async (steps, options) => {
      events.push(['execute', options]);
      assert.ok(steps.some((step) => step.args.includes('--phase=vitest')));
      return 0;
    },
    buildPrepushStamp: () => assert.fail('iteration cannot build acceptance evidence'),
    writePrepushStamp: () => assert.fail('iteration cannot write acceptance evidence'),
  });
  assert.equal(status, 0);
  assert.deepEqual(
    events.map(([name]) => name),
    ['resolve', 'read', 'print', 'execute']
  );
  assert.deepEqual(events[1][1], {
    strict: true,
    baseRef: baseSha,
    headRef: headSha,
    repoRootPath: 'explicit-root',
  });
  assert.equal(events[2][1].mode, 'iteration-partial');
  assert.equal(events[2][1].globalPlanningDbValidation, false);
  assert.equal(events[2][1].baseSha, baseSha);
  assert.equal(events[2][1].headSha, headSha);
  assert.equal(events[3][1].env.GIT_BASE, baseSha);
  assert.equal(events[3][1].env.GIT_HEAD, '');
  assert.deepEqual({ ...process.env }, before);
});

test('iteration CLI rejects ambiguous flags and failed Git evidence before executing', async () => {
  for (const argv of [
    ['--iteration-base='],
    ['--iteration-base=HEAD', '--committed-tests'],
    ['--iteration-base=HEAD', '--iteration-base=HEAD'],
  ])
    assert.throws(() => parseArgs(argv), /iteration|combined/);
  await assert.rejects(
    main(['--iteration-base=missing'], {
      resolveIterationComparison: () => {
        throw new Error('missing comparison');
      },
      executeVerifyChangedPlan: () => assert.fail('unknown comparison cannot execute'),
    }),
    /missing comparison/
  );
});
