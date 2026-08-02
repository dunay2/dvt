/**
 * Owned concern: describe an authoritative Preview-selection rejection as one
 * deterministic, fail-fast finding without evaluating the selection itself.
 */
import {
  PLAN_ADMISSION_FINDING_PHASE,
  createPlanAdmissionFindingId,
  type PlanAdmissionEvidence,
  type PlanAdmissionFindingCollection,
  type PlanAdmissionFindingSubject,
  type PreviewSelectionFinding,
} from '@dvt/contracts';

export interface ExecutableSubgraphSelectionRejection {
  readonly code: 'REJECTED';
  readonly reason: string;
  readonly cause: string;
  readonly findings: PlanAdmissionFindingCollection<PreviewSelectionFinding>;
}

export interface BuildPreviewSelectionRejectionInput {
  readonly requestId: string;
  readonly cause: string;
  readonly reason: string;
  readonly subjects?: readonly PlanAdmissionFindingSubject[];
  readonly evidence?: readonly PlanAdmissionEvidence[];
}

const RETRY_CAUSES = new Set(['dbt_project_preview_projection_unavailable']);
const REGENERATE_CAUSES = new Set([
  'dbt_project_selection_provenance_mismatch',
  'dbt_project_preview_provenance_stale',
  'dbt_project_graph_source_mismatch',
  'graph_source_selection_mismatch',
  'workspace_graph_draft_not_found',
  'workspace_graph_draft_unsupported_schema_version',
  'workspace_graph_draft_corrupt_payload',
]);

export function buildPreviewSelectionRejection(
  input: BuildPreviewSelectionRejectionInput
): ExecutableSubgraphSelectionRejection {
  const subjects = canonicalizeValues([
    { kind: 'request' as const, id: input.requestId },
    ...(input.subjects ?? []),
  ]);
  const evidence = canonicalizeValues([
    {
      evidenceCode: 'preview_selection_rejection_cause',
      observedValue: input.cause,
      reference: { kind: 'request' as const, id: input.requestId },
    },
    ...(input.evidence ?? []),
  ]);
  const identity = {
    phase: PLAN_ADMISSION_FINDING_PHASE.previewSelection,
    code: 'REJECTED',
    cause: input.cause,
    subjects,
    evidence,
    requestId: input.requestId,
  } satisfies Omit<PreviewSelectionFinding, 'findingId' | 'remediationCode'>;
  const finding: PreviewSelectionFinding = {
    ...identity,
    findingId: createPlanAdmissionFindingId(identity),
    remediationCode: resolveRemediationCode(input.cause),
  };

  return {
    code: 'REJECTED',
    cause: input.cause,
    reason: input.reason,
    findings: [finding],
  };
}

function resolveRemediationCode(cause: string): string {
  if (cause === 'authorized_scope_incomplete') {
    return 'REQUEST_AUTHORIZED_SCOPE';
  }
  if (RETRY_CAUSES.has(cause)) {
    return 'RETRY_PREVIEW';
  }
  if (REGENERATE_CAUSES.has(cause)) {
    return 'REGENERATE_PREVIEW';
  }
  return 'REDUCE_OR_REPAIR_SELECTION';
}

function canonicalizeValues<Value extends object>(values: readonly Value[]): readonly Value[] {
  const byCanonicalValue = new Map<string, Value>();
  for (const value of values) {
    byCanonicalValue.set(JSON.stringify(value), value);
  }
  return [...byCanonicalValue.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => value);
}
