/** Owned concern: persist the authored presentation order of DVT Source columns. */
import type { CanonicalNode } from '../../types/canonical';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';

type SourceColumnDeclaration = Readonly<{ name: string }>;

export type CanvasSourceColumnOrderRejection =
  'not_source' | 'columns_unavailable' | 'column_not_found';

export type CanvasSourceColumnOrderResult =
  | Readonly<{ outcome: 'applied'; draftSession: CanvasDraftSession }>
  | Readonly<{ outcome: 'rejected'; reason: CanvasSourceColumnOrderRejection }>;

function resolveNode(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  nodeId: string;
}): CanonicalNode | undefined {
  return (
    args.draftSession.localNodeCatalog?.[args.nodeId] ?? args.canonicalNodesById.get(args.nodeId)
  );
}

function isSourceColumn(value: unknown): value is SourceColumnDeclaration {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof (value as { name?: unknown }).name === 'string'
  );
}

export function isReorderableCanvasSource(node: CanonicalNode | undefined): boolean {
  return node?.kind === 'dvt:source' && node.role === 'input';
}

export function reorderCanvasSourceColumns(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  nodeId: string;
  columnName: string;
  targetColumnName: string;
  placement: 'before' | 'after';
}): CanvasSourceColumnOrderResult {
  const node = resolveNode(args);
  if (!isReorderableCanvasSource(node)) {
    return { outcome: 'rejected', reason: 'not_source' };
  }

  const columns = node.metadata?.columns;
  if (!Array.isArray(columns) || !columns.every(isSourceColumn)) {
    return { outcome: 'rejected', reason: 'columns_unavailable' };
  }
  if (args.columnName === args.targetColumnName) {
    return { outcome: 'rejected', reason: 'column_not_found' };
  }

  const reordered = [...columns];
  const sourceIndex = reordered.findIndex((column) => column.name === args.columnName);
  if (sourceIndex < 0) return { outcome: 'rejected', reason: 'column_not_found' };
  const [moved] = reordered.splice(sourceIndex, 1);
  const targetIndex = reordered.findIndex((column) => column.name === args.targetColumnName);
  if (moved == null || targetIndex < 0) {
    return { outcome: 'rejected', reason: 'column_not_found' };
  }
  reordered.splice(args.placement === 'after' ? targetIndex + 1 : targetIndex, 0, moved);

  const updatedNode: CanonicalNode = {
    ...node,
    metadata: { ...node.metadata, columns: reordered },
  };
  return {
    outcome: 'applied',
    draftSession: canvasDraftSession.workingSet.upsertNode(args.draftSession, updatedNode),
  };
}
