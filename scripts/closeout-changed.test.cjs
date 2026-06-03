/** Owned concern: prove the governed changed-slice closeout command plan. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  assertNoConflictMarkers,
  buildCloseoutPlan,
  commandLabel,
  executeCloseoutPlan,
  listCloseoutChangedFiles,
  readChangedTextFiles,
} = require('./closeout-changed.cjs');

test('buildCloseoutPlan delegates docs, workboard, governance hashes, and DB checks to governance refresh', () => {
  const plan = buildCloseoutPlan([
    'docs/runbooks/governed-closeout-runbook-20260506.md',
    'docs/planning/state/agent-lane-e.yaml',
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-stage-1-chrome-simplification-implementation-plan-20260506.md',
  ]);

  assert.deepEqual(
    plan.map((step) => step.id),
    [
      'governance-refresh',
      'git-diff-check',
      'git-diff-cached-check',
      'conflict-marker-scan',
      'verify-prepush',
    ]
  );
  assert.equal(commandLabel(plan[0]), 'pnpm governance:refresh');
  assert.equal(commandLabel(plan.at(-1)), 'pnpm verify:prepush');
  assert.deepEqual(
    plan.filter((step) => /^(docs-|planning-db-|governance-db-)/.test(step.id)),
    [],
    'closeout:changed must not keep a manual copy of governance:refresh stages'
  );
});

test('buildCloseoutPlan lets governance refresh own generated code status for structural source changes', () => {
  const plan = buildCloseoutPlan([
    'apps/web/src/app/views/canvas/CanvasWorkbenchShell.tsx',
    'packages/@dvt/contracts/src/newContract.ts',
  ]);

  assert.deepEqual(
    plan.map((step) => step.id),
    [
      'governance-refresh',
      'git-diff-check',
      'git-diff-cached-check',
      'conflict-marker-scan',
      'verify-prepush',
    ]
  );
  assert.equal(
    plan.some((step) => step.id === 'docs-status-generate'),
    false,
    'docs:status:generate belongs to governance:refresh, not closeout:changed'
  );
});

test('listCloseoutChangedFiles includes deleted docs and source files for generated closeout gates', () => {
  const calls = [];
  const runGitLines = (args) => {
    const command = args.join(' ');
    calls.push(command);

    if (args[0] === 'rev-parse' && args.includes('origin/main')) {
      return ['origin/main'];
    }

    if (command === 'diff --name-only --diff-filter=ACMRD origin/main...HEAD') {
      return ['docs/runbooks/removed-runbook.md'];
    }

    if (command === 'diff --cached --name-only --diff-filter=ACMRD') {
      return ['packages/@dvt/planner/src/removed-source.ts'];
    }

    return [];
  };

  assert.deepEqual(listCloseoutChangedFiles({ baseRef: 'origin/main', runGitLines }), [
    'docs/runbooks/removed-runbook.md',
    'packages/@dvt/planner/src/removed-source.ts',
  ]);
  assert.ok(calls.every((call) => !call.includes('--diff-filter=ACMR ')));
});

test('readChangedTextFiles skips sibling paths that only share the repo path prefix', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'closeout-path-'));
  const repoRoot = path.join(tempRoot, 'repo');
  const siblingRoot = path.join(tempRoot, 'repo-other');
  fs.mkdirSync(repoRoot);
  fs.mkdirSync(siblingRoot);
  fs.writeFileSync(path.join(siblingRoot, 'outside.txt'), 'outside\n');

  assert.deepEqual(readChangedTextFiles(['../repo-other/outside.txt'], repoRoot), []);
});

test('assertNoConflictMarkers reports unresolved merge markers in changed text files', () => {
  assert.throws(
    () =>
      assertNoConflictMarkers([
        {
          path: 'docs/planning/example.md',
          content: 'start\n<<<<<<< ours\nmiddle\n>>>>>>> theirs\n',
        },
      ]),
    /Unresolved conflict marker in docs\/planning\/example\.md/
  );
});

test('buildCloseoutPlan checks both unstaged and staged whitespace errors', () => {
  const plan = buildCloseoutPlan(['scripts/closeout-changed.cjs']);

  assert.deepEqual(
    plan
      .filter((step) => step.id.startsWith('git-diff'))
      .map((step) => [step.id, commandLabel(step)]),
    [
      ['git-diff-check', 'git diff --check'],
      ['git-diff-cached-check', 'git diff --cached --check'],
    ]
  );
});

test('executeCloseoutPlan scans the latest changed files for conflict markers', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'closeout-scan-'));
  const repoRoot = path.join(tempRoot, 'repo');
  const docsRoot = path.join(repoRoot, 'docs');
  fs.mkdirSync(docsRoot, { recursive: true });
  fs.writeFileSync(path.join(docsRoot, 'generated.md'), 'start\n<<<<<<< ours\n');

  assert.throws(
    () =>
      executeCloseoutPlan(
        [
          {
            id: 'conflict-marker-scan',
            internal: 'conflict-marker-scan',
          },
        ],
        ['docs/initial.md'],
        {
          repoRootPath: repoRoot,
          listChangedFiles: () => ['docs/generated.md'],
        }
      ),
    /Unresolved conflict marker in docs\/generated\.md/
  );
});

test('closeout helper regression tests are wired into changed and full prepush gates', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8')
  );
  const { buildPrepushPlan } = require('./verify-prepush.cjs');
  const { buildVerifyChangedPlan, commandLabel } = require('./verify-changed.cjs');

  assert.equal(
    packageJson.scripts['test:closeout-changed'],
    'node --test scripts/closeout-changed.test.cjs'
  );
  assert.equal(packageJson.scripts['verify:prepush'], 'node scripts/verify-prepush.cjs');
  assert.ok(
    buildVerifyChangedPlan(['scripts/closeout-changed.cjs'])
      .map(commandLabel)
      .includes('node --test scripts/closeout-changed.test.cjs')
  );
  assert.ok(
    buildPrepushPlan(['apps/web/src/main.tsx'], { full: true }).some(
      (step) => step.id === 'test-closeout-changed'
    )
  );
});
