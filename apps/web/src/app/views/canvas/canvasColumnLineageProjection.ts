/** Owned concern: derive stable Canvas column handles and lineage edges from canonical semantic truth. */
import { ConnectedSourceRefSchema, type ConnectedSourceRef } from '@dvt/contracts';
import type { Edge } from '@xyflow/react';

import type { CoreNodeRole, CanonicalNode } from '../../types/canonical';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import {
  decodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitNInputJoinDraft,
  inspectDvtSubstraitInnerJoinGroupedWindowDraft,
  inspectDvtSubstraitInnerJoinGroupingDraft,
} from './canvasDvtSubstraitJoinComposition';
import {
  decodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  type DvtSubstraitProjection,
} from './canvasDvtSubstraitProjection';
import { flattenCanvasStructuredLineage } from './canvasStructuredFieldLineage';

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
type Column = Readonly<{ name: string; type: string }>;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readColumns(node: CanonicalNode): readonly Column[] {
  const value = node.metadata?.columns;
  if (Array.isArray(value)) {
    return value.flatMap((candidate): readonly Column[] => {
      if (!isRecord(candidate)) return [];
      const name = readString(candidate.name);
      if (name == null) return [];
      return [{ name, type: readString(candidate.type ?? candidate.dataType) ?? 'unknown' }];
    });
  }
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([fallbackName, candidate]): readonly Column[] => {
    if (!isRecord(candidate)) return [];
    const name = readString(candidate.name) ?? fallbackName.trim();
    if (name.length === 0) return [];
    return [{ name, type: readString(candidate.type ?? candidate.dataType) ?? 'unknown' }];
  });
}

function readSubstraitProjectionLineage(node: CanonicalNode): DvtSubstraitProjection | null {
  if (node.pluginId !== 'dvt' || node.kind !== 'dvt:transform') return null;
  try {
    const authority = readDvtTransformAuthoringAuthority(node);
    if (authority == null) return null;
    const inspection = inspectDvtSubstraitProjectionDraft(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
    );
    return inspection.ok && inspection.projection.targetNodeId === node.id
      ? inspection.projection
      : null;
  } catch {
    return null;
  }
}

type DvtSubstraitNInputJoinLineage = Readonly<{
  inputs: readonly Readonly<{
    sourceRef: ConnectedSourceRef;
    fields: readonly Readonly<{ name: string; fieldId: string }>[];
  }>[];
  outputs: readonly Readonly<{
    name: string;
    fieldId: string;
    source: Readonly<{ inputIndex: number; name: string; fieldId: string }>;
  }>[];
}>;

function readSubstraitNInputJoinLineage(node: CanonicalNode): DvtSubstraitNInputJoinLineage | null {
  if (node.pluginId !== 'dvt' || node.kind !== 'dvt:transform') return null;
  try {
    const authority = readDvtTransformAuthoringAuthority(node);
    if (authority == null) return null;
    const draft = decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument);
    const nInput = inspectDvtSubstraitNInputJoinDraft(draft);
    if (nInput.ok) {
      return {
        inputs: nInput.projection.inputs,
        outputs: nInput.projection.outputs,
      };
    }
    const groupedWindow = inspectDvtSubstraitInnerJoinGroupedWindowDraft(draft);
    if (groupedWindow.ok && groupedWindow.projection.kind === 'n-input') {
      return {
        inputs: groupedWindow.projection.inputs,
        outputs: [groupedWindow.projection.groupField],
      };
    }
    const grouping = inspectDvtSubstraitInnerJoinGroupingDraft(draft);
    if (grouping.ok && grouping.projection.kind === 'n-input') {
      return {
        inputs: grouping.projection.inputs,
        outputs: [grouping.projection.groupField],
      };
    }
    return null;
  } catch {
    return null;
  }
}

