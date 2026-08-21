import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { MAX_LINE_CHANGES, classifyPullRequestSize } from './check-pr-size.mjs';

test('keeps the ordinary authored-line limit', () => {
  const result = classifyPullRequestSize({
    additions: MAX_LINE_CHANGES,
    deletions: 1,
  });

  assert.equal(result.status, 'fail');
  assert.equal(result.totalLineChanges, MAX_LINE_CHANGES + 1);
  assert.match(result.message, /lines changed/);
});

test('preserves warning and pass behavior for ordinary pull requests', () => {
  assert.equal(
    classifyPullRequestSize({
      additions: 300,
      deletions: 201,
    }).status,
    'warning'
  );
  assert.equal(
    classifyPullRequestSize({
      additions: 300,
      deletions: 200,
    }).status,
    'pass'
  );
});

test('fails closed for invalid line metrics', () => {
  assert.throws(
    () => classifyPullRequestSize({ additions: -1, deletions: 0 }),
    /non-negative safe integer/
  );
});

test('the PR size gate has no tracked Planning DB snapshot semantics', () => {
  const source = readFileSync(new URL('./check-pr-size.mjs', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /canonical-state\.json/u);
  assert.doesNotMatch(source, /CANONICAL_STATE_PATH/u);
  assert.doesNotMatch(source, /collectCanonicalRecords/u);
});
