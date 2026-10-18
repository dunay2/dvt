import assert from 'node:assert/strict';

import { test } from 'vitest';

import {
  isLocalDataCount,
  localDataCoverageErrors,
  localDataOrdinalErrors,
  localDataCaptureTransition,
  localDataCompletionMatches,
} from '../../src/contracts/local-data/localDataInvariants.js';

const full = { kind: 'full' } as const;
const sample = (
  n: string
): Extract<Parameters<typeof localDataCoverageErrors>[0], { kind: 'sample' }> => ({
  kind: 'sample',
  method: 'first',
  requestedRows: n,
});
const fullCoverage = { kind: 'full', eofObserved: true } as const;
const sampleCoverage = { kind: 'sample' } as const;
const capture = (
  status: 'requested' | 'capturing' | 'completed' | 'failed' | 'cancelled',
  extra: Partial<{
    localDatasetId: string;
    captureId: string;
    requestFingerprint: string;
    requestedAt: string;
    updatedAt: string;
    generationId: string;
  }> = {}
): Parameters<typeof localDataCaptureTransition>[0] => ({
  status,
  localDatasetId: 'dataset',
  captureId: 'attempt',
  requestFingerprint: 'hash',
  requestedAt: '2026-10-16T10:00:00.000Z',
  updatedAt: '2026-10-16T10:00:01.000Z',
  ...extra,
});

for (const value of ['0', '1', '9007199254740993', '18446744073709551615']) {
  test(`count accepts exact uint64 ${value}`, () => assert.equal(isLocalDataCount(value), true));
}
for (const value of [
  '',
  '00',
  '01',
  '-1',
  '+1',
  '1.0',
  '1e3',
  '1\n',
  ' 1',
  '1 ',
  '18446744073709551616',
  '9'.repeat(10000),
  1,
  Number.MAX_SAFE_INTEGER + 1,
  1n,
  null,
  undefined,
  NaN,
]) {
  test(`count rejects ${String(value).slice(0, 40)} [${typeof value}]`, () =>
    assert.equal(isLocalDataCount(value), false));
}
test('FULL permits an empty exhausted source', () =>
  assert.deepEqual(localDataCoverageErrors(full, fullCoverage, 'source-exhausted', '0'), []));
test('FULL forbids target stop', () =>
  assert.ok(localDataCoverageErrors(full, fullCoverage, 'sample-target-reached', '8').length));
test('FULL cannot be relabelled sample', () =>
  assert.ok(localDataCoverageErrors(full, sampleCoverage, 'source-exhausted', '8').length));
test('sample exhausted early stays sample', () =>
  assert.deepEqual(
    localDataCoverageErrors(sample('10'), sampleCoverage, 'source-exhausted', '3'),
    []
  ));
test('sample exhausted empty stays sample', () =>
  assert.deepEqual(
    localDataCoverageErrors(sample('10'), sampleCoverage, 'source-exhausted', '0'),
    []
  ));
test('sample at target is valid without asserting EOF', () =>
  assert.deepEqual(
    localDataCoverageErrors(sample('10'), sampleCoverage, 'sample-target-reached', '10'),
    []
  ));
test('sample short without EOF is not a successful capture', () =>
  assert.ok(
    localDataCoverageErrors(sample('10'), sampleCoverage, 'sample-target-reached', '9').length
  ));
test('sample cannot exceed target even with EOF', () =>
  assert.ok(
    localDataCoverageErrors(sample('10'), sampleCoverage, 'source-exhausted', '11').length
  ));
test('sample does not become FULL at EOF', () =>
  assert.ok(localDataCoverageErrors(sample('10'), fullCoverage, 'source-exhausted', '3').length));
test('sample compares beyond Number precision', () =>
  assert.ok(
    localDataCoverageErrors(
      sample('9007199254740992'),
      sampleCoverage,
      'source-exhausted',
      '9007199254740993'
    ).length
  ));
test('invalid count yields an issue rather than throwing BigInt', () =>
  assert.ok(
    localDataCoverageErrors(sample('5'), sampleCoverage, 'source-exhausted', 'bad').length
  ));
test('invalid sample target fails closed', () =>
  assert.ok(
    localDataCoverageErrors(sample('bad'), sampleCoverage, 'source-exhausted', '1').length
  ));
