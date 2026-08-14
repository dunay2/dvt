import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_CANONICAL_RECORD_CHANGES,
  MAX_LINE_CHANGES,
  classifyPullRequestSize,
  countCanonicalRecordChanges,
} from './check-pr-size.mjs';

function canonicalState({ components = [], rails = [] } = {}) {
  return {
    schemaVersion: 1,
    architectureState: {
      component: components,
      design: [],
    },
    featureMechanizationRails: rails,
  };
}

test('keeps the ordinary line limit for non-canonical changes', () => {
  const result = classifyPullRequestSize({
    additions: MAX_LINE_CHANGES,
    deletions: 1,
    canonicalAdditions: 0,
    canonicalDeletions: 0,
  });

  assert.equal(result.status, 'fail');
  assert.equal(result.nonCanonicalLineChanges, MAX_LINE_CHANGES + 1);
  assert.match(result.message, /non-canonical lines changed/);
});

test('classifies canonical raw churn by semantic record changes', () => {
  const baseSnapshot = canonicalState({
    components: [{ component_id: 'A', status: 'proposed' }],
    rails: [{ railId: 'rail-a', status: 'declared' }],
  });
  const headSnapshot = canonicalState({
    components: [
      { component_id: 'A', status: 'implemented' },
      { component_id: 'B', status: 'proposed' },
    ],
    rails: [{ railId: 'rail-a', status: 'declared' }],
  });
  const result = classifyPullRequestSize({
    additions: 41_000,
    deletions: 28_000,
    canonicalAdditions: 38_000,
    canonicalDeletions: 27_000,
    baseCanonicalState: baseSnapshot,
    headCanonicalState: headSnapshot,
  });

  assert.equal(countCanonicalRecordChanges(baseSnapshot, headSnapshot), 3);
  assert.equal(result.status, 'warning');
  assert.equal(result.nonCanonicalLineChanges, 4_000);
  assert.equal(result.canonicalRecordChanges, 3);
});

test('fails when the canonical semantic record limit is exceeded', () => {
  const baseSnapshot = canonicalState();
  const headSnapshot = canonicalState({
    components: Array.from({ length: MAX_CANONICAL_RECORD_CHANGES + 1 }, (_, index) => ({
      component_id: `component-${index}`,
    })),
  });
  const result = classifyPullRequestSize({
    additions: MAX_CANONICAL_RECORD_CHANGES + 1,
    deletions: 0,
    canonicalAdditions: MAX_CANONICAL_RECORD_CHANGES + 1,
    canonicalDeletions: 0,
    baseCanonicalState: baseSnapshot,
    headCanonicalState: headSnapshot,
  });

  assert.equal(result.status, 'fail');
  assert.equal(result.canonicalRecordChanges, MAX_CANONICAL_RECORD_CHANGES + 1);
  assert.match(result.message, /canonical records changed/);
});

test('preserves warning and pass behavior for ordinary pull requests', () => {
  assert.equal(
    classifyPullRequestSize({
      additions: 300,
      deletions: 201,
      canonicalAdditions: 0,
      canonicalDeletions: 0,
    }).status,
    'warning'
  );
  assert.equal(
    classifyPullRequestSize({
      additions: 300,
      deletions: 200,
      canonicalAdditions: 0,
      canonicalDeletions: 0,
    }).status,
    'pass'
  );
});

test('fails closed for inconsistent metrics and invalid canonical JSON', () => {
  assert.throws(
    () =>
      classifyPullRequestSize({
        additions: 1,
        deletions: 0,
        canonicalAdditions: 2,
        canonicalDeletions: 0,
      }),
    /exceed total pull request changes/
  );
  assert.throws(
    () => countCanonicalRecordChanges(null, canonicalState()),
    /canonical Planning DB state must be an object/
  );
});
