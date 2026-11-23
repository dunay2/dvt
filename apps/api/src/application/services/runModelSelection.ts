/**
 * Owned concern: project navigable model identities from a run's retained scoped plan.
 * Why: dbt files and protected draft models retain different authoring authorities.
 * Corner: a step label, table name or current project selection cannot establish identity.
 */
import {
  DvtOperationalRunWorkloadV1Schema,
  KNOWN_STEP_KINDS,
  PlanPreviewProvenanceSchema,
  type ExecutionPlan,
  type PlanOwnership,
} from '@dvt/contracts';

import type { RunModelSelection } from '../ports/runtime.js';

function sameScope(scope: PlanOwnership, recorded?: PlanOwnership): boolean {
  return (
    scope.tenantId === recorded?.tenantId &&
    scope.projectId === recorded.projectId &&
    scope.environmentId === recorded.environmentId
  );
}

export function projectRunModelSelection(
  plan: ExecutionPlan,
  scope: PlanOwnership
): RunModelSelection | undefined {
  if (!sameScope(scope, plan.metadata.ownership)) return undefined;
  const parsed = PlanPreviewProvenanceSchema.safeParse(
    plan.observability?.extra?.['planPreviewProvenance']
  );
  if (!parsed.success || parsed.data.kind === 'transformation-git-artifacts') return undefined;
  const provenance = parsed.data;
  const base = {
    schemaVersion: 'canvas-authoring-authority-binding.v1',
    canvasId: provenance.canvasId,
  } as const;
  if (provenance.kind === 'dbt-project-files') {
    const selected = new Set(provenance.selectedUniqueIds);
    const modelIds = plan.steps
      .filter((step) => step.kind === KNOWN_STEP_KINDS.DBT_MODEL && selected.has(step.stepId))
      .map((step) => step.stepId);
    return modelIds.length
      ? {
          binding: {
            ...base,
            authority: { kind: 'dbt-project-files', projectRoot: provenance.projectRoot },
          },
          modelIds,
        }
      : undefined;
  }
  const steps = plan.steps.filter(
    (step) => step.kind === KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD
  );
  if (steps.length !== 1) return undefined;
  const workload = DvtOperationalRunWorkloadV1Schema.safeParse(steps[0]?.stepTypeConfig);
  if (
    !workload.success ||
    !sameScope(scope, workload.data.scope) ||
    workload.data.graph.canvasId !== provenance.canvasId ||
    workload.data.output.nodeId !== steps[0]?.stepId
  )
    return undefined;
  return {
    binding: { ...base, authority: { kind: 'graph-draft' } },
    modelIds: [workload.data.output.nodeId],
  };
}
