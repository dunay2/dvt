/** Owned concern: resolve Preview authority for the selected closure in the shared Canvas. */
import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';
import { buildCanvasDbtExecutionProjection } from './canvasDbtExecutionProjection';
import { buildProtectedDvtPreviewProjection } from './canvasDvtPreviewProjection';
import type { ObjectFilePostgresExecutionScope } from './objectFilePostgresAuthoringModel';

const DBT_COMPATIBLE_PREVIEW_STRATEGY = {
  kind: 'planner_generic_preview',
  previewProfile: 'planner-generic-v1',
  sourceFamily: 'dbt',
} as const satisfies CanvasExecutionStrategy;

export function resolveCanvasPreviewExecutionStrategy(args: {
  readonly graphDraftCanvasId: string | null;
  readonly registeredStrategy: CanvasExecutionStrategy | null;
  readonly canonicalNodes: readonly CanonicalNode[];
  readonly canonicalEdges: readonly CanonicalEdge[];
  readonly selectionIntent: CanvasExecutionSelectionIntent;
  readonly workspaceNodeIds: readonly string[];
  readonly executionScope?: ObjectFilePostgresExecutionScope;
}): CanvasExecutionStrategy | null {
  if (args.registeredStrategy?.kind !== 'dvt_protected_preview') {
    return args.registeredStrategy;
  }

  const dvtProjection = buildProtectedDvtPreviewProjection({
    canvasId: args.graphDraftCanvasId ?? 'canvas-authority-resolution',
    canonicalNodes: args.canonicalNodes,
    canonicalEdges: args.canonicalEdges,
    selectionIntent: args.selectionIntent,
    workspaceNodeIds: args.workspaceNodeIds,
  });
  if (dvtProjection.ok) {
    return args.registeredStrategy;
  }

  const dbtProjection = buildCanvasDbtExecutionProjection({
    strategy: DBT_COMPATIBLE_PREVIEW_STRATEGY,
    canonicalNodes: args.canonicalNodes,
    canonicalEdges: args.canonicalEdges,
    selectionIntent: args.selectionIntent,
    workspaceNodeIds: args.workspaceNodeIds,
    executionScope: args.executionScope,
  });

  return dbtProjection.ok ? DBT_COMPATIBLE_PREVIEW_STRATEGY : args.registeredStrategy;
}
