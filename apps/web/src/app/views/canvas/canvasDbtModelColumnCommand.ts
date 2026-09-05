/** Owned concern: execute DBT model column intent against the active Canvas draft. */
import type { CanonicalNode } from '../../types/canonical';
import { isDbtCompatibleModel } from './canvasDbtAuthoringModel';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import {
  reorderDbtModelProjectionColumn,
  setDbtModelProjectionColumnOutput,
  type DbtModelColumnAuthoringRejection,
} from './canvasDbtModelColumnAuthoring';

export type ConfigureDbtModelColumnResult =
  | Readonly<{ outcome: 'applied'; draftSession: CanvasDraftSession }>
  | Readonly<{ outcome: 'rejected'; reason: DbtModelColumnAuthoringRejection }>;

export function configureDbtModelColumnOutput(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  nodeId: string;
  columnName: string;
  output: boolean;
}): ConfigureDbtModelColumnResult {
  const nodeCatalog = new Map(args.canonicalNodesById);
  Object.values(args.draftSession.localNodeCatalog ?? {}).forEach((node) =>
    nodeCatalog.set(node.id, node)
  );
  const node = nodeCatalog.get(args.nodeId);
  if (node == null || !isDbtCompatibleModel(node)) {
    return { outcome: 'rejected', reason: 'not_generated_dbt_model' };
  }
  const nodes = [...nodeCatalog.values()];
  const availableColumns = projectCanvasNodePresentationTruth({
    node,
    nodes,
    edges: args.draftSession.workingSet.visibleEdges,
  }).columns.visible.map((column) => column.name);
  const result = setDbtModelProjectionColumnOutput({
    node,
    availableColumns,
    columnName: args.columnName,
    output: args.output,
  });
  return result.outcome === 'rejected'
    ? result
    : {
        outcome: 'applied',
        draftSession: canvasDraftSession.workingSet.upsertNode(args.draftSession, result.node),
      };
}

export function configureDbtModelColumnOrder(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  nodeId: string;
  columnName: string;
  targetColumnName: string;
  placement: 'before' | 'after';
}): ConfigureDbtModelColumnResult {
  const nodeCatalog = new Map(args.canonicalNodesById);
  Object.values(args.draftSession.localNodeCatalog ?? {}).forEach((node) =>
    nodeCatalog.set(node.id, node)
  );
  const node = nodeCatalog.get(args.nodeId);
  if (node == null || !isDbtCompatibleModel(node)) {
    return { outcome: 'rejected', reason: 'not_generated_dbt_model' };
  }
  const result = reorderDbtModelProjectionColumn({
    node,
    availableColumns: projectCanvasNodePresentationTruth({
      node,
      nodes: [...nodeCatalog.values()],
      edges: args.draftSession.workingSet.visibleEdges,
    }).columns.visible.map((column) => column.name),
    columnName: args.columnName,
    targetColumnName: args.targetColumnName,
    placement: args.placement,
  });
  return result.outcome === 'rejected'
    ? result
    : {
        outcome: 'applied',
        draftSession: canvasDraftSession.workingSet.upsertNode(args.draftSession, result.node),
      };
}
