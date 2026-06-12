import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const rootCompatSchemaPath = 'contracts/compat/plan-compat.schema.json';
const packageCompatSchemaPath = 'packages/@dvt/contracts/compat/plan-compat.schema.json';
const compatMatrixPath = 'contracts/compat/plan-compat.json';
const matrixAlignmentTestPath = 'packages/test/matrix-alignment.test.ts';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

test('contracts compatibility schema has one canonical shape', () => {
  const rootSchema = readJson(rootCompatSchemaPath);
  const packageSchema = readJson(packageCompatSchemaPath);

  assert.deepEqual(
    packageSchema,
    rootSchema,
    'packages/@dvt/contracts/compat/plan-compat.schema.json must not drift from the canonical root schema'
  );
});

test('plan compatibility matrix uses the canonical major.minor version literal', () => {
  const matrix = readJson(compatMatrixPath);

  assert.equal(matrix.schema, 'ExecutionPlan');
  assert.ok(Array.isArray(matrix.versions));
  assert.ok(matrix.versions.length > 0);

  for (const row of matrix.versions) {
    assert.match(row.version, /^[0-9]+\.[0-9]+$/u);
    assert.equal(typeof row.adapters, 'object');
    assert.ok(!Array.isArray(row.adapters));

    for (const [adapterName, supported] of Object.entries(row.adapters)) {
      assert.match(adapterName, /^[A-Za-z][A-Za-z0-9]*Adapter$/u);
      assert.equal(typeof supported, 'boolean');
    }
  }
});

test('CI validates the canonical compatibility matrix directly', () => {
  const matrixAlignmentTest = readFileSync(matrixAlignmentTestPath, 'utf8');

  assert.match(matrixAlignmentTest, /contracts\/compat\/plan-compat\.json/u);
  assert.match(matrixAlignmentTest, /contracts\/compat\/plan-compat\.schema\.json/u);
  assert.match(matrixAlignmentTest, /v1\.0/u);
});
