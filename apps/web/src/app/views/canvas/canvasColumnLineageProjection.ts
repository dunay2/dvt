/** Column lineage consumes the same resolved field facts as the cards. */
import type { Edge } from '@xyflow/react';
import type { CoreNodeRole, CanonicalNode } from '../../types/canonical';
import type {
  CanvasNodePresentationColumn,
  CanvasNodePresentationTruth,
} from '../../components/canvas/canvasNodePresentationTruth.contract';
import { canAuthorCanvasColumnMappings } from './canvasColumnProjectionAuthority';
export type CanvasColumnPortDirection = 'source' | 'target';
export type CanvasColumnHandleIdentity = Readonly<{
  direction: CanvasColumnPortDirection;
  nodeId: string;
  columnId: string;
}>;

/** Semantic identity is reference-backed; names are presentation only. */
export type CanvasColumnLineageEdgeData = Readonly<{
  kind: 'column-lineage' | 'column-lineage-terminal';
  sourceNodeId: string;
  sourceFieldId: string;
  sourceColumnName: string;
  targetNodeId: string;
  outputId: string;
  targetColumnName: string;
  removable: boolean;
}> &
  Record<string, unknown>;

type CanvasColumnLineageEdge = Edge<CanvasColumnLineageEdgeData>;

const HANDLE_PREFIX = 'column';

export function createCanvasColumnHandleId(identity: CanvasColumnHandleIdentity): string {
  return [
    HANDLE_PREFIX,
    identity.direction,
    encodeURIComponent(identity.nodeId),
    encodeURIComponent(identity.columnId),
  ].join(':');
}

export function parseCanvasColumnHandleId(
  value: string | null | undefined
): CanvasColumnHandleIdentity | null {
  if (value == null) return null;
  const [prefix, direction, encodedNodeId, encodedColumnId, ...rest] = value.split(':');
  if (
    prefix !== HANDLE_PREFIX ||
    (direction !== 'source' && direction !== 'target') ||
    encodedNodeId == null ||
    encodedColumnId == null ||
    rest.length > 0
  ) {
    return null;
  }
  try {
    const nodeId = decodeURIComponent(encodedNodeId);
    const columnId = decodeURIComponent(encodedColumnId);
    return nodeId.length > 0 && columnId.length > 0 ? { direction, nodeId, columnId } : null;
  } catch {
    return null;
  }
}

export function resolveCanvasColumnPortDirections(
  role: CoreNodeRole
): readonly CanvasColumnPortDirection[] {
  if (role === 'input') return ['source'];
  if (role === 'transform') return ['target', 'source'];
  if (role === 'output') return ['target'];
  return [];
}

function createLineageEdgeId(parts: readonly string[]): string {
  return `column-lineage:${parts.map((part) => encodeURIComponent(part)).join(':')}`;
}

function buildLineageEdge(args: {
  sourceNodeId: string;
  sourceFieldId: string;
  sourceColumnName: string;
  sourceHandleColumnId: string;
  targetNodeId: string;
  outputId: string;
  targetColumnName: string;
  targetHandleColumnId: string;
  terminal: boolean;
  removable: boolean;
}): CanvasColumnLineageEdge {
  return {
    id: createLineageEdgeId([
      args.sourceNodeId,
      args.sourceFieldId,
      args.targetNodeId,
      args.outputId,
    ]),
    source: args.sourceNodeId,
    target: args.targetNodeId,
    sourceHandle: createCanvasColumnHandleId({
      direction: 'source',
      nodeId: args.sourceNodeId,
      columnId: args.sourceHandleColumnId,
    }),
    targetHandle: createCanvasColumnHandleId({
      direction: 'target',
      nodeId: args.targetNodeId,
      columnId: args.targetHandleColumnId,
    }),
    type: 'columnLineage',
    animated: false,
    selectable: true,
    focusable: true,
    deletable: false,
    reconnectable: false,
    data: {
      kind: args.terminal ? 'column-lineage-terminal' : 'column-lineage',
      sourceNodeId: args.sourceNodeId,
      sourceFieldId: args.sourceFieldId,
      sourceColumnName: args.sourceColumnName,
      targetNodeId: args.targetNodeId,
      outputId: args.outputId,
      targetColumnName: args.targetColumnName,
      removable: args.removable && !args.terminal,
    },
  };
}

export function projectCanvasColumnLineage(args: {
  nodes: readonly CanonicalNode[];
  edges: readonly Readonly<{ sourceId: string; targetId: string }>[];
  expandedNodeIds: ReadonlySet<string>;
  presentations: ReadonlyMap<string, CanvasNodePresentationTruth>;
}): CanvasColumnLineageEdge[] {
  const nodeById = new Map(args.nodes.map((node) => [node.id, node]));
  const projected: CanvasColumnLineageEdge[] = [];
  const dependencies = new Set(
    args.edges.map((edge) => JSON.stringify([edge.sourceId, edge.targetId]))
  );
  for (const node of args.nodes) {
    if (!args.expandedNodeIds.has(node.id)) continue;
    const truth = args.presentations.get(node.id);
    if (truth == null || truth.columns.state === 'pending' || truth.columns.state === 'unavailable')
      continue;
    const roots = truth.columns.declared;
    const pending = roots.map((field) => ({ field, root: field, path: field.name })).reverse();
    while (pending.length > 0) {
      const { field, root, path } = pending.pop()!;
      if (field.children != null) {
        pending.push(
          ...field.children
            .map((child) => ({ field: child, root, path: path + '.' + child.name }))
            .reverse()
        );
        continue;
      }
      if (field.reference == null || root.reference == null) continue;
      for (const source of field.sources ?? []) {
        const producer = nodeById.get(source.nodeId);
        if (
          producer == null ||
          !args.expandedNodeIds.has(source.nodeId) ||
          !dependencies.has(JSON.stringify([source.nodeId, node.id]))
        )
          continue;
        const sourceTruth = args.presentations.get(source.nodeId);
        const available = sourceTruth?.columns.visible.find((column) =>
          producer.role === 'input'
            ? column.name === source.name
            : column.reference === source.fieldId
        );
        if (available == null || available.selected === false) continue;
        projected.push(
          buildLineageEdge({
            sourceNodeId: source.nodeId,
            sourceFieldId: source.fieldId,
            sourceColumnName: source.name,
            sourceHandleColumnId: producer.role === 'input' ? source.name : source.fieldId,
            targetNodeId: node.id,
            outputId: field.reference,
            targetColumnName: path,
            targetHandleColumnId: root.reference,
            terminal: false,
            removable:
              root === field &&
              canAuthorCanvasColumnMappings(node) &&
              canRemoveMapping(field, roots),
          })
        );
      }
    }
  }
  return projected;
}

function canRemoveMapping(
  field: CanvasNodePresentationColumn,
  fields: readonly CanvasNodePresentationColumn[]
): boolean {
  return (
    field.sources?.length === 1 &&
    fields.every((column) => column.sources?.length === 1 && column.children == null)
  );
}