test('zero sample target fails closed', () =>
  assert.ok(localDataCoverageErrors(sample('0'), sampleCoverage, 'source-exhausted', '0').length));
test('repeated column names remain distinguishable by ordinal', () =>
  assert.deepEqual(
    localDataOrdinalErrors([
      { ordinal: 0, name: 'id' },
      { ordinal: 1, name: 'id' },
    ]),
    []
  ));
for (const ordinals of [[1], [0, 0], [0, 2], [-1], [0.5], [NaN]]) {
  test(`ordinal rejects ${JSON.stringify(ordinals)}`, () =>
    assert.ok(localDataOrdinalErrors(ordinals.map((ordinal) => ({ ordinal }))).length));
}
const statuses = ['requested', 'capturing', 'completed', 'failed', 'cancelled'] as const;
const allowed = new Set([
  'requested/capturing',
  'requested/failed',
  'requested/cancelled',
  'capturing/completed',
  'capturing/failed',
  'capturing/cancelled',
]);
for (const before of statuses)
  for (const after of statuses) {
    test(`attempt transition ${before} -> ${after}`, () => {
      const a = capture(before, before === 'completed' ? { generationId: 'gen' } : {});
      const b = capture(after, after === 'completed' ? { generationId: 'gen' } : {});
      assert.equal(localDataCaptureTransition(a, b), allowed.has(`${before}/${after}`));
    });
  }
for (const field of ['localDatasetId', 'captureId', 'requestFingerprint', 'requestedAt']) {
  test(`attempt cannot switch ${field}`, () =>
    assert.equal(
      localDataCaptureTransition(
        capture('capturing'),
        capture('completed', { generationId: 'gen', [field]: 'other' })
      ),
      false
    ));
}
test('attempt clock cannot go backwards', () =>
  assert.equal(
    localDataCaptureTransition(
      capture('capturing'),
      capture('failed', { updatedAt: '2026-10-16T10:00:00.000Z' })
    ),
    false
  ));
test('attempt completion requires generation', () =>
  assert.equal(localDataCaptureTransition(capture('capturing'), capture('completed')), false));
test('failed attempt cannot carry a generation', () =>
  assert.equal(
    localDataCaptureTransition(capture('capturing'), capture('failed', { generationId: 'gen' })),
    false
  ));
const completed = capture('completed', {
  generationId: 'gen',
  updatedAt: '2026-10-16T10:00:03.000Z',
});
const manifest = {
  localDatasetId: 'dataset',
  captureId: 'attempt',
  generationId: 'gen',
  requestFingerprint: 'hash',
  createdAt: '2026-10-16T10:00:02.000Z',
  sourceObservation: { observedAt: '2026-10-16T10:00:01.000Z' },
};
test('complete receipt matches its own generation', () =>
  assert.equal(localDataCompletionMatches(completed, manifest), true));
for (const field of ['localDatasetId', 'captureId', 'generationId', 'requestFingerprint']) {
  test(`receipt cannot substitute ${field}`, () =>
    assert.equal(localDataCompletionMatches(completed, { ...manifest, [field]: 'other' }), false));
}
test('receipt cannot precede manifest', () =>
  assert.equal(
    localDataCompletionMatches({ ...completed, updatedAt: '2026-10-16T10:00:01.000Z' }, manifest),
    false
  ));
test('manifest cannot precede capture request', () =>
  assert.equal(
    localDataCompletionMatches(completed, { ...manifest, createdAt: '2026-10-16T09:00:00.000Z' }),
    false
  ));
test('source observation cannot predate capture attempt', () =>
  assert.equal(
    localDataCompletionMatches(completed, {
      ...manifest,
      sourceObservation: { observedAt: '2026-10-16T09:00:00.000Z' },
    }),
    false
  ));
test('a failed capture is never a completion receipt', () =>
  assert.equal(localDataCompletionMatches({ ...completed, status: 'failed' }, manifest), false));
test('sample small-state space agrees with independent integer oracle (1320 vectors)', () => {
  for (let target = 1; target <= 20; target++)
    for (let rows = 0; rows <= 32; rows++) {
      for (const reason of ['source-exhausted', 'sample-target-reached'] as const) {
        const expected = rows <= target && (reason === 'source-exhausted' || rows === target);
        assert.equal(
          localDataCoverageErrors(sample(String(target)), sampleCoverage, reason, String(rows))
            .length === 0,
          expected
        );
      }
    }
});
