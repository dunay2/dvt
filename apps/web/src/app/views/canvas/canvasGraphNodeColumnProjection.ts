/** Owned concern: map recursive Canvas presentation truth into graph-card columns. */
import type { Node } from '@xyflow/react';

import type {
  CanvasNodePresentationColumn,
  CanvasNodePresentationTruth,
} from '../../components/canvas/canvasNodePresentationTruth.contract';
import type { CanonicalNode } from '../../types/canonical';
import type { GraphNodeColumn } from '../../plugins/graph/graphNodeColumnContracts';
import { createCanvasColumnHandleId } from './canvasColumnLineageProjection';

function isInteractiveColumn(value: unknown): value is GraphNodeColumn {
  if (
    typeof value !== 'object' ||
    value == null ||
    typeof (value as { name?: unknown }).name !== 'string' ||
    typeof (value as { type?: unknown }).type !== 'string'
  ) {
    return false;
  }
  const children = (value as { children?: unknown }).children;
  return children == null || (Array.isArray(children) && children.every(isInteractiveColumn));
}

function readInteractiveColumns(node: Node): GraphNodeColumn[] {
  return Array.isArray(node.data.columns) ? node.data.columns.filter(isInteractiveColumn) : [];
}

export function projectInteractiveCanvasColumns(
  node: Node,
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>,
  functionMenus?: ReadonlyMap<
    string,
    Readonly<{
      columnId: string;
      dataType: string;
      menu: NonNullable<GraphNodeColumn['functionMenu']>;
    }>
  >,
  columnOverrides?: GraphNodeColumn[]
): GraphNodeColumn[] {
  const columns = columnOverrides ?? readInteractiveColumns(node);
  const presentationTruth = node.data.presentationTruth as CanvasNodePresentationTruth | undefined;
  const presentationColumns = presentationTruth?.columns.visible ?? [];
  const presentationColumnsByReference = new Map(
    presentationColumns.flatMap((column) =>
      column.reference == null ? [] : [[column.reference, column] as const]
    )
  );
  const presentationColumnsByName = new Map(
    presentationColumns.map((column) => [column.name, column] as const)
  );
  return columns.map((column) => {
    const presentationColumn =
      (column.id == null ? undefined : presentationColumnsByReference.get(column.id)) ??
      presentationColumnsByName.get(column.name);
    const sourceNodeId = presentationColumn?.sourceNodeId;
    const sourceNode = sourceNodeId == null ? undefined : canonicalNodesById.get(sourceNodeId);
    const id =
      columnOverrides != null || presentationColumn == null
        ? (column.id ?? column.name)
        : (presentationColumn.reference ?? column.id ?? column.name);
    const functionProjection = functionMenus?.get(id) ?? functionMenus?.get(column.name);
    const interactiveId = functionProjection?.columnId ?? id;
    const sourceColumnId =
      sourceNode?.kind === 'dvt:transform'
        ? presentationColumn?.reference
        : presentationColumn?.name;
    return {
      ...column,
      id: interactiveId,
      type: functionProjection?.dataType ?? column.type,
      ...(functionProjection == null ? {} : { functionMenu: functionProjection.menu }),
      ...(sourceNodeId == null || sourceColumnId == null
        ? {}
        : { source: { nodeId: sourceNodeId, columnId: sourceColumnId } }),
      ...(node.data.role === 'input' && column.output === false
        ? {}
        : {
            sourceHandleId: createCanvasColumnHandleId({
              direction: 'source',
              nodeId: node.id,
              columnId: interactiveId,
            }),
          }),
      targetHandleId: createCanvasColumnHandleId({
        direction: 'target',
        nodeId: node.id,
        columnId: interactiveId,
      }),
    };
  });
}

export function projectGraphNodeColumn(
  column: CanvasNodePresentationColumn,
  output: boolean
): GraphNodeColumn {
  return {
    ...(column.reference == null ? {} : { id: column.reference }),
    name: column.name,
    type: column.type,
    output,
    ...(column.nullable == null ? {} : { nullable: column.nullable }),
    ...(column.primaryKey == null ? {} : { primaryKey: column.primaryKey }),
    ...(column.sourceNodeName == null ? {} : { sourceNodeName: column.sourceNodeName }),
    ...(column.sourceFieldName == null ? {} : { sourceFieldName: column.sourceFieldName }),
    ...(column.sourceReference == null ? {} : { sourceReference: column.sourceReference }),
    ...(column.reference == null ? {} : { reference: column.reference }),
    ...(column.operations == null ? {} : { operations: column.operations }),
    ...(column.description == null ? {} : { description: column.description }),
    ...(column.children == null
      ? {}
      : {
          children: column.children.map((child) => projectGraphNodeColumn(child, output)),
        }),
  };
}

function representsInheritedInput(
  column: CanvasNodePresentationColumn,
  inherited: CanvasNodePresentationColumn
): boolean {
  if (column.reference != null && column.reference === inherited.reference) return true;
  if (column.sourceNodeId == null || column.sourceNodeId !== inherited.sourceNodeId) return false;
  if (column.provenance === 'inherited' && column.name === inherited.name) return true;
  return (
    column.sourceFieldName === inherited.name &&
    column.name === inherited.name &&
    (column.operations == null || column.operations.length === 0)
  );
}

export function selectGraphNodeCardColumns(
  truth: CanvasNodePresentationTruth
): readonly CanvasNodePresentationColumn[] {
  if (truth.relationalComposition?.state !== 'pending') return truth.columns.visible;

  return [
    ...truth.columns.visible,
    ...truth.columns.inherited.filter(
      (inherited) =>
        !truth.columns.visible.some((column) => representsInheritedInput(column, inherited))
    ),
  ];
}
