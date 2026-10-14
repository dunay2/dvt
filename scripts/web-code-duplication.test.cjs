/** Owned concern: prove current-source duplicate reports without changing product semantics. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { reportChangedWebDuplication } = require('./web-code-duplication.cjs');
const { buildFocusedChangedTestPlan } = require('./local-validation-plan.cjs');

const first = 'apps/web/src/app/first.ts';
const second = 'apps/web/src/app/second.ts';
const body =
  'function normalize(value: string): string { const trimmed = value.trim(); return trimmed || "en"; }';

function report(changed, files, overrides = {}) {
  const output = [];
  const errors = [];
  const status = reportChangedWebDuplication(changed, {
    readSourceFiles: () => files,
    sourceExists: () => false,
    write: (line) => output.push(line),
    reportError: (line) => errors.push(line),
    ...overrides,
  });
  return { status, output: output.join('\n'), errors };
}

test('reports changed duplicate bodies with unchanged counterpart locations', () => {
  const result = report(
    [first],
    [
      { path: first, content: body },
      { path: second, content: body },
    ]
  );
  assert.equal(result.status, 0);
  assert.match(result.output, /manual review/i);
  assert.match(result.output, /first\.ts:1/);
  assert.match(result.output, /second\.ts:1/);
});

test('includes an untracked changed file from the same caller inventory', () => {
  const result = report([second], [{ path: first, content: body }], {
    sourceExists: (file) => file === second,
    readSource: (file) => {
      assert.equal(file, second);
      return body;
    },
  });
  assert.match(result.output, /second\.ts:1/);
});

test('does not report unchanged groups, test support or trivial forwarding wrappers', () => {
  const files = [
    { path: first, content: body },
    { path: second, content: body },
  ];
  assert.doesNotMatch(report(['apps/web/src/app/third.ts'], files).output, /manual review/i);
  assert.doesNotMatch(
    report([first], [files[0], { path: 'apps/web/src/app/second.test.support.ts', content: body }])
      .output,
    /manual review/i
  );
  assert.doesNotMatch(
    report(
      [first],
      files.map((file) => ({ ...file, content: 'function forward(value) { return value; }' }))
    ).output,
    /manual review/i
  );
});

test('does not label distinct literal contents as exact duplicates', () => {
  const result = report(
    [first],
    [
      { path: first, content: body.replace('en', 'en  us') },
      { path: second, content: body.replace('en', 'en us') },
    ]
  );
  assert.doesNotMatch(result.output, /manual review/i);
});

test('fails closed when current inventory cannot be read', () => {
  const result = report([first], [], {
    readSourceFiles: () => {
      throw new Error('Git unavailable');
    },
  });
  assert.equal(result.status, 1);
  assert.match(result.errors.join('\n'), /Git unavailable/);
});

test('fails closed on malformed source instead of reporting a clean scan', () => {
  const result = report(
    [first],
    [{ path: first, content: 'function broken(value: { return value;' }]
  );
  assert.equal(result.status, 1);
  assert.match(result.errors.join('\n'), /syntax/i);
});

test('does not scan the repository when no production web source changed', () => {
  const result = report(['docs/example.md'], [], {
    readSourceFiles: () => {
      throw new Error('must not scan');
    },
  });
  assert.equal(result.status, 0);
  assert.deepEqual(result.errors, []);
});

test('routes its separate tests when the analyzer or static wiring changes', () => {
  for (const file of [
    'scripts/web-code-duplication.cjs',
    'scripts/check-changed.cjs',
    'scripts/planning-db/code-symbol-inventory.cjs',
  ]) {
    const plan = buildFocusedChangedTestPlan([file]);
    assert.ok(plan.some((step) => step.args.includes('scripts/web-code-duplication.test.cjs')));
  }
});
