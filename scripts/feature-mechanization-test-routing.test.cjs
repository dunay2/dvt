/** Owned concern: every feature-mechanization implementation change runs its real regressions. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { buildVerifyChangedPlan } = require('./local-validation-plan.cjs');

for (const [source, suite] of [
  ['scripts/check-feature-mechanization.cjs', 'scripts/check-feature-mechanization.test.cjs'],
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
