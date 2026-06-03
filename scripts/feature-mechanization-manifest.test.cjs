const assert = require('node:assert/strict');
const test = require('node:test');

const {
  extractFeatureMechanizationManifests,
} = require('./lib/feature-mechanization-manifest.cjs');

test('extracts multiple feature mechanization manifests with their source path', () => {
  const markdown = [
    '```feature-mechanization',
    'featureId: ONE',
    'mechanizationStatus: implemented',
    '```',
    '',
    '```feature-mechanization',
    'featureId: TWO',
    'mechanizationStatus: closed',
    '```',
  ].join('\n');

  const manifests = extractFeatureMechanizationManifests(markdown, 'docs/example.md');

  assert.deepEqual(
    manifests.map((entry) => ({
      featureId: entry.manifest.featureId,
      sourcePath: entry.sourcePath,
    })),
    [
      { featureId: 'ONE', sourcePath: 'docs/example.md' },
      { featureId: 'TWO', sourcePath: 'docs/example.md' },
    ]
  );
});

test('returns parse errors without hiding the source path', () => {
  const manifests = extractFeatureMechanizationManifests(
    ['```feature-mechanization', 'featureId: [broken', '```'].join('\n'),
    'docs/broken.md'
  );

  assert.equal(manifests.length, 1);
  assert.equal(manifests[0].sourcePath, 'docs/broken.md');
  assert.equal(manifests[0].manifest, null);
  assert.match(manifests[0].parseError, /unexpected end|missed comma|bad indentation|flow/i);
});

test('returns an empty list when no feature mechanization fence exists', () => {
  assert.deepEqual(extractFeatureMechanizationManifests('# No manifest', 'docs/empty.md'), []);
});
