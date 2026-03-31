import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { shouldIncludePlanningDoc } = require('../../scripts/sync-docs.cjs');

test('planning doc index generation excludes superseded and archived docs', () => {
  assert.equal(shouldIncludePlanningDoc('Active'), true);
  assert.equal(shouldIncludePlanningDoc('Draft'), true);
  assert.equal(shouldIncludePlanningDoc('Review'), true);
  assert.equal(shouldIncludePlanningDoc('Superseded'), false);
  assert.equal(shouldIncludePlanningDoc('Archived'), false);
  assert.equal(shouldIncludePlanningDoc('superseded'), false);
  assert.equal(shouldIncludePlanningDoc(' archived '), false);
});
