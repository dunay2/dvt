/** Owned concern: every feature-mechanization implementation change runs its real regressions. */
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { buildVerifyChangedPlan } = require('./local-validation-plan.cjs');

test('shared syntax facts select each semantic consumer regression once', () => {
  const suites = [
    'scripts/lib/source-code-facts.test.cjs',
    'scripts/lib/component-source-responsibilities.test.cjs',
    'scripts/check-feature-mechanization.test.cjs',
    'scripts/planning-db/code-symbol-inventory.test.cjs',
    'scripts/web-code-duplication.test.cjs',
  ];
  const plan = buildVerifyChangedPlan(['scripts/lib/source-code-facts.cjs', ...suites]);
  for (const suite of suites)
    assert.equal(
      plan.filter((step) => step.command === 'node' && step.args.includes(suite)).length,
      1
    );
  const sourceOnly = buildVerifyChangedPlan(['scripts/lib/source-code-facts.cjs']);
  for (const suite of suites)
    assert.equal(
      sourceOnly.filter((step) => step.command === 'node' && step.args.includes(suite)).length,
      1
    );
});

test('an affected aggregate runs its included responsibility shard once', () => {
  for (const [aggregate, source, shard] of [
    [
      'scripts/planning-db-query.test.cjs',
      'scripts/planning-db/queries/current-component-files-query.cjs',
      'scripts/planning-db-query-tests/current-component-files.test.cjs',
    ],
    [
      'scripts/planning-db-operate.test.cjs',
      'scripts/planning-db/feature-mechanization-policy.cjs',
      'scripts/planning-db-operate-tests/feature-mechanization.test.cjs',
    ],
  ]) {
    assert.ok(
      fs
        .readFileSync(path.resolve(__dirname, '..', aggregate), 'utf8')
        .includes("require('./" + shard.slice('scripts/'.length) + "');"),
      'aggregate must actually include the shard'
    );
    const plan = buildVerifyChangedPlan([aggregate, source, shard]);
    assert.equal(
      plan.filter((step) => step.command === 'node' && step.args.includes(aggregate)).length,
      1
    );
    assert.equal(
      plan.filter((step) => step.command === 'node' && step.args.includes(shard)).length,
      0
    );
  }
});

for (const [source, suite] of [
  [
    'scripts/lib/component-source-responsibilities.cjs',
    'scripts/lib/component-source-responsibilities.test.cjs',
  ],
  ['scripts/lib/source-code-facts.cjs', 'scripts/lib/source-code-facts.test.cjs'],
  ['scripts/check-feature-mechanization.cjs', 'scripts/check-feature-mechanization.test.cjs'],
  [
    'scripts/planning-db/component-source-responsibility-store.cjs',
    'scripts/planning-db/component-source-responsibility-store.test.cjs',
  ],
  [
    'scripts/planning-db/queries/current-component-files-query.cjs',
    'scripts/planning-db-query-tests/current-component-files.test.cjs',
  ],
  [
    'scripts/lib/feature-mechanization-manifest.cjs',
    'scripts/check-feature-mechanization.test.cjs',
  ],
  [
    'scripts/lib/feature-mechanization-db-reader.cjs',
    'scripts/lib/feature-mechanization-db-reader.test.cjs',
  ],
  [
    'scripts/lib/feature-mechanization-git-diff.cjs',
    'scripts/lib/feature-mechanization-git-diff.test.cjs',
  ],
]) {
  test(source + ' selects its regression once even when the test changes too', () => {
    for (const files of [[source], [suite], [source, suite]]) {
      const matches = buildVerifyChangedPlan(files).filter(
        (step) => step.command === 'node' && step.args.includes(suite)
      );
      assert.equal(matches.length, 1);
      assert.deepEqual(matches[0].args, ['--test', suite]);
    }
  });
}
