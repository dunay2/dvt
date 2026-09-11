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

  it.each([
    ['functions_boolean', 'and', 'dvt:#3087'],
    ['functions_boolean', 'or', 'dvt:#3087'],
    ['functions_comparison', 'equal', 'dvt:#2634'],
    ['functions_comparison', 'not_equal', 'dvt:#3087'],
    ['functions_comparison', 'gt', 'dvt:#3087'],
    ['functions_comparison', 'gte', 'dvt:#3087'],
    ['functions_comparison', 'lt', 'dvt:#3087'],
    ['functions_comparison', 'lte', 'dvt:#3087'],
  ])('admits %s/%s for INNER JOIN predicates', (urnName, functionName, useCaseRef) => {
    const capability = findCapability(
      buildDvtSubstraitStandardCapabilityId('scalar-function', {
        sourceKind: 'simple-extension',
        urn: `extension:io.substrait:${urnName}`,
        name: functionName,
      })
    );

    expect(capability).toMatchObject({
      profileStatus: 'supported-profile',
      admission: {
        productUseCaseRef: useCaseRef,
        targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
        visualExposure: { status: 'exposed' },
      },
    });
  });

  it('admits only the bounded binary CONCAT invocation for field stacking', () => {
    const concatId = buildDvtSubstraitStandardCapabilityId('scalar-function', {
      sourceKind: 'simple-extension',
      urn: 'extension:io.substrait:functions_string',
      name: 'concat',
    });

    expect(findCapability(concatId)).toMatchObject({
      profileStatus: 'supported-profile',
      invocation: {
        signature: 'concat:str',
        argumentTypes: ['str'],
        minimumArgumentCount: 2,
        maximumArgumentCount: 2,
        outputType: 'str',
        options: [{ name: 'null_handling', preference: ['ACCEPT_NULLS'] }],
      },
      admission: {
        productUseCaseRef: 'dvt:#2921',
        targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
        visualExposure: { status: 'exposed' },
      },
    });
    expect(
      DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.filter(
        (entry) => entry.kind === 'standard' && entry.invocation !== undefined
      )
    ).toHaveLength(3);
  });

  it('admits the official unbounded variadic COALESCE invocation for PostgreSQL text', () => {
    const coalesceId = buildDvtSubstraitStandardCapabilityId('scalar-function', {
      sourceKind: 'simple-extension',
      urn: 'extension:io.substrait:functions_comparison',
      name: 'coalesce',
    });

    expect(findCapability(coalesceId)).toMatchObject({
      profileStatus: 'supported-profile',
      invocation: {
        signature: 'coalesce:any1',
        argumentTypes: ['any1'],
        minimumArgumentCount: 2,
        outputType: 'any1',
        options: [],
      },
      admission: {
        productUseCaseRef: 'dvt:#2935',
        targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
        visualExposure: { status: 'exposed' },
      },
    });
    expect(findCapability(coalesceId)?.invocation).not.toHaveProperty('maximumArgumentCount');
  });
  it('admits the exact UTC year extraction invocation for timestamptz columns', () => {
    const extractId = buildDvtSubstraitStandardCapabilityId('scalar-function', {
      sourceKind: 'simple-extension',
      urn: 'extension:io.substrait:functions_datetime',
      name: 'extract',
    });

    expect(findCapability(extractId)).toMatchObject({
      profileStatus: 'supported-profile',
      invocation: {
        signature: 'extract:req_ptstz_str',
        argumentTypes: ['req', 'ptstz', 'str'],
        minimumArgumentCount: 3,
        maximumArgumentCount: 3,
        outputType: 'i64',
        options: [],
      },
      admission: {
        productUseCaseRef: 'dvt:#3101',
        targetConformance: [{ targetId: 'postgres', status: 'mapped' }],
        visualExposure: { status: 'exposed' },
      },
    });
  });

  it('rejects malformed or missing bounded CONCAT invocations', () => {
    const concat = findCapability(
      buildDvtSubstraitStandardCapabilityId('scalar-function', {
        sourceKind: 'simple-extension',
        urn: 'extension:io.substrait:functions_string',
        name: 'concat',
      })
    );
    if (concat?.kind !== 'standard') throw new Error('Expected the standard CONCAT capability.');

    const { invocation: _invocation, ...withoutInvocation } = concat;
    expect(DvtSubstraitStandardCapabilityV1Schema.safeParse(withoutInvocation).success).toBe(false);
    expect(
      DvtSubstraitStandardCapabilityV1Schema.safeParse({
        ...concat,
        invocation: { ...concat.invocation, signature: 'concat:str_str' },
      }).success
    ).toBe(false);
    expect(
      DvtSubstraitStandardCapabilityV1Schema.safeParse({
        ...concat,
        invocation: { ...concat.invocation, minimumArgumentCount: 1 },
      }).success
    ).toBe(false);
    expect(
      DvtSubstraitStandardCapabilityV1Schema.safeParse({
        ...concat,
        invocation: { ...concat.invocation, maximumArgumentCount: undefined },
      }).success
    ).toBe(false);
    expect(
      DvtSubstraitStandardCapabilityV1Schema.safeParse({
        ...concat,
        invocation: { ...concat.invocation, outputType: 'bool' },
      }).success
    ).toBe(false);
    expect(
      DvtSubstraitStandardCapabilityV1Schema.safeParse({
        ...concat,
        invocation: { ...concat.invocation, options: [] },
      }).success
    ).toBe(false);
  });

  it('rejects the retired exact arity field and malformed variadic COALESCE bounds', () => {
    const coalesce = findCapability(
      buildDvtSubstraitStandardCapabilityId('scalar-function', {
        sourceKind: 'simple-extension',
        urn: 'extension:io.substrait:functions_comparison',
        name: 'coalesce',
      })
    );
    if (coalesce?.kind !== 'standard') {
      throw new Error('Expected the standard COALESCE capability.');
    }

    expect(
      DvtSubstraitStandardCapabilityV1Schema.safeParse({
        ...coalesce,
        invocation: {
          signature: 'coalesce:any1',
          argumentTypes: ['any1'],
          argumentCount: 2,
          outputType: 'any1',
          options: [],
        },
      }).success
    ).toBe(false);
    const invertedRange = standardEntry('scalar-function', {
      sourceKind: 'simple-extension',
      urn: 'extension:io.substrait:functions_string',
      name: 'upper',
    });
    expect(
      DvtSubstraitStandardCapabilityV1Schema.safeParse({
        ...invertedRange,
        invocation: {
          signature: 'upper:str',
          argumentTypes: ['str'],
          minimumArgumentCount: 2,
          maximumArgumentCount: 1,
          outputType: 'str',
          options: [],
        },
      }).success
    ).toBe(false);
    expect(
      DvtSubstraitStandardCapabilityV1Schema.safeParse({
        ...coalesce,
        invocation: { ...coalesce.invocation, minimumArgumentCount: 1 },
      }).success
    ).toBe(false);
    expect(
      DvtSubstraitStandardCapabilityV1Schema.safeParse({
        ...coalesce,
        invocation: { ...coalesce.invocation, maximumArgumentCount: 2 },
      }).success
    ).toBe(false);
    expect(
      DvtSubstraitStandardCapabilityV1Schema.safeParse({
        ...coalesce,
        invocation: { ...coalesce.invocation, outputType: 'str' },
      }).success
    ).toBe(false);
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
