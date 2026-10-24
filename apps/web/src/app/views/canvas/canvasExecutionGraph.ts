/** Owned concern: evaluate the exact Canvas execution graph once per graph/scope identity. */
import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';
import { buildCanvasDbtExecutionProjection } from './canvasDbtExecutionProjection';
import { buildProtectedDvtPreviewProjection } from './canvasDvtPreviewProjection';
import type { ObjectFilePostgresExecutionScope } from './objectFilePostgresAuthoringModel';
import type { CanvasExecutableGraphFailure } from './canvasPlanReadiness';

const DBT_COMPATIBLE_PREVIEW_STRATEGY = {
  kind: 'planner_generic_preview',
  previewProfile: 'planner-generic-v1',
  sourceFamily: 'dbt',
} as const satisfies CanvasExecutionStrategy;

export type CanvasExecutionGraphArgs = Readonly<{
  graphDraftCanvasId: string | null;
  registeredStrategy: CanvasExecutionStrategy | null;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  selectionIntent: CanvasExecutionSelectionIntent;
  workspaceNodeIds: string[];
  executionScope?: ObjectFilePostgresExecutionScope;
}>;

export type CanvasExecutionGraphEvaluation = Readonly<{
  executionStrategy: CanvasExecutionStrategy | null;
  executionAvailable: boolean;
  canPlanGraph: boolean;
  failure: CanvasExecutableGraphFailure | null;
  draftSignature: string | null;
  selectedNodeIds: readonly string[];
}>;

export function evaluateCanvasExecutionGraph(
  args: CanvasExecutionGraphArgs
): CanvasExecutionGraphEvaluation {
  const registered = args.registeredStrategy;
  const protectedProjection =
    registered?.kind === 'dvt_protected_preview'
      ? buildProtectedDvtPreviewProjection({
          canvasId: args.graphDraftCanvasId,
          canonicalNodes: args.canonicalNodes,
          canonicalEdges: args.canonicalEdges,
          selectionIntent: args.selectionIntent,
          workspaceNodeIds: args.workspaceNodeIds,
        })
      : null;
  const dbtStrategy =
    registered?.kind === 'planner_generic_preview' ||
    registered?.kind === 'dbt_project_file_preview'
      ? registered
      : registered?.kind === 'dvt_protected_preview' && protectedProjection?.ok === false
        ? DBT_COMPATIBLE_PREVIEW_STRATEGY
        : null;
  const dbtProjection =
    dbtStrategy == null
      ? null
      : buildCanvasDbtExecutionProjection({
          strategy: dbtStrategy,
          canonicalNodes: args.canonicalNodes,
          canonicalEdges: args.canonicalEdges,
          selectionIntent: args.selectionIntent,
          workspaceNodeIds: args.workspaceNodeIds,
          executionScope: args.executionScope,
        });
  const usesDbt =
    dbtStrategy != null &&
    (registered?.kind !== 'dvt_protected_preview' || dbtProjection?.ok === true);
  const executionStrategy = usesDbt ? dbtStrategy : registered;
  const projection = usesDbt ? dbtProjection : protectedProjection;
  const executionAvailable = projection != null;
  const missingGraphAuthority =
    executionAvailable &&
    executionStrategy?.kind !== 'dbt_project_file_preview' &&
    args.graphDraftCanvasId == null;
  const canPlanGraph = executionAvailable && !missingGraphAuthority && projection?.ok === true;
  const failure: CanvasExecutableGraphFailure | null = missingGraphAuthority
    ? { cause: 'graph_authority_unavailable' }
    : projection?.ok === false
      ? projection
      : null;
  return {
    executionStrategy,
    executionAvailable,
    canPlanGraph,
    failure,
    draftSignature: canPlanGraph && projection?.ok === true ? projection.draftSignature : null,
    selectedNodeIds: projection?.ok === true ? projection.selection.nodeIds : [],
  };
}
