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
  type DbtProjectFilesProvenance,
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
  if (provenance.kind === 'dbt-project-files') {
    return projectDbtRunModels(plan, provenance);
  }
  return projectDraftRunModels(plan, scope, provenance.canvasId);
}

function projectDbtRunModels(
  plan: ExecutionPlan,
  provenance: DbtProjectFilesProvenance
): RunModelSelection | undefined {
  const selected = new Set(provenance.selectedUniqueIds);
  const modelIds = plan.steps
    .filter((step) => step.kind === KNOWN_STEP_KINDS.DBT_MODEL && selected.has(step.stepId))
    .map((step) => step.stepId);
  if (modelIds.length === 0) return undefined;
  return {
    binding: {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: provenance.canvasId,
      authority: { kind: 'dbt-project-files', projectRoot: provenance.projectRoot },
    },
    modelIds,
  };
}

function projectDraftRunModels(
  plan: ExecutionPlan,
  scope: PlanOwnership,
  canvasId: string
): RunModelSelection | undefined {
  const steps = plan.steps.filter(
    (step) => step.kind === KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD
  );
  if (steps.length !== 1) return undefined;
  const workload = DvtOperationalRunWorkloadV1Schema.safeParse(steps[0]?.stepTypeConfig);
  if (!workload.success) return undefined;
  if (!sameScope(scope, workload.data.scope)) return undefined;
  if (workload.data.graph.canvasId !== canvasId) return undefined;
  if (workload.data.output.nodeId !== steps[0]?.stepId) return undefined;
  return {
    binding: {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId,
      authority: { kind: 'graph-draft' },
    },
    modelIds: [workload.data.output.nodeId],
  };
}
