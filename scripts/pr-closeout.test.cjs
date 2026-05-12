/** Owned concern: prove the governed PR closeout command plan. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildPrCloseoutPlan,
  commandLabel,
  executePrCloseoutPlan,
  parseArgs,
  resolveCommandInvocation,
} = require('./pr-closeout.cjs');

function stepIds(plan) {
  return plan.map((step) => step.id);
}

function indexOf(ids, id) {
  const index = ids.indexOf(id);
  assert.ok(index >= 0, `Expected ${id} in ${ids.join(', ')}`);
  return index;
}

const commit = {
  type: 'chore',
  scope: 'ci',
  subject: 'Mechanize PR closeout',
};

test('buildPrCloseoutPlan commits before the only full prepush validation and push', () => {
  const plan = buildPrCloseoutPlan({
    changedFiles: ['package.json', 'scripts/pr-closeout.cjs'],
    stagedFiles: ['package.json', 'scripts/pr-closeout.cjs'],
    commit,
    push: true,
  });
  const ids = stepIds(plan);

  assert.ok(indexOf(ids, 'governance-refresh') < indexOf(ids, 'commit'));
  assert.ok(indexOf(ids, 'governance-refresh') < indexOf(ids, 'assert-no-unstaged'));
  assert.ok(indexOf(ids, 'assert-no-unstaged') < indexOf(ids, 'commit'));
  assert.ok(indexOf(ids, 'commit') < indexOf(ids, 'verify-prepush'));
  assert.ok(indexOf(ids, 'verify-prepush') < indexOf(ids, 'push'));
  assert.equal(ids.filter((id) => id === 'verify-prepush').length, 1);
  assert.equal(
    commandLabel(plan.find((step) => step.id === 'commit')),
    'pnpm commit chore ci "Mechanize PR closeout"'
  );
});

test('buildPrCloseoutPlan refuses implicit commits with no staged files', () => {
  assert.throws(
    () =>
      buildPrCloseoutPlan({
        changedFiles: ['scripts/pr-closeout.cjs'],
        stagedFiles: [],
        commit,
      }),
    /NO_STAGED_FILES/
  );
});

test('buildPrCloseoutPlan can stage all local changes explicitly before commit', () => {
  const plan = buildPrCloseoutPlan({
    changedFiles: ['scripts/pr-closeout.cjs'],
    stagedFiles: [],
    commit,
    stageAll: true,
  });
  const ids = stepIds(plan);

  assert.ok(indexOf(ids, 'stage-all') < indexOf(ids, 'commit'));
  assert.equal(ids.includes('assert-no-unstaged'), false);
});

test('buildPrCloseoutPlan prepares docs and generated code status before commit when needed', () => {
  const plan = buildPrCloseoutPlan({
    changedFiles: [
      'docs/runbooks/governed-changed-slice-closeout-20260506.md',
      'packages/@dvt/engine/src/WorkflowEngine.ts',
    ],
    stagedFiles: [
      'docs/runbooks/governed-changed-slice-closeout-20260506.md',
      'packages/@dvt/engine/src/WorkflowEngine.ts',
    ],
    commit,
  });
  const ids = stepIds(plan);

  assert.ok(indexOf(ids, 'docs-sync') < indexOf(ids, 'commit'));
  assert.ok(indexOf(ids, 'docs-status-generate') < indexOf(ids, 'commit'));
  assert.ok(indexOf(ids, 'docs-status-generate') < indexOf(ids, 'assert-no-unstaged'));
  assert.ok(indexOf(ids, 'assert-no-unstaged') < indexOf(ids, 'commit'));
});

test('buildPrCloseoutPlan refreshes governance for mandatory planning proposals', () => {
  const plan = buildPrCloseoutPlan({
    changedFiles: [
      'docs/planning/proposals/mandatory/governance-and-docs/governed-changed-slice-closeout-plan-20260506.md',
    ],
    stagedFiles: [
      'docs/planning/proposals/mandatory/governance-and-docs/governed-changed-slice-closeout-plan-20260506.md',
    ],
    commit,
  });
  const ids = stepIds(plan);

  assert.ok(indexOf(ids, 'governance-refresh') < indexOf(ids, 'commit'));
});

test('executePrCloseoutPlan fails staged-file mode if prep leaves unstaged files', () => {
  const plan = buildPrCloseoutPlan({
    changedFiles: ['docs/runbooks/governed-changed-slice-closeout-20260506.md'],
    stagedFiles: ['docs/runbooks/governed-changed-slice-closeout-20260506.md'],
    commit,
  });
  const calls = [];
  let unstagedFiles = [];

  assert.throws(
    () =>
      executePrCloseoutPlan(plan, {
        spawnCommand: (command, args) => {
          calls.push([command, ...args].join(' '));
          if (args.includes('docs:sync')) {
            unstagedFiles = ['docs/index.md'];
          }
          return { status: 0 };
        },
        listUnstagedFiles: () => unstagedFiles,
      }),
    /UNSTAGED_CHANGES_AFTER_PREP[\s\S]*docs\/index\.md/u
  );

  assert.equal(calls[0].endsWith(' docs:sync'), true);
  assert.equal(
    calls.some((call) => call.includes(' commit ')),
    false
  );
});

test('parseArgs exposes commit, stage, push, dry-run, and custom check intent', () => {
  assert.deepEqual(
    parseArgs([
      'chore',
      'ci',
      'Mechanize PR closeout',
      '--stage-all',
      '--push',
      '--dry-run',
      '--check',
      'pnpm test:pr-closeout',
    ]),
    {
      commit,
      dryRun: true,
      push: true,
      stageAll: true,
      checks: ['pnpm test:pr-closeout'],
    }
  );
});

test('executePrCloseoutPlan preserves commit subjects with spaces as one argv item', () => {
  const calls = [];

  executePrCloseoutPlan(
    [
      {
        id: 'commit',
        command: 'pnpm',
        args: ['commit', 'chore', 'ci', 'Mechanize PR closeout rail'],
      },
    ],
    {
      spawnCommand: (command, args, options) => {
        calls.push({ command, args, options });
        return { status: 0 };
      },
    }
  );

  const commitArgIndex = calls[0].args.indexOf('commit');
  assert.ok(commitArgIndex >= 0, `Expected commit argv in ${calls[0].args.join(' ')}`);
  assert.deepEqual(calls[0].args.slice(commitArgIndex), [
    'commit',
    'chore',
    'ci',
    'Mechanize PR closeout rail',
  ]);
  assert.equal(calls[0].options.shell, false);
});

test('resolveCommandInvocation launches pnpm through node on Windows', () => {
  const invocation = resolveCommandInvocation(
    'pnpm',
    ['commit', 'chore', 'ci', 'Mechanize PR closeout rail'],
    {
      platform: 'win32',
      pnpmCliPath: 'C:/tools/pnpm/bin/pnpm.cjs',
    }
  );

  assert.equal(invocation.command, process.execPath);
  assert.deepEqual(invocation.args, [
    'C:/tools/pnpm/bin/pnpm.cjs',
    'commit',
    'chore',
    'ci',
    'Mechanize PR closeout rail',
  ]);
  assert.equal(invocation.shell, false);
});

test('package scripts expose the PR closeout rail and its regression suite', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8')
  );

  assert.equal(packageJson.scripts['pr:closeout'], 'node scripts/pr-closeout.cjs');
  assert.equal(packageJson.scripts['test:pr-closeout'], 'node --test scripts/pr-closeout.test.cjs');
});
