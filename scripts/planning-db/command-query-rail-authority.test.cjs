/** Owned concern: exact documentary authority eligibility shared by import and writers. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveRailReferenceAuthority } = require('./command-query-rail-authority.cjs');
const { assertManifestRailReferences } = require('./command-query-rail-catalog.cjs');

const reference = {
  railId: 'consumer',
  railType: 'command',
  normalizedRailName: 'previewplan',
  rawRail: { referenceOnly: true, authorityRef: 'docs/api.md' },
};
const authority = {
  railId: 'documentary-definition',
  sourcePath: 'docs/api.md',
  railType: 'command',
  normalizedRailName: 'previewplan',
  railStatus: 'implemented',
  implementationRefCount: 1,
  rawRail: {},
};

test('exact documentary authority is independent of a competing implementation representative', () => {
  const candidates = [
    { ...authority, railId: 'local-winner', sourcePath: 'docs/local.md' },
    authority,
  ];
  assert.deepEqual(resolveRailReferenceAuthority(reference, candidates), {
    sourcePath: 'docs/api.md',
    railType: 'command',
    normalizedRailName: 'previewplan',
  });
  assert.doesNotThrow(() => assertManifestRailReferences([reference, ...candidates]));
});

test('shared policy rejects missing, mismatched, self, inactive, reference-only and gap declarations', () => {
  for (const overrides of [
    { sourcePath: 'docs/other.md' },
    { railType: 'query' },
    { normalizedRailName: 'startrun' },
    { railId: 'consumer' },
    { railStatus: 'retired' },
    { railStatus: 'deprecated' },
    { railStatus: 'planned' },
    { railStatus: 'missing-implementation' },
    { implementationRefCount: 0 },
    { implementationRefCount: undefined },
    { isGap: true },
    { rawRail: { referenceOnly: true } },
  ]) {
    const candidates = [{ ...authority, ...overrides }];
    assert.equal(
      resolveRailReferenceAuthority(reference, candidates),
      null,
      JSON.stringify(overrides)
    );
    assert.throws(
      () => assertManifestRailReferences([reference, ...candidates]),
      /does not resolve authority/
    );
  }
  assert.equal(resolveRailReferenceAuthority(reference, []), null);
});

test('multiple evidence rows resolve the same identity without choosing a feature winner', () => {
  const candidates = [authority, { ...authority, railId: 'second-definition' }];
  assert.deepEqual(
    resolveRailReferenceAuthority(reference, candidates),
    resolveRailReferenceAuthority(reference, [authority])
  );
  assert.deepEqual(
    resolveRailReferenceAuthority(reference, candidates.toReversed()),
    resolveRailReferenceAuthority(reference, candidates)
  );
  assert.doesNotThrow(() => assertManifestRailReferences([reference, ...candidates]));
});
