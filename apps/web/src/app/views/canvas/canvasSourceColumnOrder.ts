/** Owned concern: persist the authored presentation order of DVT Source columns. */
import type { CanonicalNode } from '../../types/canonical';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import { removeDvtSubstraitFilter } from './canvasDvtSubstraitFilter';
import {
  inspectDvtSubstraitProjectionDraft,
  reorderDvtSubstraitProjectionOutputs,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import {
  applyDvtSourceSemanticDraft,
  createDvtSourceSemanticDraft,
} from './canvasDvtSourceSemanticAuthoring';

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

function resolveProjectionFieldId(
  outputs: ReadonlyArray<{
    fieldId: string;
    name: string;
    sourceFieldName?: string;
  }>,
  identity: string
): string | undefined {
  return outputs.find(
    (output) =>
      output.fieldId === identity || output.name === identity || output.sourceFieldName === identity
  )?.fieldId;
}

function reorderSourceSemanticProjection(args: {
  node: CanonicalNode;
  columnIdentity: string;
  targetColumnIdentity: string;
  placement: 'before' | 'after';
}): CanonicalNode | null | undefined {
  let semanticDraft: DvtSubstraitProjectionDraft | undefined;
  try {
    semanticDraft = createDvtSourceSemanticDraft(args.node);
  } catch {
    return null;
  }
  if (semanticDraft == null) return undefined;
  const projection = inspectDvtSubstraitProjectionDraft(removeDvtSubstraitFilter(semanticDraft));
  if (!projection.ok) return null;
  const fieldId = resolveProjectionFieldId(projection.projection.outputs, args.columnIdentity);
  const targetFieldId = resolveProjectionFieldId(
    projection.projection.outputs,
    args.targetColumnIdentity
  );
  if (fieldId == null || targetFieldId == null || fieldId === targetFieldId) return null;
  const reordered = reorderDvtSubstraitProjectionOutputs(semanticDraft, {
    fieldId,
    targetFieldId,
    placement: args.placement,
  });
  return reordered === semanticDraft ? null : applyDvtSourceSemanticDraft(args.node, reordered);
}

export function isReorderableCanvasSource(
  node: CanonicalNode | undefined
): node is CanonicalNode & { kind: 'dvt:source'; role: 'input' } {
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

  const semanticNode = reorderSourceSemanticProjection({
    node,
    columnIdentity: args.columnName,
    targetColumnIdentity: args.targetColumnName,
    placement: args.placement,
  });
  if (semanticNode != null) {
    return {
      outcome: 'applied',
      draftSession: canvasDraftSession.workingSet.upsertNode(args.draftSession, semanticNode),
    };
  }
  if (semanticNode === null) {
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
