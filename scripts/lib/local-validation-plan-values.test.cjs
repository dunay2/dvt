/** Owned concern: prove validation step identity without process execution. */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  step,
  testStep,
  normalizeChangedFiles,
  pushSteps,
  commandLabel,
} = require('./local-validation-plan-values.cjs');

test('step values retain command arguments and test classification', () => {
  const value = testStep('contract', 'node', '--test', 'contract.test.cjs');
  assert.ok(Object.isFrozen(value));
  assert.ok(Object.isFrozen(value.args));
  assert.equal(value.kind, 'test');
  assert.equal(commandLabel(value), 'node --test contract.test.cjs');
  assert.deepEqual(normalizeChangedFiles(['scripts\\a.cjs', 'scripts/a.cjs', 'a.cjs']), [
    'a.cjs',
    'scripts/a.cjs',
  ]);
});

test('identical steps execute once while conflicting identities reject visibly', () => {
  const plan = [];
  const original = testStep('same-id', 'node', '--test', 'first.test.cjs');
  pushSteps(plan, [original, original]);
  assert.deepEqual(plan, [original]);
  for (const conflict of [
    testStep('same-id', 'pnpm', '--test', 'first.test.cjs'),
    testStep('same-id', 'node', '--test', 'other.test.cjs'),
    step('same-id', 'node', '--test', 'first.test.cjs'),
  ])
    assert.throws(
      () => pushSteps(plan, [conflict]),
      /Conflicting validation step identity: same-id/u
    );
  assert.deepEqual(plan, [original]);
});
