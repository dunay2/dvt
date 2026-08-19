/** Owned concern: derive stable Canvas column handles and lineage edges from semantic recipe truth. */
import { DVT_TRANSFORM_AUTHORING_MODE, type VisualTransformRecipeV1 } from '@dvt/contracts';
import type { Edge } from '@xyflow/react';

import type { CoreNodeRole, CanonicalNode } from '../../types/canonical';
import { areCanvasColumnTypesCompatible } from './canvasColumnMappingAuthoring';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { readDvtTransformLineageProvenance } from './canvasTransformationSqlMirror';

export type CanvasColumnPortDirection = 'source' | 'target';
export type CanvasColumnHandleIdentity = Readonly<{
  direction: CanvasColumnPortDirection;
  nodeId: string;
  columnId: string;
}>;
export type CanvasColumnLineageEdgeData = Readonly<{
  kind: 'column-lineage' | 'column-lineage-terminal';
  sourceNodeId: string;
  sourceColumnName: string;
  targetNodeId: string;
  targetColumnName: string;
  outputId: string;
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

function readVisualRecipe(node: CanonicalNode): VisualTransformRecipeV1 | null {
  if (node.pluginId !== 'dvt' || node.kind !== 'dvt:sql_transform') return null;
  try {
    const authority = readDvtTransformAuthoringAuthority(node);
    return authority.mode === DVT_TRANSFORM_AUTHORING_MODE.visual
      ? authority.recipe
      : readDvtTransformLineageProvenance(node);
  } catch {
    return null;
  }
}

function createLineageEdgeId(parts: readonly string[]): string {
  return `column-lineage:${parts.map((part) => encodeURIComponent(part)).join(':')}`;
}

function buildLineageEdge(args: {
  sourceNodeId: string;
  sourceColumnName: string;
  sourceColumnId: string;
  targetNodeId: string;
  targetColumnName: string;
  targetColumnId: string;
  outputId: string;
  terminal: boolean;
}): CanvasColumnLineageEdge {
  return {
    id: createLineageEdgeId([
      args.sourceNodeId,
      args.sourceColumnId,
      args.targetNodeId,
      args.targetColumnId,
    ]),
    source: args.sourceNodeId,
    target: args.targetNodeId,
    sourceHandle: createCanvasColumnHandleId({
      direction: 'source',
      nodeId: args.sourceNodeId,
      columnId: args.sourceColumnId,
    }),
    targetHandle: createCanvasColumnHandleId({
      direction: 'target',
      nodeId: args.targetNodeId,
      columnId: args.targetColumnId,
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
      sourceColumnName: args.sourceColumnName,
      targetNodeId: args.targetNodeId,
      targetColumnName: args.targetColumnName,
      outputId: args.outputId,
      removable: !args.terminal,
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
    const recipe = readVisualRecipe(model);
    if (recipe == null || !args.expandedNodeIds.has(model.id)) continue;

    for (const output of recipe.outputs) {
      for (const input of output.expression.inputs) {
        const sourceNode = nodeById.get(input.nodeId);
        if (
          sourceNode == null ||
          !args.expandedNodeIds.has(sourceNode.id) ||
          !hasDependency(args.edges, sourceNode.id, model.id) ||
          !readColumns(sourceNode).some((column) => column.name === input.columnName)
        ) {
          continue;
        }
        projected.push(
          buildLineageEdge({
            sourceNodeId: sourceNode.id,
            sourceColumnName: input.columnName,
            sourceColumnId: input.columnName,
            targetNodeId: model.id,
            targetColumnName: output.name,
            targetColumnId: output.id,
            outputId: output.id,
            terminal: false,
          })
        );
      }

      for (const dependency of args.edges.filter((edge) => edge.sourceId === model.id)) {
        const sink = nodeById.get(dependency.targetId);
        if (sink?.role !== 'output' || !args.expandedNodeIds.has(sink.id)) continue;
        const compatibleSinkColumns = readColumns(sink).filter(
          (column) =>
            column.name === output.name &&
            output.dataType != null &&
            areCanvasColumnTypesCompatible(output.dataType, column.type)
        );
        if (compatibleSinkColumns.length !== 1) continue;
        const sinkColumn = compatibleSinkColumns[0];
        if (sinkColumn == null) continue;
        projected.push(
          buildLineageEdge({
            sourceNodeId: model.id,
            sourceColumnName: output.name,
            sourceColumnId: output.id,
            targetNodeId: sink.id,
            targetColumnName: sinkColumn.name,
            targetColumnId: sinkColumn.name,
            outputId: output.id,
            terminal: true,
          })
        );
      }
    }
  }

  return projected;
}
