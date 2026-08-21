import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  MAX_CANONICAL_RECORD_CHANGES,
  MAX_LINE_CHANGES,
  classifyPullRequestSize,
  countCanonicalRecordChanges,
  runPrSizeCheck,
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

test('the PR workflow supplies exact base and head refs to the size policy', () => {
  const workflow = readFileSync(
    new URL('../../.github/workflows/pr-quality-gate.yml', import.meta.url),
    'utf8'
  );
  const sizeStep = workflow.match(/- name: Check PR size[\s\S]*?(?=\n\s+- name:)/u)?.[0] ?? '';

  assert.match(sizeStep, /GIT_BASE: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/u);
  assert.match(sizeStep, /GIT_HEAD: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/u);
});

test('the PR size gate has no tracked Planning DB snapshot semantics', () => {
  const source = readFileSync(new URL('./check-pr-size.mjs', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /canonical-state\.json/u);
  assert.doesNotMatch(source, /CANONICAL_STATE_PATH/u);
  assert.doesNotMatch(source, /collectCanonicalRecords/u);
});

test('falls back to exact tree comparison when a shallow checkout has no merge base', () => {
  const calls = [];
  const baseSnapshot = canonicalState();
  const headSnapshot = canonicalState({
    rails: [{ railId: 'rail-a', status: 'implemented' }],
  });
  const execFileSync = (_command, args) => {
    calls.push(args);
    if (args[0] === 'diff' && args[2] === 'base...head') {
      const error = new Error('git diff failed');
      error.stderr = 'fatal: base...head: no merge base';
      throw error;
    }
    if (args[0] === 'diff') {
      return '2\t1\ttools/planning-db/state/canonical-state.json\n';
    }
    if (args[0] === 'show' && args[1].startsWith('base:')) {
      return JSON.stringify(baseSnapshot);
    }
    if (args[0] === 'show' && args[1].startsWith('head:')) {
      return JSON.stringify(headSnapshot);
    }
    throw new Error(`Unexpected git call: ${args.join(' ')}`);
  };
  const messages = [];

  const exitCode = runPrSizeCheck(
    {
      GIT_BASE: 'base',
      GIT_HEAD: 'head',
      PR_ADDITIONS: '2',
      PR_DELETIONS: '1',
      PR_LABELS: '[]',
    },
    {
      execFileSync,
      logger: {
        error: (message) => messages.push(message),
        log: (message) => messages.push(message),
        warn: (message) => messages.push(message),
      },
    }
  );

  assert.equal(exitCode, 0);
  assert.deepEqual(calls[0], [
    'diff',
    '--numstat',
    'base...head',
    '--',
    'tools/planning-db/state/canonical-state.json',
  ]);
  assert.deepEqual(calls[1], [
    'diff',
    '--numstat',
    'base',
    'head',
    '--',
    'tools/planning-db/state/canonical-state.json',
  ]);
  assert.match(messages.at(-1), /canonical records: 1/u);
});