function sameConnectedSourceRef(first: ConnectedSourceRef, second: ConnectedSourceRef): boolean {
  return (
    first.schemaVersion === second.schemaVersion &&
    first.sourceObjectId === second.sourceObjectId &&
    first.connectionRef.schemaVersion === second.connectionRef.schemaVersion &&
    first.connectionRef.provider === second.connectionRef.provider &&
    first.connectionRef.connectionId === second.connectionRef.connectionId
  );
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

function hasDependency(
  edges: readonly Readonly<{ sourceId: string; targetId: string }>[],
  sourceId: string,
  targetId: string
): boolean {
  return edges.some((edge) => edge.sourceId === sourceId && edge.targetId === targetId);
}

export function projectCanvasColumnLineage(args: {
  nodes: readonly CanonicalNode[];
  edges: readonly Readonly<{ sourceId: string; targetId: string }>[];
  expandedNodeIds: ReadonlySet<string>;
}): CanvasColumnLineageEdge[] {
  const nodeById = new Map(args.nodes.map((node) => [node.id, node]));
  const projected: CanvasColumnLineageEdge[] = [];

  for (const model of args.nodes) {
    const substraitProjection = readSubstraitProjectionLineage(model);
    if (substraitProjection != null && args.expandedNodeIds.has(model.id)) {
      const sourceNode = nodeById.get(substraitProjection.source.nodeId);
      const sourceRef = ConnectedSourceRefSchema.safeParse(
        sourceNode?.metadata?.connectedSourceRef
      );
      if (
        sourceNode == null ||
        !args.expandedNodeIds.has(sourceNode.id) ||
        !hasDependency(args.edges, sourceNode.id, model.id) ||
        !sourceRef.success ||
        !sameConnectedSourceRef(sourceRef.data, substraitProjection.source.sourceRef)
      ) {
        continue;
      }
      const sourceColumns = new Set(readColumns(sourceNode).map((column) => column.name));
      const sourcedOutputs = substraitProjection.outputs.filter(
        (output): output is typeof output & { sourceFieldName: string; sourceFieldId: string } =>
          output.sourceFieldName != null && output.sourceFieldId != null
      );
      if (sourcedOutputs.some((output) => !sourceColumns.has(output.sourceFieldName))) {
        continue;
      }
      for (const output of sourcedOutputs) {
        projected.push(
          buildLineageEdge({
            sourceNodeId: sourceNode.id,
            sourceFieldId: output.sourceFieldId,
            sourceColumnName: output.sourceFieldName,
            sourceHandleColumnId: output.sourceFieldName,
            targetNodeId: model.id,
            outputId: output.fieldId,
            targetColumnName: output.name,
            targetHandleColumnId: output.fieldId,
            terminal: false,
            removable: true,
          })
        );
      }
      continue;
    }

    if (args.expandedNodeIds.has(model.id)) {
      const presentedColumns = projectCanvasNodePresentationTruth({
        node: model,
        nodes: args.nodes,
        edges: args.edges,
      }).columns.declared;
      const structuredLeaves = flattenCanvasStructuredLineage(presentedColumns);
      if (structuredLeaves.length > 0) {
        const sourcedLeaves = [
          ...structuredLeaves,
          ...presentedColumns
            .filter((column) => column.children == null)
            .map((column) => ({ root: column, leaf: column, path: column.name })),
        ];
        for (const { root, leaf, path } of sourcedLeaves) {
          const sourceNode = leaf.sourceNodeId == null ? null : nodeById.get(leaf.sourceNodeId);
          if (
            sourceNode == null ||
            !args.expandedNodeIds.has(sourceNode.id) ||
            !hasDependency(args.edges, sourceNode.id, model.id) ||
            leaf.sourceFieldName == null ||
            leaf.sourceReference == null ||
            leaf.reference == null ||
            root.reference == null ||
            !readColumns(sourceNode).some((column) => column.name === leaf.sourceFieldName)
          ) {
            continue;
          }
          projected.push(
            buildLineageEdge({
              sourceNodeId: sourceNode.id,
              sourceFieldId: leaf.sourceReference,
              sourceColumnName: leaf.sourceFieldName,
              sourceHandleColumnId: leaf.sourceFieldName,
              targetNodeId: model.id,
              outputId: leaf.reference,
              targetColumnName: path,
              targetHandleColumnId: root.reference,
              terminal: false,
              removable: false,
            })
          );
        }
        continue;
      }
    }

    const substraitJoin = readSubstraitNInputJoinLineage(model);
    if (substraitJoin != null && args.expandedNodeIds.has(model.id)) {
      const incomingEdges = args.edges.filter((edge) => edge.targetId === model.id);
      const sourceByInputIndex = new Map<number, CanonicalNode>();
      const usedSourceNodeIds = new Set<string>();
      let exactClosure = incomingEdges.length === substraitJoin.inputs.length;
      for (const [inputIndex, input] of substraitJoin.inputs.entries()) {
        const matchingSources = incomingEdges.flatMap((edge) => {
          if (usedSourceNodeIds.has(edge.sourceId)) return [];
          const sourceNode = nodeById.get(edge.sourceId);
          if (sourceNode == null || !args.expandedNodeIds.has(sourceNode.id)) return [];
          const sourceRef = ConnectedSourceRefSchema.safeParse(
            sourceNode.metadata?.connectedSourceRef
          );
          const sourceColumns = new Set(readColumns(sourceNode).map((column) => column.name));
          return sourceRef.success &&
            sameConnectedSourceRef(sourceRef.data, input.sourceRef) &&
            input.fields.every((field) => sourceColumns.has(field.name))
            ? [sourceNode]
            : [];
        });
        if (matchingSources.length !== 1) {
          exactClosure = false;
          break;
        }
        const sourceNode = matchingSources[0]!;
        usedSourceNodeIds.add(sourceNode.id);
        sourceByInputIndex.set(inputIndex, sourceNode);
      }
      if (!exactClosure) continue;

      const resolvedOutputs = substraitJoin.outputs.map((output) => {
        const input = substraitJoin.inputs[output.source.inputIndex];
        const sourceNode = sourceByInputIndex.get(output.source.inputIndex);
        const sourceField = input?.fields.find(
          (field) => field.fieldId === output.source.fieldId && field.name === output.source.name
        );
        return sourceNode == null || sourceField == null
          ? null
          : { output, sourceNode, sourceField };
      });
      if (resolvedOutputs.some((output) => output == null)) continue;
      for (const resolved of resolvedOutputs) {
        if (resolved == null) continue;
        projected.push(
          buildLineageEdge({
            sourceNodeId: resolved.sourceNode.id,
            sourceFieldId: resolved.sourceField.fieldId,
            sourceColumnName: resolved.sourceField.name,
            sourceHandleColumnId: resolved.sourceField.name,
            targetNodeId: model.id,
            outputId: resolved.output.fieldId,
            targetColumnName: resolved.output.name,
            targetHandleColumnId: resolved.output.fieldId,
            terminal: false,
            removable: false,
          })
        );
      }
    }
  }

  return projected;
}
