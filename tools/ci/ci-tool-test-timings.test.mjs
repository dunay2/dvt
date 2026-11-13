/** Owned concern: verify truthful bounded producer observations independently of execution. */
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { CiToolTestTimings } from './ci-tool-test-timings.mjs';

const root = path.resolve('timing root with spaces');
const counts = {
  tests: 2,
  passed: 2,
  failed: 0,
  cancelled: 0,
  skipped: 0,
  todo: 0,
  suites: 0,
  topLevel: 2,
};
function completion(file, durationMs, passed = true) {
  return {
    type: 'test:complete',
    data: {
      file,
      name: path.resolve(root, file.replaceAll('\\', '/')),
      line: 1,
      column: 1,
      nesting: 0,
      details: { duration_ms: durationMs, passed },
    },
  };
}
function globalSummary(success = true) {
  return { type: 'test:summary', data: { counts, duration_ms: 100, success } };
}

test('timing selection rejects missing and duplicate identities', () => {
  for (const files of [[], [''], [null], ['a.mjs', './a.mjs']]) {
    assert.throws(() => new CiToolTestTimings(files, root), TypeError);
  }
});

test('case, subtest and unselected completions cannot masquerade as file producers', () => {
  const timings = new CiToolTestTimings(['a.mjs'], root);
  const ordinary = completion('a.mjs', 1);
  ordinary.data.name = 'ordinary case';
  const nested = completion('a.mjs', 2);
  nested.data.nesting = 1;
  const wrongLocation = completion('a.mjs', 3);
  wrongLocation.data.line = 42;
  for (const event of [ordinary, nested, wrongLocation, completion('other.mjs', 4)]) {
    assert.deepEqual(timings.observe(event), []);
  }
  timings.observe(globalSummary());
  assert.deepEqual(timings.finish().missingFiles, ['a.mjs']);
});

test('concurrent out-of-order producers retain zero, stable ties and separate native duration', () => {
  const timings = new CiToolTestTimings(['b.mjs', 'a.mjs', 'folder/z.mjs'], root);
  timings.observe(completion('b.mjs', 200));
  timings.observe(completion('folder\\z.mjs', 0));
  timings.observe(completion('a.mjs', 200));
  timings.observe({ type: 'test:summary', data: { file: 'a.mjs', counts, duration_ms: 10 } });
  timings.observe(globalSummary());
  const report = timings.finish();
  assert.equal(report.type, 'summary');
  assert.equal(report.outcome, 'passed');
  assert.equal(report.nativeDurationMs, 100);
  assert.deepEqual(
    report.ranking.map((file) => [file.file, file.durationMs]),
    [
      ['a.mjs', 200],
      ['b.mjs', 200],
      ['folder/z.mjs', 0],
    ]
  );
  assert.equal(report.ranking[0].harnessDurationMs, 10);
  assert.deepEqual(report.ranking[0].counts, counts);
  assert.equal(report.ranking[1].counts, null);
  assert.ok(!Object.hasOwn(report, 'wallDurationMs'));
});

for (const invalid of [-1, NaN, Infinity, '0']) {
  test(`invalid container duration ${String(invalid)} stays unavailable`, () => {
    const timings = new CiToolTestTimings(['a.mjs'], root);
    assert.deepEqual(timings.observe(completion('a.mjs', invalid)), []);
    timings.observe(globalSummary());
    const report = timings.finish();
    assert.equal(report.type, 'partial');
    assert.ok(report.diagnostics.includes('invalid-file-completion'));
    assert.ok(!Object.hasOwn(report, 'ranking'));
  });
}

test('a failed container without a harness summary retains failure and unknown counts', () => {
  const timings = new CiToolTestTimings(['crash.mjs'], root);
  timings.observe(completion('crash.mjs', 50, false));
  timings.observe(globalSummary(false));
  const report = timings.finish();
  assert.equal(report.type, 'summary');
  assert.equal(report.outcome, 'failed');
  assert.equal(report.ranking[0].passed, false);
  assert.equal(report.ranking[0].counts, null);
});

test('duplicates and missing containers never publish a complete ranking', () => {
  const timings = new CiToolTestTimings(['a.mjs', 'missing.mjs'], root);
  timings.observe(completion('a.mjs', 1));
  timings.observe(completion('a.mjs', 2));
  timings.observe(globalSummary());
  const report = timings.finish();
  assert.equal(report.type, 'partial');
  assert.deepEqual(report.missingFiles, ['missing.mjs']);
  assert.ok(report.diagnostics.includes('duplicate-file-completion'));
  assert.ok(!Object.hasOwn(report, 'ranking'));
});

test('stream interruption and invalid or duplicate globals remain partial', () => {
  for (const globals of [
    [],
    [globalSummary(), globalSummary()],
    [{ type: 'test:summary', data: { counts: {}, duration_ms: 1, success: true } }],
  ]) {
    const timings = new CiToolTestTimings(['a.mjs'], root);
    timings.observe(completion('a.mjs', 0));
    for (const event of globals) timings.observe(event);
    assert.equal(timings.finish().type, 'partial');
    assert.ok(!Object.hasOwn(timings.finish(), 'ranking'));
  }
});
