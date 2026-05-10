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

test('buildCloseoutPlan regenerates docs, workboard, governance hashes, and prepush for planning docs', () => {
  const plan = buildCloseoutPlan([
    'docs/runbooks/governed-closeout-runbook-20260506.md',
    'docs/planning/state/agent-lane-e.yaml',
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-stage-1-chrome-simplification-implementation-plan-20260506.md',
  ]);

  assert.deepEqual(
    plan.map((step) => step.id),
    [
      'docs-sync',
      'planning-db-import',
      'docs-workboard-generate',
      'docs-gov-manifest',
      'docs-governance-document-unit-map',
      'docs-governance-file-component-index',
      'docs-governance-file-fingerprint-baseline',
      'docs-governance-file-fingerprint-impact',
      'docs-governance-coverage-report',
      'docs-governance-remediation-queue',
      'docs-governance-file-component-index-final',
      'docs-governance-file-fingerprint-baseline-final',
      'docs-governance-file-fingerprint-impact-final',
      'planning-db-import-final',
      'planning-db-check',
      'planning-db-export-check',
      'governance-db-check',
      'governance-db-export-check',
      'git-diff-check',
      'git-diff-cached-check',
      'conflict-marker-scan',
      'verify-prepush',
    ]
  );
  assert.equal(commandLabel(plan[0]), 'pnpm docs:sync');
  assert.equal(commandLabel(plan.at(-1)), 'pnpm verify:prepush');
});

test('buildCloseoutPlan includes generated code status only for structural app or package changes', () => {
  const plan = buildCloseoutPlan([
    'apps/web/src/app/views/canvas/CanvasWorkbenchShell.tsx',
    'packages/@dvt/contracts/src/newContract.ts',
  ]);

  assert.deepEqual(
    plan.map((step) => step.id),
    [
      'docs-status-generate',
      'docs-gov-manifest',
      'docs-governance-document-unit-map',
      'docs-governance-file-component-index',
      'docs-governance-file-fingerprint-baseline',
      'docs-governance-file-fingerprint-impact',
      'docs-governance-coverage-report',
      'docs-governance-remediation-queue',
      'docs-governance-file-component-index-final',
      'docs-governance-file-fingerprint-baseline-final',
      'docs-governance-file-fingerprint-impact-final',
      'planning-db-import-final',
      'planning-db-check',
      'planning-db-export-check',
      'governance-db-check',
      'governance-db-export-check',
      'git-diff-check',
      'git-diff-cached-check',
      'conflict-marker-scan',
      'verify-prepush',
    ]
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

test('closeout helper regression tests are wired into the prepush gate', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8')
  );

  assert.equal(
    packageJson.scripts['test:closeout-changed'],
    'node --test scripts/closeout-changed.test.cjs'
  );
  assert.match(packageJson.scripts['verify:prepush'], /pnpm test:closeout-changed/);
});
