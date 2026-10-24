/** Owned concern: build the single DBT execution projection used by readiness and Preview. */
import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

import {
  buildDbtPlannerGraphSource,
  resolveDbtExecutionScopeNodeIds,
} from './canvasDbtPlannerGraphSource';
import { buildDbtWorkspaceArtifacts } from './canvasDbtWorkspaceArtifacts';
import {
  buildDbtProjectFileExecutionDraftSignature,
  buildDbtProjectFilePlannerProjection,
} from './dbtProjectFileExecutionStrategy';
import { buildDbtExecutionIntentDraftSignature } from './dbtExecutionScopePolicy';
import type { CanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';
import type { ObjectFilePostgresExecutionScope } from './objectFilePostgresAuthoringModel';

type DbtPreviewExecutionStrategy = Extract<
  CanvasExecutionStrategy,
  { kind: 'planner_generic_preview' | 'dbt_project_file_preview' }
>;

export function buildCanvasDbtExecutionProjection(args: {
  readonly strategy: DbtPreviewExecutionStrategy;
  readonly canonicalNodes: readonly CanonicalNode[];
  readonly canonicalEdges: readonly CanonicalEdge[];
  readonly selectionIntent: CanvasExecutionSelectionIntent;
  readonly workspaceNodeIds: readonly string[];
  readonly executionScope?: ObjectFilePostgresExecutionScope;
}) {
  if (args.strategy.kind === 'dbt_project_file_preview') {
    const projection = buildDbtProjectFilePlannerProjection({
      strategy: args.strategy,
      selectionIntent: args.selectionIntent,
      workspaceNodeIds: args.workspaceNodeIds,
    });
    if (!projection.ok) {
      return {
        ok: false as const,
        cause: 'execution_selection_unavailable' as const,
      };
    }

    return {
      ...projection,
      kind: 'dbt_project_file_preview' as const,
      scopedNodeIds: projection.selection.nodeIds,
      draftSignature: buildDbtProjectFileExecutionDraftSignature(
        args.strategy,
        projection.draftSignature
      ),
    };
  }

  const executionScope = resolveDbtExecutionScopeNodeIds({
    nodes: args.canonicalNodes,
    edges: args.canonicalEdges,
    selectionIntent: args.selectionIntent,
    workspaceNodeIds: args.workspaceNodeIds,
  });
  if (!executionScope.ok) {
    return {
      ok: false as const,
      cause: 'execution_selection_unavailable' as const,
    };
  }

  const projection = buildDbtPlannerGraphSource({
    nodes: args.canonicalNodes,
    edges: args.canonicalEdges,
    scopedNodeIds: executionScope.nodeIds,
    executionScope: args.executionScope,
  });
  if (!projection.ok) {
    return {
      ok: false as const,
      cause: 'dbt_projection_failed' as const,
      diagnostic: projection.message,
    };
  }
  const workspaceArtifacts = buildDbtWorkspaceArtifacts({
    nodes: args.canonicalNodes,
    edges: args.canonicalEdges,
    scopedNodeIds: executionScope.nodeIds,
  });
  if (!workspaceArtifacts.ok) {
    return {
      ok: false as const,
      cause: 'dbt_projection_failed' as const,
      diagnostic: workspaceArtifacts.message,
    };
  }
  return {
    ...projection,
    kind: 'planner_generic_preview' as const,
    workspaceArtifacts,
    selectionMode: executionScope.selectionMode,
    requestedRootNodeIds: executionScope.requestedRootNodeIds,
    derivedDependencyNodeIds: executionScope.derivedDependencyNodeIds,
    scopedNodeIds: executionScope.nodeIds,
    draftSignature: buildDbtExecutionIntentDraftSignature({
      graphSource: projection.graphSource,
      selection: projection.selection,
      selectionMode: executionScope.selectionMode,
      requestedRootNodeIds: executionScope.requestedRootNodeIds,
      workspaceArtifacts: workspaceArtifacts.artifacts,
    }),
  };
}
