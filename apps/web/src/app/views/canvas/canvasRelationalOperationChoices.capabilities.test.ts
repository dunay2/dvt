import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 } from '@dvt/contracts';

import {
  resolveCanvasRelationalOperationChoices,
  resolveCanvasRelationalProjectionChoice,
  resolveCanvasRelationalStagedOperationChoices,
  type CanvasOperationFacts,
  type CanvasRelationalOperationChoice,
} from './canvasRelationalOperationChoices';

const { catalog, buildIdentity } = vi.hoisted(() => ({
  catalog: { entries: [] as unknown[] },
  buildIdentity: vi.fn(),
}));
vi.mock('@dvt/contracts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dvt/contracts')>();
  return {
    ...actual,
    DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1: catalog,
    buildDvtSubstraitStandardCapabilityId: buildIdentity.mockImplementation(
      actual.buildDvtSubstraitStandardCapabilityId
    ),
  };
});

const facts: CanvasOperationFacts = {
  readOnly: false,
  inputCount: 2,
  sameConnection: true,
  completeSchema: true,
  comparableFields: true,
  predicateAvailable: true,
  sets: {},
};
const ids = [
  'substrait/core/relation/substrait.JoinRel/JoinType.JOIN_TYPE_INNER',
  'substrait/core/relation/substrait.ProjectRel',
];

beforeEach(async () => {
  const actual = await vi.importActual<typeof import('@dvt/contracts')>('@dvt/contracts');
  catalog.entries = structuredClone(actual.DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries);
  buildIdentity.mockClear();
});

function reviseAdmission(posture: Record<string, unknown>): void {
  catalog.entries = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.map((entry) =>
    ids.includes(entry.entryId) && entry.kind === 'standard'
      ? { ...entry, admission: { ...entry.admission, ...posture } }
      : entry
  );
}

function choices(): readonly (CanvasRelationalOperationChoice | undefined)[] {
  return [
    resolveCanvasRelationalOperationChoices(facts).find(
      (choice) => choice.operation === 'inner_join'
    ),
    resolveCanvasRelationalProjectionChoice(false),
  ];
}

describe('canonical capability postures in operation choices', () => {
  it('references published opaque IDs without reconstructing Substrait identities', () => {
    expect(choices()).toEqual([
      { operation: 'inner_join', availability: 'available', selectable: true },
      { operation: 'projection', availability: 'available', selectable: true },
    ]);
    expect(buildIdentity).not.toHaveBeenCalled();
  });

  it.each([
    { visualExposure: { status: 'not-exposed', rationale: 'Not yet exposed.' } },
    { visualExposure: undefined },
  ])('does not offer a semantically admitted but unexposed operation: %j', (posture) => {
    reviseAdmission(posture);
    for (const choice of choices()) {
      expect(choice).toMatchObject({ availability: 'semantically-unavailable', selectable: false });
    }
  });

  it.each([
    { targetConformance: undefined },
    { targetConformance: [] },
    { targetConformance: [{ targetId: 'other', status: 'mapped', evidenceRefs: ['proof'] }] },
    {
      targetConformance: [{ targetId: 'postgres', status: 'unavailable', evidenceRefs: ['proof'] }],
    },
    { targetConformance: [{ targetId: 'postgres', evidenceRefs: ['proof'] }] },
  ])('requires explicit PostgreSQL conformance: %j', ({ targetConformance }) => {
    reviseAdmission({ targetConformance });
    for (const choice of choices()) {
      expect(choice).toMatchObject({ availability: 'target-unavailable', selectable: false });
    }
    expect(resolveCanvasRelationalStagedOperationChoices(false)[0]).toMatchObject({
      availability: 'target-unavailable',
      selectable: false,
    });
  });

  it('fails closed when a referenced capability or its admission disappears', () => {
    catalog.entries = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.map((entry) =>
      ids.includes(entry.entryId) ? { ...entry, admission: undefined } : entry
    );
    for (const choice of choices()) expect(choice?.selectable).toBe(false);
    catalog.entries = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.filter(
      (entry) => !ids.includes(entry.entryId)
    );
    for (const choice of choices()) expect(choice?.selectable).toBe(false);
  });

  it('does not offer a candidate even if it has an exposure declaration', () => {
    catalog.entries = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.map((entry) =>
      ids.includes(entry.entryId) ? { ...entry, profileStatus: 'candidate' } : entry
    );
    for (const choice of choices()) {
      expect(choice).toMatchObject({ availability: 'semantically-unavailable', selectable: false });
    }
  });

  it('does not turn unrelated catalog candidates into actions and preserves read-only dominance', () => {
    catalog.entries.push({ kind: 'standard', entryId: 'unrelated', profileStatus: 'candidate' });
    expect(resolveCanvasRelationalOperationChoices(facts)).toHaveLength(15);
    reviseAdmission({ visualExposure: undefined });
    expect(resolveCanvasRelationalProjectionChoice(true).availability).toBe('read-only');
    expect(
      resolveCanvasRelationalOperationChoices({ ...facts, readOnly: true }).every(
        (choice) => choice.availability === 'read-only' && !choice.selectable
      )
    ).toBe(true);
  });
});
