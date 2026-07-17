/** Owned concern: build the single DBT execution projection used by readiness and Preview. */
import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

import {
  buildDbtPlannerGraphSource,
  resolveDbtExecutionScopeNodeIds,
} from './canvasDbtPlannerGraphSource';
import { canvasViewCopy } from './copy';
import {
  buildDbtProjectFileExecutionDraftSignature,
  buildDbtProjectFilePlannerProjection,
} from './dbtProjectFileExecutionStrategy';
import { buildDbtExecutionIntentDraftSignature } from './dbtExecutionScopePolicy';
import type { CanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';

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
        message: canvasViewCopy.dbtExplicitSelectionRequiresExecutableResourceMessage,
      };
    }

    return {
      ...projection,
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
      message: canvasViewCopy.dbtExplicitSelectionRequiresExecutableResourceMessage,
    };
  }

  const projection = buildDbtPlannerGraphSource({
    nodes: args.canonicalNodes,
    edges: args.canonicalEdges,
    scopedNodeIds: executionScope.nodeIds,
  });
  return projection.ok
    ? {
        ...projection,
        selectionMode: executionScope.selectionMode,
        requestedRootNodeIds: executionScope.requestedRootNodeIds,
        derivedDependencyNodeIds: executionScope.derivedDependencyNodeIds,
        scopedNodeIds: executionScope.nodeIds,
        draftSignature: buildDbtExecutionIntentDraftSignature({
          graphSource: projection.graphSource,
          selection: projection.selection,
          selectionMode: executionScope.selectionMode,
          requestedRootNodeIds: executionScope.requestedRootNodeIds,
        }),
      }
    : projection;
}
