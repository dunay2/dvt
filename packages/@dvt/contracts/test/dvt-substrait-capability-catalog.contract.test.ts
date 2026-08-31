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

function findCapability(
  entryId: string
): (typeof DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries)[number] | undefined {
  return DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.find((entry) => entry.entryId === entryId);
}

describe('DVT Substrait capability catalog V1', () => {
  it('reuses the exact #2595 profile and admits only proven VTX2 semantics', () => {
    expect(DVT_SUBSTRAIT_CAPABILITY_CATALOG_SCHEMA_VERSION).toBe(
      'dvt-substrait-capability-catalog.v1'
    );
    expect(DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.profile).toEqual(DVT_SUBSTRAIT_PROFILE_REF_V1);
    expect(DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.profile.specVersion).toBe('0.101.0');
    expect(DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries).toHaveLength(51);

    const pilotIds = [
      buildDvtSubstraitStandardCapabilityId('relation', {
        sourceKind: 'core',
        message: 'substrait.ReadRel',
        selector: 'read_type.named_table',
      }),
      buildDvtSubstraitStandardCapabilityId('relation', {
        sourceKind: 'core',
        message: 'substrait.RelCommon',
        selector: 'emit_kind.emit',
      }),
      buildDvtSubstraitStandardCapabilityId('relation', {
        sourceKind: 'core',
        message: 'substrait.ProjectRel',
      }),
      buildDvtSubstraitStandardCapabilityId('expression-form', {
        sourceKind: 'core',
        message: 'substrait.Expression',
        selector: 'rex_type.selection',
      }),
      buildDvtSubstraitStandardCapabilityId('expression-form', {
        sourceKind: 'core',
        message: 'substrait.Expression',
        selector: 'rex_type.scalar_function',
      }),
      buildDvtSubstraitStandardCapabilityId('type', {
        sourceKind: 'core',
        message: 'substrait.Type',
        selector: 'kind.string',
      }),
      buildDvtSubstraitStandardCapabilityId('scalar-function', {
        sourceKind: 'simple-extension',
        urn: 'extension:io.substrait:functions_string',
        name: 'trim',
      }),
      buildDvtSubstraitStandardCapabilityId('scalar-function', {
        sourceKind: 'simple-extension',
        urn: 'extension:io.substrait:functions_string',
        name: 'upper',
      }),
    ];
    const innerJoinIds = [
      buildDvtSubstraitStandardCapabilityId('relation', {
        sourceKind: 'core',
        message: 'substrait.JoinRel',
        selector: 'JoinType.JOIN_TYPE_INNER',
      }),
      buildDvtSubstraitStandardCapabilityId('scalar-function', {
        sourceKind: 'simple-extension',
        urn: 'extension:io.substrait:functions_comparison',
        name: 'equal',
      }),
      buildDvtSubstraitStandardCapabilityId('type', {
        sourceKind: 'core',
        message: 'substrait.Type',
        selector: 'kind.bool',
      }),
    ];
    const supported = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.filter(
      (entry) => entry.kind === 'standard' && entry.profileStatus === 'supported-profile'
    );

    expect(supported.map((entry) => entry.entryId)).toEqual([...pilotIds, ...innerJoinIds].sort());
    for (const entryId of pilotIds) {
      expect(findCapability(entryId)).toMatchObject({
        profileStatus: 'supported-profile',
        evidenceRefs: expect.arrayContaining(['dvt:#2598']),
      });
    }
    for (const entryId of innerJoinIds) {
      expect(findCapability(entryId)).toMatchObject({
        profileStatus: 'supported-profile',
        evidenceRefs: expect.arrayContaining(['dvt:#2634']),
      });
    }

    expect(
      findCapability(
        buildDvtSubstraitStandardCapabilityId('relation', {
          sourceKind: 'core',
          message: 'substrait.JoinRel',
          selector: 'JoinType.JOIN_TYPE_LEFT',
        })
      )
    ).toMatchObject({ profileStatus: 'candidate-standard' });
    expect(
      findCapability(
        buildDvtSubstraitStandardCapabilityId('scalar-function', {
          sourceKind: 'simple-extension',
          urn: 'extension:io.substrait:functions_comparison',
          name: 'not_equal',
        })
      )
    ).toMatchObject({ profileStatus: 'candidate-standard' });
    expect(
      findCapability(
        buildDvtSubstraitStandardCapabilityId('type', {
          sourceKind: 'core',
          message: 'substrait.Type',
          selector: 'kind.i32',
        })
      )
    ).toMatchObject({ profileStatus: 'candidate-standard' });
    expect(
      findCapability(
        buildDvtSubstraitStandardCapabilityId('scalar-function', {
          sourceKind: 'simple-extension',
          urn: 'extension:io.substrait:functions_string',
          name: 'lower',
        })
      )
    ).toMatchObject({ profileStatus: 'candidate-standard' });
    expect(
      findCapability(
        buildDvtSubstraitStandardCapabilityId('relation', {
          sourceKind: 'core',
          message: 'substrait.FilterRel',
        })
      )
    ).toMatchObject({ profileStatus: 'candidate-standard' });
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
    expect(findCapability(nonDecimal)).toMatchObject({
      kind: 'standard',
      profileStatus: 'candidate-standard',
    });
    expect(findCapability(decimal)).toMatchObject({
      kind: 'standard',
      profileStatus: 'candidate-standard',
    });
  });

  it('keeps product gaps structurally separate from standard identities', () => {
    const jsonbId = buildDvtSubstraitProductNeedCapabilityId('type', 'postgres-jsonb');
    const jsonb = findCapability(jsonbId);

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
