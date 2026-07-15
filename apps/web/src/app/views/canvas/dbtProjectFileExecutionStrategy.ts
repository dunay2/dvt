/** Owned concern: derive file-authoritative dbt execution identity from its projection. */
import type { DbtProjectFilesProvenance, DbtProjectGraphProjection } from '@dvt/contracts';
import { PlanPreviewProvenanceSchema } from '@dvt/contracts';

import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import type { PlanPreviewProvenanceViewModel } from '../../types/plans';

export type DbtProjectFileExecutionStrategy = Extract<
  CanvasExecutionStrategy,
  { kind: 'dbt_project_file_preview' }
>;

export function buildDbtProjectFileExecutionStrategy(
  projection: DbtProjectGraphProjection
): CanvasExecutionStrategy {
  const dbtVersion = projection.projectRevision.dbtVersion;
  if (
    projection.freshness !== 'fresh' ||
    !projection.capabilities.canPreview ||
    dbtVersion == null ||
    projection.executionTarget == null
  ) {
    return { kind: 'not_executable' };
  }

  return {
    kind: 'dbt_project_file_preview',
    previewProfile: 'planner-generic-v1',
    sourceFamily: 'dbt',
    projectRoot: projection.projectRevision.projectRoot,
    contentSetSha256: projection.projectRevision.contentSetSha256,
    analysisSha256: projection.analysisSha256,
    dbtVersion,
    executionTarget: projection.executionTarget,
  };
}

export function buildDbtProjectFilePreviewProvenance(
  strategy: DbtProjectFileExecutionStrategy,
  selectedUniqueIds: readonly string[]
): DbtProjectFilesProvenance {
  const provenance = PlanPreviewProvenanceSchema.parse({
    kind: 'dbt-project-files',
    projectRoot: strategy.projectRoot,
    contentSetSha256: strategy.contentSetSha256,
    analysisSha256: strategy.analysisSha256,
    dbtVersion: strategy.dbtVersion,
    selectedUniqueIds: [...new Set(selectedUniqueIds)].sort((left, right) =>
      left.localeCompare(right)
    ),
    executionTarget: strategy.executionTarget,
  });
  if (provenance.kind !== 'dbt-project-files') {
    throw new Error('Expected dbt-project-files preview provenance.');
  }
  return provenance;
}

export function buildDbtProjectFileExecutionDraftSignature(
  strategy: DbtProjectFileExecutionStrategy,
  plannerDraftSignature: string
): string {
  return JSON.stringify({
    plannerDraftSignature,
    projectRoot: strategy.projectRoot,
    contentSetSha256: strategy.contentSetSha256,
    analysisSha256: strategy.analysisSha256,
    dbtVersion: strategy.dbtVersion,
    executionTarget: strategy.executionTarget,
  });
}

export function isDbtProjectFilePreviewProvenanceCurrent(
  strategy: DbtProjectFileExecutionStrategy,
  selectedUniqueIds: readonly string[],
  provenance: PlanPreviewProvenanceViewModel | undefined
): boolean {
  if (provenance?.kind !== 'dbt-project-files') {
    return false;
  }

  return (
    JSON.stringify(provenance) ===
    JSON.stringify(buildDbtProjectFilePreviewProvenance(strategy, selectedUniqueIds))
  );
}
