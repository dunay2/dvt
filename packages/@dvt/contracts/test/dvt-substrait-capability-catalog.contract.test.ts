import { describe, expect, it } from 'vitest';

import {
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_SCHEMA_VERSION,
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  DvtSubstraitCapabilityCatalogV1Schema,
  DvtSubstraitProductNeedCapabilityV1Schema,
  DvtSubstraitStandardCapabilityV1Schema,
  buildDvtSubstraitProductNeedCapabilityId,
  buildDvtSubstraitStandardCapabilityId,
  findDvtSubstraitCapabilityV1,
  serializeDvtSubstraitCapabilityCatalogV1,
} from '../src/substrait.js';

const STUDY_EVIDENCE = ['dvt:#2640'];

function standardEntry(
  category: 'relation' | 'expression-form' | 'scalar-function' | 'aggregate-function' | 'window-function' | 'type',
  identity:
    | { sourceKind: 'core'; message: string; selector?: string }
    | { sourceKind: 'simple-extension'; urn: string; name: string }
) {
  return {
    kind: 'standard' as const,
    entryId: buildDvtSubstraitStandardCapabilityId(category, identity),
    category,
    identity,
    profileStatus: 'candidate-standard' as const,
    evidenceRefs: STUDY_EVIDENCE,
  };
}

describe('DVT Substrait capability catalog V1', () => {
  it('reuses the exact #2595 profile and seeds only selected governance candidates', () => {
    expect(DVT_SUBSTRAIT_CAPABILITY_CATALOG_SCHEMA_VERSION).toBe(
      'dvt-substrait-capability-catalog.v1'
    );
    expect(DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.profile).toEqual(DVT_SUBSTRAIT_PROFILE_REF_V1);
    expect(DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.profile.specVersion).toBe('0.101.0');
    expect(DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries).toHaveLength(51);
    expect(
      DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.filter(
        (entry) => entry.kind === 'standard' && entry.profileStatus === 'supported-profile'
      )
    ).toEqual([]);
  });

  it('records exact relation variants and RelCommon.Emit instead of SQL keyword identities', () => {
    const expectedIds = [
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
        message: 'substrait.JoinRel',
        selector: 'JoinType.JOIN_TYPE_LEFT',
      }),
      buildDvtSubstraitStandardCapabilityId('relation', {
        sourceKind: 'core',
        message: 'substrait.SetRel',
        selector: 'SetOp.SET_OP_INTERSECTION_MULTISET',
      }),
      buildDvtSubstraitStandardCapabilityId('relation', {
        sourceKind: 'core',
        message: 'substrait.SetRel',
        selector: 'SetOp.SET_OP_MINUS_PRIMARY',
      }),
    ];

    expect(DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.map((entry) => entry.entryId)).toEqual(
      expect.arrayContaining(expectedIds)
    );
    expect(DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.map((entry) => entry.entryId).join('\n'))
      .not.toMatch(/where|having|group-by|count-distinct|input-rel/i);
  });

  it('keeps typed SUM resolution as two official upstream semantic identities', () => {
    const nonDecimalSum = buildDvtSubstraitStandardCapabilityId('aggregate-function', {
      sourceKind: 'simple-extension',
      urn: 'extension:io.substrait:functions_arithmetic',
      name: 'sum',
    });
    const decimalSum = buildDvtSubstraitStandardCapabilityId('aggregate-function', {
      sourceKind: 'simple-extension',
      urn: 'extension:io.substrait:functions_arithmetic_decimal',
      name: 'sum',
    });

    expect(nonDecimalSum).not.toBe(decimalSum);
    expect(findDvtSubstraitCapabilityV1(nonDecimalSum)).toMatchObject({
      kind: 'standard',
      profileStatus: 'candidate-standard',
    });
    expect(findDvtSubstraitCapabilityV1(decimalSum)).toMatchObject({
      kind: 'standard',
      profileStatus: 'candidate-standard',
    });
  });

  it('keeps standard identities structurally separate from product gaps and extension candidates', () => {
    const jsonbId = buildDvtSubstraitProductNeedCapabilityId('type', 'postgres-jsonb');
    const jsonb = findDvtSubstraitCapabilityV1(jsonbId);
    expect(jsonb).toMatchObject({
      kind: 'product-need',
      category: 'type',
      profileStatus: 'candidate-extension',
      extensionPoint: 'simple-extension-type',
    });
    expect(jsonb).not.toHaveProperty('identity');

    expect(
      DvtSubstraitProductNeedCapabilityV1Schema.safeParse({
        kind: 'product-need',
        entryId: jsonbId,
        category: 'type',
        productNeedId: 'postgres-jsonb',
        productNeed: 'Portable JSONB semantics.',
        profileStatus: 'candidate-extension',
        evidenceRefs: STUDY_EVIDENCE,
      }).success
    ).toBe(false);
    expect(
      DvtSubstraitProductNeedCapabilityV1Schema.safeParse({
        kind: 'product-need',
        entryId: jsonbId,
        category: 'type',
        productNeedId: 'postgres-jsonb',
        productNeed: 'Portable JSONB semantics.',
        profileStatus: 'gap',
        identity: { sourceKind: 'core', message: 'substrait.Type', selector: 'kind.jsonb' },
        evidenceRefs: STUDY_EVIDENCE,
      }).success
    ).toBe(false);
  });

  it('rejects forged ids, plan-local/provider metadata, and non-official standard extensions', () => {
    const trim = standardEntry('scalar-function', {
      sourceKind: 'simple-extension',
      urn: 'extension:io.substrait:functions_string',
      name: 'trim',
    });

    expect(
      DvtSubstraitStandardCapabilityV1Schema.safeParse({ ...trim, entryId: 'trim' }).success
    ).toBe(false);
    expect(
      DvtSubstraitStandardCapabilityV1Schema.safeParse({
        ...trim,
        functionAnchor: 7,
      }).success
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

  it('rejects duplicate catalog identities and serializes deterministically', () => {
    const first = serializeDvtSubstraitCapabilityCatalogV1(DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1);
    const reversed = {
      ...DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
      entries: [...DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries]
        .reverse()
        .map((entry) => ({ ...entry, evidenceRefs: [...entry.evidenceRefs].reverse() })),
    };

    expect(serializeDvtSubstraitCapabilityCatalogV1(reversed)).toBe(first);

    const duplicate = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries[0];
    if (!duplicate) throw new Error('Expected seeded capability entries.');
    expect(
      DvtSubstraitCapabilityCatalogV1Schema.safeParse({
        ...DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
        entries: [...DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries, duplicate],
      }).success
    ).toBe(false);
  });

  it('does not let a core identity masquerade as a function-family authority', () => {
    expect(
      DvtSubstraitStandardCapabilityV1Schema.safeParse(
        standardEntry('aggregate-function', {
          sourceKind: 'core',
          message: 'substrait.AggregateFunction',
          selector: 'sum',
        })
      ).success
    ).toBe(false);
  });
});
