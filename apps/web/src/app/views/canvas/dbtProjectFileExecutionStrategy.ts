/** Owned concern: derive file-authoritative dbt execution input from its projection. */
import type {
  DbtProjectFilesProvenance,
  DbtProjectGraphProjection,
  GenericGraphNodeV1,
  GenericGraphSourceV1,
} from '@dvt/contracts';
import { parseExecutionSelection, PlanPreviewProvenanceSchema } from '@dvt/contracts';

import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import type { PlanPreviewProvenanceViewModel } from '../../types/plans';
import type { CanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';
import {
  buildDbtExecutionIntentDraftSignature,
  resolveDbtExecutionScope,
} from './dbtExecutionScopePolicy';

export type DbtProjectFileExecutionStrategy = Extract<
  CanvasExecutionStrategy,
  { kind: 'dbt_project_file_preview' }
>;

const EXECUTABLE_RESOURCE = {
  model: { stepKind: 'DBT_MODEL', kind: 'dvt:transform', role: 'transform' },
  snapshot: { stepKind: 'DBT_SNAPSHOT', kind: 'dbt:snapshot', role: 'transform' },
  test: { stepKind: 'DBT_TEST', kind: 'dbt:test', role: 'check' },
} as const;

function buildPlannerGraphSource(projection: DbtProjectGraphProjection): GenericGraphSourceV1 {
  const executableIds = new Set(
    projection.nodes
      .filter((node) => node.resourceType in EXECUTABLE_RESOURCE)
      .map((node) => node.uniqueId)
  );
  const nodes: GenericGraphNodeV1[] = [];

  for (const resource of projection.nodes) {
    if (!(resource.resourceType in EXECUTABLE_RESOURCE)) continue;
    const presentation =
      EXECUTABLE_RESOURCE[resource.resourceType as keyof typeof EXECUTABLE_RESOURCE];
    const dependsOn = [
      ...new Set(
        projection.edges
          .filter(
            (edge) =>
              edge.targetUniqueId === resource.uniqueId && executableIds.has(edge.sourceUniqueId)
          )
          .map((edge) => edge.sourceUniqueId)
      ),
    ].sort(compareStrings);

    nodes.push({
      nodeId: resource.uniqueId,
      stepKind: presentation.stepKind,
      dependsOn,
      metadata: {
        displayName: resource.name,
        tags: {
          kind: presentation.kind,
          pluginId: resource.resourceType === 'model' ? 'dvt' : 'dbt',
          role: presentation.role,
        },
      },
    });
  }

  return {
    kind: 'generic-graph-v1',
    sourceFamily: 'dbt',
    sourceVersion: '1.0',
    nodes: nodes.sort((left, right) => compareStrings(left.nodeId, right.nodeId)),
  };
}

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

  const plannerGraphSource = buildPlannerGraphSource(projection);
  if (plannerGraphSource.nodes.length === 0) {
    return { kind: 'not_executable' };
  }

  return {
    kind: 'dbt_project_file_preview',
    previewProfile: 'planner-generic-v1',
    sourceFamily: 'dbt',
    canvasId: projection.authorityBinding.canvasId,
    projectRoot: projection.projectRevision.projectRoot,
    contentSetSha256: projection.projectRevision.contentSetSha256,
    analysisSha256: projection.analysisSha256,
    dbtVersion,
    plannerGraphSource,
    executionTarget: projection.executionTarget,
  };
}

export function buildDbtProjectFilePlannerProjection(
  args: Readonly<{
    strategy: DbtProjectFileExecutionStrategy;
    selectionIntent: CanvasExecutionSelectionIntent;
    workspaceNodeIds: readonly string[];
  }>
) {
  const { strategy, selectionIntent, workspaceNodeIds } = args;
  const nodeById = new Map(strategy.plannerGraphSource.nodes.map((node) => [node.nodeId, node]));
  const workspaceNodeIdSet = new Set(workspaceNodeIds);
  const executionScope = resolveDbtExecutionScope({
    selectionIntent,
    workspaceNodeIds,
    executableNodeIds: [...nodeById.keys()].filter((nodeId) => workspaceNodeIdSet.has(nodeId)),
    dependencyIdsByNodeId: new Map(
      strategy.plannerGraphSource.nodes.map((node) => [node.nodeId, node.dependsOn])
    ),
  });
  if (!executionScope.ok) return executionScope;
  const scopedIds = new Set(executionScope.nodeIds);

  const graphSource: GenericGraphSourceV1 = {
    ...strategy.plannerGraphSource,
    nodes: strategy.plannerGraphSource.nodes.filter((node) => scopedIds.has(node.nodeId)),
  };
  const selection = parseExecutionSelection({
    mode: 'explicit',
    nodeIds: graphSource.nodes.map((node) => node.nodeId),
  });

  return {
    ok: true as const,
    selectionMode: executionScope.selectionMode,
    requestedRootNodeIds: executionScope.requestedRootNodeIds,
    derivedDependencyNodeIds: executionScope.derivedDependencyNodeIds,
    graphSource,
    selection,
    draftSignature: buildDbtExecutionIntentDraftSignature({
      graphSource,
      selection,
      selectionMode: executionScope.selectionMode,
      requestedRootNodeIds: executionScope.requestedRootNodeIds,
    }),
  };
}

export function buildDbtProjectFilePreviewProvenance(
  strategy: DbtProjectFileExecutionStrategy,
  selectedUniqueIds: readonly string[]
): DbtProjectFilesProvenance {
  const provenance = PlanPreviewProvenanceSchema.parse({
    kind: 'dbt-project-files',
    canvasId: strategy.canvasId,
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
    canvasId: strategy.canvasId,
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

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right);
}
