import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PREPUSH_TYPECHECK_COMMANDS,
  classifyPrepushTypecheck,
  collectTypecheckRelevantFiles,
  isTypecheckRelevantFile,
} from './prepush-typecheck-scope.mjs';

test('typecheck relevance only includes TypeScript graph inputs', () => {
  assert.equal(isTypecheckRelevantFile('packages/@dvt/engine/src/index.ts'), true);
  assert.equal(isTypecheckRelevantFile('packages/@dvt/engine/src/index.js'), false);
  assert.equal(isTypecheckRelevantFile('packages/@dvt/engine/package.json'), true);
  assert.equal(isTypecheckRelevantFile('docs/guide.md'), false);
  assert.deepEqual(
    collectTypecheckRelevantFiles([
      'docs/guide.md',
      'packages/@dvt/engine/src/index.ts',
      'apps/web/package.json',
    ]),
    ['packages/@dvt/engine/src/index.ts', 'apps/web/package.json']
  );
});

test('prepush typecheck skips when the diff has no TypeScript-affecting files', () => {
  const plan = classifyPrepushTypecheck(['docs/guides/testing-and-ci-capabilities.md']);

  assert.equal(plan.mode, 'skip');
  assert.equal(plan.reason, 'No TypeScript-affecting files changed');
  assert.equal(plan.run, null);
  assert.deepEqual(plan.affectedPackages, []);
});

test('prepush typecheck routes workspace-local files through affected typecheck', () => {
  const plan = classifyPrepushTypecheck(['packages/@dvt/engine/src/contracts/PlanRef.ts']);

  assert.equal(plan.mode, 'affected');
  assert.equal(plan.reason, 'Workspace-scoped TypeScript changes detected');
  assert.deepEqual(plan.run, PREPUSH_TYPECHECK_COMMANDS.affected);
  assert.ok(plan.affectedPackages.includes('@dvt/engine'));
});

test('prepush typecheck keeps global graph inputs on full root typecheck', () => {
  const packageJsonPlan = classifyPrepushTypecheck(['package.json']);
  assert.equal(packageJsonPlan.mode, 'full');
  assert.equal(packageJsonPlan.reason, 'Global TypeScript graph inputs changed');
  assert.deepEqual(packageJsonPlan.run, PREPUSH_TYPECHECK_COMMANDS.full);

  const tsconfigPlan = classifyPrepushTypecheck(['tsconfig.package-bundler.base.json']);
  assert.equal(tsconfigPlan.mode, 'full');
  assert.equal(tsconfigPlan.reason, 'Global TypeScript graph inputs changed');
  assert.deepEqual(tsconfigPlan.run, PREPUSH_TYPECHECK_COMMANDS.full);
});

test('prepush typecheck falls back to full root typecheck when scope mapping is unknown', () => {
  const plan = classifyPrepushTypecheck(['misc/local-scratch.ts']);

  assert.equal(plan.mode, 'full');
  assert.equal(plan.reason, 'Relevant files did not map to a workspace scope');
  assert.deepEqual(plan.run, PREPUSH_TYPECHECK_COMMANDS.full);
});
