import { describe, expect, it } from 'vitest';

import {
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  DvtSubstraitCapabilityCatalogV1Schema,
  DvtSubstraitProductNeedCapabilityV1Schema,
  DvtSubstraitStandardCapabilityV1Schema,
  buildDvtSubstraitProductNeedCapabilityId,
  buildDvtSubstraitStandardCapabilityId,
  serializeDvtSubstraitCapabilityCatalogV1,
  type DvtSubstraitCapabilityCategory,
  type DvtSubstraitStandardCapabilityV1,
  type DvtSubstraitStandardSemanticIdentityV1,
} from '../src/substrait.js';

const EVIDENCE = ['dvt:#2640'];
const findCapability = (
  entryId: string
): (typeof DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries)[number] | undefined =>
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.find((entry) => entry.entryId === entryId);
function standardEntry(
  category: DvtSubstraitCapabilityCategory,
  identity: DvtSubstraitStandardSemanticIdentityV1
): DvtSubstraitStandardCapabilityV1 {
  return {
    kind: 'standard',
    entryId: buildDvtSubstraitStandardCapabilityId(category, identity),
    category,
    identity,
    profileStatus: 'candidate-standard',
    evidenceRefs: EVIDENCE,
  };
}

describe('DVT Substrait capability catalog V1', () => {
  it('admits only entries with complete evidence under the pinned profile', () => {
    expect(
      DvtSubstraitCapabilityCatalogV1Schema.safeParse(DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1).success
    ).toBe(true);
    expect(DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.profile).toEqual(DVT_SUBSTRAIT_PROFILE_REF_V1);

    const standards = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.filter(
      (entry) => entry.kind === 'standard'
    );
    const supported = standards.filter((entry) => entry.profileStatus === 'supported-profile');
    const candidates = standards.filter((entry) => entry.profileStatus !== 'supported-profile');
    expect(supported.length).toBeGreaterThan(0);
    expect(supported.every((entry) => entry.admission !== undefined)).toBe(true);
    expect(candidates.every((entry) => entry.admission === undefined)).toBe(true);
  });

  it('uses exact standard relation variants rather than SQL keyword identities', () => {
    const expected = [
      buildDvtSubstraitStandardCapabilityId('relation', {
        sourceKind: 'core',
        message: 'substrait.RelCommon',
        selector: 'emit_kind.emit',
      }),
      buildDvtSubstraitStandardCapabilityId('relation', {
        sourceKind: 'core',
        message: 'substrait.JoinRel',
        selector: 'JoinType.JOIN_TYPE_INNER',
      }),
      buildDvtSubstraitStandardCapabilityId('relation', {
        sourceKind: 'core',
        message: 'substrait.SetRel',
        selector: 'SetOp.SET_OP_MINUS_PRIMARY',
      }),
    ];
    const actual = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.map((entry) => entry.entryId);

    expect(actual).toEqual(expect.arrayContaining(expected));
    expect(actual.join('\n')).not.toMatch(/where|having|group-by|count-distinct|input-rel/i);
  });

  it('admits FilterRel for the governed Source predicate slice', () => {
    const filter = findCapability(
      buildDvtSubstraitStandardCapabilityId('relation', {
        sourceKind: 'core',
        message: 'substrait.FilterRel',
      })
    );

    expect(filter).toMatchObject({
      profileStatus: 'supported-profile',
      admission: {
        productUseCaseRef: 'dvt:#2894',
        targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
        visualExposure: { status: 'exposed' },
      },
    });
  });

  it('keeps same-named functions from different upstream families distinct', () => {
    const arithmetic = buildDvtSubstraitStandardCapabilityId('aggregate-function', {
      sourceKind: 'simple-extension',
      urn: 'extension:io.substrait:functions_arithmetic',
      name: 'sum',
    });
    const decimal = buildDvtSubstraitStandardCapabilityId('aggregate-function', {
      sourceKind: 'simple-extension',
      urn: 'extension:io.substrait:functions_arithmetic_decimal',
      name: 'sum',
    });

    expect(arithmetic).not.toBe(decimal);
    expect(findCapability(arithmetic)).toMatchObject({ profileStatus: 'candidate-standard' });
    expect(findCapability(decimal)).toMatchObject({ profileStatus: 'candidate-standard' });
  });

  it('keeps product gaps structurally separate from standard identities', () => {
    const entryId = buildDvtSubstraitProductNeedCapabilityId('type', 'postgres-jsonb');
    expect(findCapability(entryId)).toMatchObject({
      kind: 'product-need',
      profileStatus: 'candidate-extension',
      extensionPoint: 'simple-extension-type',
    });
    expect(findCapability(entryId)).not.toHaveProperty('identity');
    expect(
      DvtSubstraitProductNeedCapabilityV1Schema.safeParse({
        kind: 'product-need',
        entryId,
        category: 'type',
        productNeedId: 'postgres-jsonb',
        productNeed: 'Portable JSONB semantics.',
        profileStatus: 'candidate-extension',
        evidenceRefs: EVIDENCE,
      }).success
    ).toBe(false);
  });

  it('rejects forged ids, provider metadata, anchors, and private extension identities', () => {
    const trim = standardEntry('scalar-function', {
      sourceKind: 'simple-extension',
      urn: 'extension:io.substrait:functions_string',
      name: 'trim',
    });
    expect(
      DvtSubstraitStandardCapabilityV1Schema.safeParse({ ...trim, entryId: 'trim' }).success
    ).toBe(false);
    expect(
      DvtSubstraitStandardCapabilityV1Schema.safeParse({ ...trim, functionAnchor: 7 }).success
    ).toBe(false);
    expect(
      DvtSubstraitStandardCapabilityV1Schema.safeParse({
        ...trim,
        providerSupport: { postgres: true },
      }).success
    ).toBe(false);
    expect(
      DvtSubstraitStandardCapabilityV1Schema.safeParse(
        standardEntry('scalar-function', {
          sourceKind: 'simple-extension',
          urn: 'extension:com.example:functions_string',
          name: 'trim',
        })
      ).success
    ).toBe(false);
  });

  it('canonicalizes order and rejects duplicate entries', () => {
    const canonical = serializeDvtSubstraitCapabilityCatalogV1(DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1);
    const reversed = {
      ...DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
      entries: [...DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries].reverse(),
    };
    expect(serializeDvtSubstraitCapabilityCatalogV1(reversed)).toBe(canonical);

    const duplicate = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries[0];
    if (!duplicate) throw new Error('Expected a seeded capability.');
    expect(
      DvtSubstraitCapabilityCatalogV1Schema.safeParse({
        ...DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
        entries: [...DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries, duplicate],
      }).success
    ).toBe(false);
  });
});
