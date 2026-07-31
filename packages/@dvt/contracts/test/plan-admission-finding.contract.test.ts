import { describe, expect, it } from 'vitest';

import {
  PLAN_ADMISSION_FINDING_PHASE,
  createPlanAdmissionFindingId,
  parsePlanAdmissionFinding,
  parsePlanAdmissionFindingCollection,
  type PlanAdmissionFindingIdentityInput,
  type PlanRef,
} from '../src/index.js';

const PLAN_REF = {
  uri: 'plan://tenant-a/plan-a',
  sha256: 'a'.repeat(64),
  schemaVersion: '1.0.0',
  planId: 'plan-a',
  planVersion: '1.0.0',
} as PlanRef;

function buildSelectionIdentity(
  overrides: Partial<
    Extract<PlanAdmissionFindingIdentityInput, { phase: 'preview-selection' }>
  > = {}
): Extract<PlanAdmissionFindingIdentityInput, { phase: 'preview-selection' }> {
  return {
    phase: PLAN_ADMISSION_FINDING_PHASE.previewSelection,
    code: 'REJECTED',
    cause: 'authorized_scope_incomplete',
    requestId: 'request-a',
    subjects: [
      { kind: 'selection', id: 'selection-a' },
      { kind: 'request', id: 'request-a' },
    ],
    evidence: [
      {
        evidenceCode: 'AUTHORIZED_SCOPE_PRESENT',
        observedValue: false,
        expectedValue: true,
        subject: { kind: 'request', id: 'request-a' },
      },
      {
        evidenceCode: 'SELECTION_MODE',
        observedValue: 'selected',
        reference: { kind: 'request', id: 'request-a' },
      },
    ],
    ...overrides,
  };
}

function buildSelectionFinding() {
  const identity = buildSelectionIdentity();
  return {
    ...identity,
    findingId: createPlanAdmissionFindingId(identity),
    remediationCode: 'REQUEST_AUTHORIZED_SCOPE',
  } as const;
}

function buildExecutabilityIdentity(
  overrides: Partial<
    Extract<PlanAdmissionFindingIdentityInput, { phase: 'plan-executability' }>
  > = {}
): Extract<PlanAdmissionFindingIdentityInput, { phase: 'plan-executability' }> {
  return {
    phase: PLAN_ADMISSION_FINDING_PHASE.planExecutability,
    code: 'MISSING_CAPABILITY',
    cause: 'executor.dbt',
    planRef: PLAN_REF,
    adapterId: 'temporal',
    degradable: false,
    subjects: [
      { kind: 'plan', id: PLAN_REF.planId },
      { kind: 'adapter', id: 'temporal' },
    ],
    evidence: [
      {
        evidenceCode: 'REQUIRED_CAPABILITY',
        observedValue: false,
        expectedValue: true,
        subject: { kind: 'adapter', id: 'temporal' },
      },
    ],
    ...overrides,
  };
}

describe('PlanAdmissionFinding contract', () => {
  it('derives the same identity from canonically equivalent subject and evidence sets', () => {
    const identity = buildSelectionIdentity();
    const reordered = buildSelectionIdentity({
      subjects: [...identity.subjects].reverse(),
      evidence: [...identity.evidence].reverse(),
    });

    expect(createPlanAdmissionFindingId(reordered)).toBe(createPlanAdmissionFindingId(identity));
  });

  it('changes identity when the authoritative evaluation identity changes', () => {
    const selection = buildSelectionIdentity();
    const executability = buildExecutabilityIdentity();

    expect(createPlanAdmissionFindingId({ ...selection, requestId: 'request-b' })).not.toBe(
      createPlanAdmissionFindingId(selection)
    );
    expect(
      createPlanAdmissionFindingId({
        ...executability,
        planRef: { ...PLAN_REF, sha256: 'b'.repeat(64) },
      })
    ).not.toBe(createPlanAdmissionFindingId(executability));
  });

  it('accepts strict selection findings without persisted-plan identity', () => {
    const finding = buildSelectionFinding();

    expect(parsePlanAdmissionFinding(finding)).toEqual(finding);
    expect(() => parsePlanAdmissionFinding({ ...finding, planRef: PLAN_REF })).toThrow();
  });

  it('requires exact plan and adapter identity for executability findings', () => {
    const identity = buildExecutabilityIdentity();
    const finding = {
      ...identity,
      findingId: createPlanAdmissionFindingId(identity),
      remediationCode: 'CHANGE_TARGET_OR_PLAN_REQUIREMENTS',
    } as const;

    expect(parsePlanAdmissionFinding(finding)).toEqual(finding);
    const { planRef: _planRef, ...withoutPlanRef } = finding;
    expect(() => parsePlanAdmissionFinding(withoutPlanRef)).toThrow();
  });

  it('rejects non-canonical identities, executable remediation values, and rich evidence objects', () => {
    const finding = buildSelectionFinding();

    expect(() =>
      parsePlanAdmissionFinding({
        ...finding,
        findingId: `plan-admission-finding.v1:${'0'.repeat(64)}`,
      })
    ).toThrow();
    expect(() =>
      parsePlanAdmissionFinding({ ...finding, remediationCode: 'https://example.com/fix' })
    ).toThrow();
    expect(() =>
      parsePlanAdmissionFinding({
        ...finding,
        evidence: [{ evidenceCode: 'RAW_CONTEXT', observedValue: { secret: true } }],
      })
    ).toThrow();
  });

  it('keeps the first slice fail-fast with exactly one finding', () => {
    const finding = buildSelectionFinding();

    expect(parsePlanAdmissionFindingCollection([finding])).toEqual([finding]);
    expect(() => parsePlanAdmissionFindingCollection([])).toThrow();
    expect(() => parsePlanAdmissionFindingCollection([finding, finding])).toThrow();
  });
});
