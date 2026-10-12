/**
 * Owned concern: define scenario options and derive draft node identities from their nodes.
 * @baseline GH-3578: fixture construction is independent of browser transport.
 * @decision Preserve scenario data and reuse the existing draft contract.
 * @consequence Consumers share one builder without browser globals or HTTP effects.
 * @version 1.0.0
 */
import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

import { buildWorkspaceGraphAuthoringDraft } from '../../../src/app/services/workspace/workspaceGraphDraftAuthoring.test.fixtures';

export type CanvasAuthoringDraft = WorkspaceGraphAuthoringDraft;

/** Scenario data owns the nodes; do not maintain a second list of their IDs. */
export function buildScenarioDraft(
  graph: Pick<CanvasAuthoringDraft, 'canvas' | 'nodes' | 'nodePositions' | 'edges'>
): CanvasAuthoringDraft {
  return buildWorkspaceGraphAuthoringDraft({
    ...graph,
    nodeIds: graph.nodes.map((node) => node.id),
  });
}

export type CanvasDraftScenarioOptions = {
  includeLooseNode?: boolean;
  canvasKind?: 'transformation';
  dbtGraph?: boolean;
  emptyCanvas?: boolean;
  importedWarehouseSource?: boolean;
  authoringGenerated?: boolean;
  terminalTransformPreview?: boolean;
  sourceDatabaseName?: string;
  terminalTransformResultTarget?: {
    schema: string;
    relation: string;
  };
  columnMapping?: boolean;
  columnMappingDisconnected?: boolean;
  columnMappingSecondSource?: boolean;
  columnMappingNotNullCustomer?: boolean;
  columnMappingTemporal?: boolean;
  sourceInspectorOrdering?: boolean;
  substraitPendingComposition?: boolean;
  substraitCompositionColumnType?: 'string' | 'bigint';
  substraitInnerJoin?: boolean;
  substraitNInputJoin?: boolean;
  substraitUnionAll?: boolean;
  projectionModel?: boolean;
  projectionInputFields?: readonly string[];
  substraitUnsupported?: boolean;
  title?: string;
  largeGraph?: boolean;
  performanceGraphNodeCount?: 10 | 30 | 60;
  longNodeNames?: boolean;
};
