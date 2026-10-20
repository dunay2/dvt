import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

import yaml from 'js-yaml';

const nativeProofCommand =
  'pnpm --filter @dvt/web test:e2e:native --browser chrome --spec cypress/e2e/canvas/canvas-large-graph.nightly.cy.ts';
const workflow = yaml.load(readFileSync('.github/workflows/web-canvas-nightly.yml', 'utf8'));

function assertNativeProof(steps) {
  const proofs = steps.filter(({ run }) => run?.includes('test:e2e:native'));
  assert.equal(proofs.length, 1, 'exactly one native proof must run');
  assert.equal(proofs[0].run.trim(), nativeProofCommand, 'the native proof command must be exact');
  assert.equal(proofs[0].if, undefined, 'the native proof must not be conditional');
  assert.notEqual(proofs[0]['continue-on-error'], true, 'proof failure must fail the job');
}

test('Canvas nightly owns a scheduled, pinned, provider-free native proof and failure reporting', () => {
  assert.deepEqual(Object.keys(workflow.on).sort(), ['schedule', 'workflow_dispatch']);
  assert.deepEqual(workflow.on.schedule, [{ cron: '30 3 * * *' }]);
  assert.deepEqual(workflow.permissions, { contents: 'read', issues: 'write' });
  assert.match(workflow.concurrency.group, /web-canvas-nightly/u);
  assert.equal(workflow.concurrency['cancel-in-progress'], true);
  assert.deepEqual(Object.keys(workflow.jobs), ['canvas-large-graph']);
  const job = workflow.jobs['canvas-large-graph'];
  assert.equal(job.services, undefined);
  assert.equal(job['timeout-minutes'], 20);
  assertNativeProof(job.steps);
  assert.ok(job.steps.every((step) => step['continue-on-error'] !== true));
  assert.ok(job.steps.some(({ uses }) => uses === './.github/actions/setup-node-pnpm'));
  for (const { uses } of job.steps) {
    if (uses && !uses.startsWith('./')) assert.match(uses, /@[a-f\d]{40}$/u);
  }
  assert.equal(job.steps.filter(({ uses }) => uses?.startsWith('actions/checkout@')).length, 1);
  const uploads = job.steps.filter(({ uses }) => uses?.startsWith('actions/upload-artifact@'));
  assert.equal(uploads.length, 1);
  assert.equal(uploads[0].if, 'failure() || cancelled()');
  assert.equal(uploads[0].with.path, '.dvt/evidence/selected-closure/screenshots');
  const notifications = job.steps.filter(({ run }) => run?.includes('gh issue create'));
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].if, 'failure()');
  assert.match(notifications[0].run, /gh issue create --title "\$\{NIGHTLY_ISSUE_TITLE\}"/u);
  assert.match(notifications[0].run, /gh issue comment/u);
});

test('native proof accepts equivalent one-line and folded YAML scalars', () => {
  for (const source of [
    `- run: ${nativeProofCommand}`,
    '- run: >-\n    pnpm --filter @dvt/web test:e2e:native --browser chrome --spec\n    cypress/e2e/canvas/canvas-large-graph.nightly.cy.ts',
  ]) {
    assert.doesNotThrow(() => assertNativeProof(yaml.load(source)));
  }
});

for (const [name, steps, reason] of [
  ['missing proof', [], /exactly one native proof/u],
  [
    'duplicate proof',
    [{ run: nativeProofCommand }, { run: nativeProofCommand }],
    /exactly one native proof/u,
  ],
  [
    'wrong spec',
    [
      {
        run: nativeProofCommand.replace(
          'canvas-large-graph.nightly',
          'canvas-ready-node-authoring'
        ),
      },
    ],
    /command must be exact/u,
  ],
  ['appended shell command', [{ run: `${nativeProofCommand} && true` }], /command must be exact/u],
  ['conditional proof', [{ run: nativeProofCommand, if: 'false' }], /must not be conditional/u],
  [
    'ignored proof failure',
    [{ run: nativeProofCommand, 'continue-on-error': true }],
    /failure must fail/u,
  ],
]) {
  test(`native proof rejects ${name}`, () => {
    assert.throws(() => assertNativeProof(steps), reason);
  });
}

test('native proof rejects literal YAML newlines that would split the shell command', () => {
  const steps = yaml.load(
    '- run: |\n    pnpm --filter @dvt/web test:e2e:native --browser chrome --spec\n    cypress/e2e/canvas/canvas-large-graph.nightly.cy.ts'
  );
  assert.throws(() => assertNativeProof(steps), /command must be exact/u);
});

test('Canvas nightly explicitly builds its dependency graph before native proof even under DVT_CI', () => {
  const job = workflow.jobs['canvas-large-graph'];
  const buildOwner = 'scripts/run-turbo-workspace-task.cjs';
  const buildIndex = job.steps.findIndex(({ run }) => run?.startsWith(`node ${buildOwner} `));
  const proofIndex = job.steps.findIndex(({ run }) => run?.includes('test:e2e:native'));
  assert.ok(
    buildIndex >= 0 && buildIndex < proofIndex,
    'explicit dependency build precedes native proof'
  );
  const build = job.steps[buildIndex];
  assert.equal(build.if, undefined);
  assert.notEqual(build['continue-on-error'], true);
  assert.equal(job.env.DVT_CI, '1');
  const canonical = yaml.load(readFileSync('.github/workflows/test.yml', 'utf8'));
  assert.ok(
    Object.values(canonical.jobs).some(({ steps }) => steps?.some(({ run }) => run === build.run))
  );

  const calls = [];
  const module = { exports: {} };
  runInNewContext(readFileSync(buildOwner, 'utf8'), {
    module,
    console,
    require(specifier) {
      assert.equal(specifier, 'node:child_process');
      return {
        spawnSync(command, args, options) {
          calls.push({ command, args: Array.from(args), env: options.env });
          return { status: 0 };
        },
      };
    },
  });
  assert.equal(module.exports.main(build.run.trim().split(/\s+/u).slice(2), job.env), 0);
  assert.deepEqual(calls, [
    {
      command: 'pnpm',
      args: ['exec', 'turbo', 'run', 'build', '--filter=@dvt/web^...'],
      env: job.env,
    },
  ]);
});
