/**
 * Owned concern: prove ARC policy routing covers the canonical state-store package path.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import yaml from 'js-yaml';

const policy = yaml.load(readFileSync('.arc-policy.yaml', 'utf8'));

test('ARC policy governs the canonical state-store package path', () => {
  const stateStoreTrigger = policy.triggers.find((trigger) => trigger.name === 'state-store');

  assert.ok(stateStoreTrigger, 'expected a state-store ARC trigger');
  assert.deepEqual(stateStoreTrigger.globs, ['packages/@dvt/state-store/**']);
  assert.equal(stateStoreTrigger.min_arc_level, 'ARC-2');
  assert.equal(stateStoreTrigger.require.evidence_doc, true);
  assert.equal(stateStoreTrigger.require.risk_update, true);
});

test('ARC policy does not retain the legacy state package glob', () => {
  const allGlobs = policy.triggers.flatMap((trigger) => trigger.globs || []);

  assert.ok(!allGlobs.includes('packages/@dvt/state/**'));
});
