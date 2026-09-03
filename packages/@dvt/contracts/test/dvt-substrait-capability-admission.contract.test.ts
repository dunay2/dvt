import { describe, expect, it } from 'vitest';

import {
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
  DvtSubstraitExtensionProposalV1Schema,
  DvtSubstraitStandardCapabilityV1Schema,
  assertDvtSubstraitExtensionProposalV1,
  buildDvtSubstraitStandardCapabilityId,
  type DvtSubstraitStandardCapabilityV1,
} from '../src/substrait.js';

const LOWER_ID = buildDvtSubstraitStandardCapabilityId('scalar-function', {
  sourceKind: 'simple-extension',
  urn: 'extension:io.substrait:functions_string',
  name: 'lower',
});
const STRUCT_ID = buildDvtSubstraitStandardCapabilityId('type', {
  sourceKind: 'core',
  message: 'substrait.Type',
  selector: 'kind.struct',
});

function lowerCapability(): DvtSubstraitStandardCapabilityV1 {
  const entry = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.find(
    (candidate) => candidate.entryId === LOWER_ID
  );
  if (entry?.kind !== 'standard') throw new Error('Expected the standard lower capability.');
  return entry;
}

function extensionProposal(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    kind: 'dvt-extension-proposal',
    extensionId: 'masked-lower',
    productUseCaseRef: 'dvt:#2641',
    coreSearchRef: 'substrait:v0.101.0:proto/substrait/algebra.proto',
    standardExtensionSearchRef: 'substrait:v0.101.0:extensions/functions_string.yaml',
    upstreamGapRef: 'https://github.com/substrait-io/substrait/issues/9999',
    boundedVersion: '1.0.0',
    failClosedEvidenceRef: 'packages/@dvt/contracts/test/private-extension.contract.test.ts',
    convergenceRef: 'dvt:#2641',
    reviewedStandardEntryIds: [],
    targetConformance: {
      status: 'unavailable',
      targetId: 'postgres',
      evidenceRefs: ['dvt:#2641'],
    },
    visualExposure: { status: 'not-exposed', rationale: 'Semantic review precedes UI work.' },
    ...overrides,
  };
}

describe('DVT Substrait standard-first capability admission', () => {
  it('admits structured fields without claiming an unavailable target projection', () => {
    expect(
      DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.find(
        (candidate) => candidate.entryId === STRUCT_ID
      )
    ).toMatchObject({
      profileStatus: 'supported-profile',
      admission: {
        targetConformance: [
          expect.objectContaining({ targetId: 'postgres', status: 'unavailable' }),
        ],
        visualExposure: { status: 'not-exposed' },
      },
    });
  });

  it('retains complete conformance evidence without implying provider acceptance', () => {
    const lower = lowerCapability();

    expect(lower).toMatchObject({
      profileStatus: 'supported-profile',
      admission: {
        kind: 'standard-admission',
        targetConformance: expect.arrayContaining([
          expect.objectContaining({ targetId: 'postgres', status: 'mapped' }),
        ]),
        visualExposure: { status: 'exposed', evidenceRefs: expect.any(Array) },
      },
    });
    expect(lower.admission?.targetConformance).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ status: 'provider-accepted' })])
    );
  });

  it('rejects supported status when the admission evidence is incomplete', () => {
    const lower = lowerCapability();

    expect(
      DvtSubstraitStandardCapabilityV1Schema.safeParse({ ...lower, admission: undefined }).success
    ).toBe(false);
    expect(
      DvtSubstraitStandardCapabilityV1Schema.safeParse({
        ...lower,
        admission: { ...lower.admission, negativeValidationRef: undefined },
      }).success
    ).toBe(false);
  });

  it('rejects a private extension that duplicates a reviewed standard identity', () => {
    expect(() =>
      assertDvtSubstraitExtensionProposalV1(
        DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
        extensionProposal({ reviewedStandardEntryIds: [LOWER_ID] })
      )
    ).toThrow(/duplicates admitted or candidate standard capability/i);
  });

  it('requires explicit upstream gap evidence before a bounded DVT extension review', () => {
    expect(
      DvtSubstraitExtensionProposalV1Schema.safeParse(
        extensionProposal({ upstreamGapRef: undefined })
      ).success
    ).toBe(false);

    expect(
      assertDvtSubstraitExtensionProposalV1(
        DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
        extensionProposal()
      )
    ).toMatchObject({ extensionId: 'masked-lower' });
  });
});
