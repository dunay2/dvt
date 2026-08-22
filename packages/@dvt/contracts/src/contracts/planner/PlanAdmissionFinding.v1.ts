/**
 * Owned concern: publish immutable, structured findings emitted by the two
 * authoritative plan-admission phases.
 *
 * This value contract does not evaluate selection or executability. Producers
 * own those decisions and use this module only to describe an existing
 * rejection without losing machine-readable evidence.
 *
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @decision Publish one versioned finding vocabulary for the existing preview-selection and stored-plan executability decisions.
 * @consequence Admission authorities can expose structured rejection evidence without creating a parallel result hierarchy.
 * @version 1.0.0
 */
import { sha256HexUtf8 } from '@dvt/crypto';

import type { PlanRef } from '../../types/contracts.js';

import type { ExecutabilityRejectionCode } from './PlanExecutabilityValidation.v1.js';

export const PLAN_ADMISSION_FINDING_CONTRACT_VERSION = '1.0.0' as const;
export const PLAN_ADMISSION_FINDING_ID_PREFIX = 'plan-admission-finding.v1:' as const;

export const PLAN_ADMISSION_FINDING_PHASE = {
  previewSelection: 'preview-selection',
  planExecutability: 'plan-executability',
} as const;

export const PLAN_ADMISSION_FINDING_SUBJECT_KIND = {
  request: 'request',
  selection: 'selection',
  plan: 'plan',
  step: 'step',
  node: 'node',
  resource: 'resource',
  adapter: 'adapter',
} as const;

export const PLAN_ADMISSION_EVIDENCE_REFERENCE_KIND = {
  request: 'request',
  plan: 'plan',
  event: 'event',
  artifact: 'artifact',
  projectRevision: 'project-revision',
  policy: 'policy',
} as const;

export type PlanAdmissionFindingPhase =
  (typeof PLAN_ADMISSION_FINDING_PHASE)[keyof typeof PLAN_ADMISSION_FINDING_PHASE];
export type PlanAdmissionFindingSubjectKind =
  (typeof PLAN_ADMISSION_FINDING_SUBJECT_KIND)[keyof typeof PLAN_ADMISSION_FINDING_SUBJECT_KIND];
export type PlanAdmissionEvidenceReferenceKind =
  (typeof PLAN_ADMISSION_EVIDENCE_REFERENCE_KIND)[keyof typeof PLAN_ADMISSION_EVIDENCE_REFERENCE_KIND];

export interface PlanAdmissionFindingSubject {
  readonly kind: PlanAdmissionFindingSubjectKind;
  readonly id: string;
}

export type PlanAdmissionEvidenceValue = string | number | boolean;

export interface PlanAdmissionEvidenceReference {
  readonly kind: PlanAdmissionEvidenceReferenceKind;
  readonly id: string;
}

export interface PlanAdmissionEvidence {
  readonly evidenceCode: string;
  readonly observedValue?: PlanAdmissionEvidenceValue | undefined;
  readonly expectedValue?: PlanAdmissionEvidenceValue | undefined;
  readonly unit?: string | undefined;
  readonly subject?: PlanAdmissionFindingSubject | undefined;
  readonly reference?: PlanAdmissionEvidenceReference | undefined;
}

interface PlanAdmissionFindingBase {
  readonly findingId: string;
  readonly cause?: string | undefined;
  readonly subjects: readonly PlanAdmissionFindingSubject[];
  readonly evidence: readonly PlanAdmissionEvidence[];
  readonly remediationCode?: string | undefined;
}

export interface PreviewSelectionFinding extends PlanAdmissionFindingBase {
  readonly phase: typeof PLAN_ADMISSION_FINDING_PHASE.previewSelection;
  readonly code: string;
  readonly requestId: string;
}

export interface PlanExecutabilityFinding extends PlanAdmissionFindingBase {
  readonly phase: typeof PLAN_ADMISSION_FINDING_PHASE.planExecutability;
  readonly code: ExecutabilityRejectionCode;
  readonly planRef: PlanRef;
  readonly adapterId: string;
  readonly degradable: boolean;
}

export type PlanAdmissionFinding = PreviewSelectionFinding | PlanExecutabilityFinding;

/** The first admission slice is deliberately fail-fast. */
export type PlanAdmissionFindingCollection<
  Finding extends PlanAdmissionFinding = PlanAdmissionFinding,
> = readonly [Finding];

export type PlanAdmissionFindingIdentityInput =
  | Omit<PreviewSelectionFinding, 'findingId' | 'remediationCode'>
  | Omit<PlanExecutabilityFinding, 'findingId' | 'remediationCode'>;

export function createPlanAdmissionFindingId(finding: PlanAdmissionFindingIdentityInput): string {
  return `${PLAN_ADMISSION_FINDING_ID_PREFIX}${sha256HexUtf8(
    JSON.stringify(toCanonicalFindingIdentity(finding))
  )}`;
}

function toCanonicalFindingIdentity(finding: PlanAdmissionFindingIdentityInput): object {
  const commonIdentity = {
    phase: finding.phase,
    code: finding.code,
    cause: finding.cause ?? null,
    subjects: canonicalizeSubjects(finding.subjects),
    evidence: canonicalizeEvidence(finding.evidence),
  };

  if (finding.phase === PLAN_ADMISSION_FINDING_PHASE.previewSelection) {
    return {
      ...commonIdentity,
      requestId: finding.requestId,
    };
  }

  return {
    ...commonIdentity,
    planRef: canonicalizePlanRef(finding.planRef),
    adapterId: finding.adapterId,
    degradable: finding.degradable,
  };
}

function canonicalizeSubjects(
  subjects: readonly PlanAdmissionFindingSubject[]
): readonly PlanAdmissionFindingSubject[] {
  return subjects
    .map((subject) => ({ kind: subject.kind, id: subject.id }))
    .sort((left, right) => compareCanonicalValues(left, right));
}

function canonicalizeEvidence(evidence: readonly PlanAdmissionEvidence[]): readonly object[] {
  return evidence
    .map((item) => ({
      evidenceCode: item.evidenceCode,
      observedValue: item.observedValue ?? null,
      expectedValue: item.expectedValue ?? null,
      unit: item.unit ?? null,
      subject: item.subject ? { kind: item.subject.kind, id: item.subject.id } : null,
      reference: item.reference ? { kind: item.reference.kind, id: item.reference.id } : null,
    }))
    .sort((left, right) => compareCanonicalValues(left, right));
}

function canonicalizePlanRef(planRef: PlanRef): object {
  return {
    uri: planRef.uri,
    sha256: planRef.sha256,
    schemaVersion: planRef.schemaVersion,
    planId: planRef.planId,
    planVersion: planRef.planVersion,
    sizeBytes: planRef.sizeBytes ?? null,
    expiresAt: planRef.expiresAt ?? null,
  };
}

function compareCanonicalValues(left: object, right: object): number {
  const leftJson = JSON.stringify(left);
  const rightJson = JSON.stringify(right);

  if (leftJson === rightJson) {
    return 0;
  }

  return leftJson < rightJson ? -1 : 1;
}
