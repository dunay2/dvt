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
  type DvtSubstraitCapabilityCategory,
  type DvtSubstraitStandardCapabilityV1,
  type DvtSubstraitStandardSemanticIdentityV1,
} from '../src/substrait.js';

const EVIDENCE = ['dvt:#2640'];

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
  it('reuses the exact #2595 profile and begins with candidates only', () => {
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

  it('uses exact relation variants and RelCommon.Emit instead of SQL keyword identities', () => {
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
    expect(
      DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.map((entry) => entry.entryId).join('\n')
    ).not.toMatch(/where|having|group-by|count-distinct|input-rel/i);
  });

  it('keeps decimal and non-decimal SUM as different upstream identities', () => {
    const nonDecimal = buildDvtSubstraitStandardCapabilityId('aggregate-function', {
      sourceKind: 'simple-extension',
      urn: 'extension:io.substrait:functions_arithmetic',
      name: 'sum',
    });
    const decimal = buildDvtSubstraitStandardCapabilityId('aggregate-function', {
      sourceKind: 'simple-extension',
      urn: 'extension:io.substrait:functions_arithmetic_decimal',
      name: 'sum',
    });

    expect(nonDecimal).not.toBe(decimal);
    expect(findDvtSubstraitCapabilityV1(nonDecimal)).toMatchObject({
      kind: 'standard',
      profileStatus: 'candidate-standard',
    });
    expect(findDvtSubstraitCapabilityV1(decimal)).toMatchObject({
      kind: 'standard',
      profileStatus: 'candidate-standard',
    });
  });

  it('keeps product gaps structurally separate from standard identities', () => {
    const jsonbId = buildDvtSubstraitProductNeedCapabilityId('type', 'postgres-jsonb');
    const jsonb = findDvtSubstraitCapabilityV1(jsonbId);

    expect(jsonb).toMatchObject({
      kind: 'product-need',
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
        evidenceRefs: EVIDENCE,
      }).success
    ).toBe(false);
  });

  it('rejects forged ids, provider metadata, anchors and private extension identities', () => {
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

  it('orders entry ids by locale-independent code units', () => {
    const upper = standardEntry('relation', { sourceKind: 'core', message: 'I' });
    const lower = standardEntry('relation', { sourceKind: 'core', message: 'i' });
    const serialized = serializeDvtSubstraitCapabilityCatalogV1({
      schemaVersion: DVT_SUBSTRAIT_CAPABILITY_CATALOG_SCHEMA_VERSION,
      profile: DVT_SUBSTRAIT_PROFILE_REF_V1,
      entries: [lower, upper],
    });
    const parsed = JSON.parse(serialized) as { entries: Array<{ entryId: string }> };

    expect(parsed.entries.map((entry) => entry.entryId)).toEqual([upper.entryId, lower.entryId]);
  });

  it('rejects duplicate entries and serializes independently of input ordering', () => {
    const canonical = serializeDvtSubstraitCapabilityCatalogV1(DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1);
    const reversed = {
      ...DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
      entries: [...DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries]
        .reverse()
        .map((entry) => ({ ...entry, evidenceRefs: [...entry.evidenceRefs].reverse() })),
    };

    expect(serializeDvtSubstraitCapabilityCatalogV1(reversed)).toBe(canonical);

    const duplicate = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries[0];
    if (!duplicate) throw new Error('Expected seeded capability entries.');
    expect(
      DvtSubstraitCapabilityCatalogV1Schema.safeParse({
        ...DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
        entries: [...DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries, duplicate],
      }).success
    ).toBe(false);
  });

  it('does not let core selectors masquerade as function-family authority', () => {
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
