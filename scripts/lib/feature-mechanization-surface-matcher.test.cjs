/** Owned concern: preserve real surface admission while eliminating repeated compilation.
 * Why: a faster matcher must not widen patterns or drop equally specific owners.
 * Corner: raw diagnostic order and new-invocation freshness remain observable.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  FeatureMechanizationSurfaceMatcher,
} = require('./feature-mechanization-surface-matcher.cjs');

function entry(id, allowed, forbidden = []) {
  return {
    manifest: {
      featureId: id,
      allowedImplementationSurfaces: allowed,
      forbiddenImplementationSurfaces: forbidden,
    },
  };
}

test('surface patterns retain anchors, wildcard grammar, literals and existing normalization', () => {
  const cases = [
    ['./scripts/*.cjs explanation', 'scripts/task.cjs', true],
    ['././scripts/*.cjs', 'scripts/task.cjs', true],
    ['./././scripts/*.cjs', '././scripts/task.cjs', true],
    ['scripts/*.cjs', 'scripts/nested/task.cjs', false],
    ['scripts/**', './scripts/nested/task.cjs', true],
    ['scripts\\*.cjs note', 'scripts\\task.cjs', true],
    ['scripts/[draft]+(v1).cjs', 'scripts/[draft]+(v1).cjs', true],
    ['scripts/[draft]+(v1).cjs', 'scripts/draftv1.cjs', false],
    ['scripts/task.cjs', 'prefix/scripts/task.cjs', false],
    ['scripts/task.cjs', 'scripts/task.cjs.extra', false],
    ['scripts/task.cjs', 'Scripts/task.cjs', false],
    ['scripts/**/task.cjs', 'scripts/task.cjs', false],
    ['scripts/**/task.cjs', 'scripts/nested/task.cjs', true],
  ];
  for (const [pattern, path, expected] of cases) {
    const matcher = new FeatureMechanizationSurfaceMatcher([entry('ONE', [pattern])]);
    const prepared = matcher.collectSurfacePatterns('allowedImplementationSurfaces');
    assert.equal(matcher.matchesSurface(path, prepared[0]), expected, pattern + ' / ' + path);
  }
});

test('every equally specific manifest survives broad, duplicate and exact matches', () => {
  const entries = [
    entry('BROAD', ['scripts/**']),
    entry('A', ['scripts/task.cjs note']),
    entry('B', ['scripts/task.cjs', 'scripts/task.cjs duplicate']),
  ];
  const matcher = new FeatureMechanizationSurfaceMatcher(entries);
  assert.deepEqual(
    matcher.findMostSpecificManifestEntriesAllowingFile('scripts/task.cjs'),
    entries.slice(1)
  );
  assert.deepEqual(
    matcher.findMostSpecificManifestEntriesAllowingFile('scripts/other.cjs'),
    entries.slice(0, 1)
  );
  assert.deepEqual(matcher.findMostSpecificManifestEntriesAllowingFile('outside.cjs'), []);
});

test('compiled patterns retain raw forbidden order and compile once per invocation', (context) => {
  const NativeRegExp = RegExp;
  let constructions = 0;
  context.mock.method(globalThis, 'RegExp', function (...args) {
    constructions++;
    return new NativeRegExp(...args);
  });
  const entries = [
    entry(
      'A',
      ['scripts/**', 'scripts/** again'],
      ['scripts/task.cjs first', 'scripts/task.cjs second']
    ),
    entry('B', ['scripts/task.cjs']),
  ];
  const matcher = new FeatureMechanizationSurfaceMatcher(entries);
  assert.equal(constructions, 2);
  const patterns = matcher.collectSurfacePatterns(
    'forbiddenImplementationSurfaces',
    entries.slice(0, 1)
  );
  assert.deepEqual(
    patterns.map((pattern) => pattern.raw),
    ['scripts/task.cjs first', 'scripts/task.cjs second']
  );
  for (let i = 0; i < 20; i++) {
    assert.equal(matcher.matchesSurface('scripts/task.cjs', patterns[0]), true);
    assert.equal(
      matcher.findMostSpecificManifestEntriesAllowingFile('scripts/task.cjs')[0],
      entries[1]
    );
  }
  assert.equal(constructions, 2);
  entries[1].manifest.allowedImplementationSurfaces = ['elsewhere/**'];
  const next = new FeatureMechanizationSurfaceMatcher(entries);
  assert.equal(next.findMostSpecificManifestEntriesAllowingFile('scripts/task.cjs')[0], entries[0]);
  assert.equal(constructions, 5);
});
