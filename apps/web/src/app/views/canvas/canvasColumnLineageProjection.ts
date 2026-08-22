/** Owned concern: derive stable Canvas column handles and lineage edges from semantic recipe truth. */
import { DVT_TRANSFORM_AUTHORING_MODE, type VisualTransformRecipeV1 } from '@dvt/contracts';
import type { Edge } from '@xyflow/react';

import { buildCanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth';
import type { CoreNodeRole, CanonicalNode } from '../../types/canonical';
import { areCanvasColumnTypesCompatible } from './canvasColumnMappingAuthoring';
import { projectDbtModelArtifact } from './canvasDbtModelArtifactProjection';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
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

type LineageRecipe = Readonly<{
  recipe: VisualTransformRecipeV1;
  removable: boolean;
}>;

function readLineageRecipe(node: CanonicalNode): LineageRecipe | null {
  if (node.pluginId !== 'dvt' || node.kind !== 'dvt:sql_transform') return null;
  try {
    const authority = readDvtTransformAuthoringAuthority(node);
    if (authority.mode === DVT_TRANSFORM_AUTHORING_MODE.visual) {
      return { recipe: authority.recipe, removable: true };
    }
    const provenance = readDvtTransformLineageProvenance(node);
    return provenance == null ? null : { recipe: provenance, removable: false };
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
  removable: boolean;
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
    if (model.pluginId === 'dbt' && model.kind === 'dbt:model') {
      if (!args.expandedNodeIds.has(model.id)) continue;
      const artifact = projectDbtModelArtifact({
        modelNode: model,
        nodes: args.nodes,
        edges: args.edges,
      });
      if (!artifact.ok || artifact.artifact.provenance !== 'generated') continue;
      const sourceNode = nodeById.get(artifact.artifact.origin.nodeId);
      if (
        sourceNode == null ||
        !args.expandedNodeIds.has(sourceNode.id) ||
        !hasDependency(args.edges, sourceNode.id, model.id)
      ) {
        continue;
      }
      const targetColumns = buildCanvasNodePresentationTruth({
        node: model,
        nodes: args.nodes,
        edges: args.edges,
      }).columns.visible.filter((column) => column.sourceNodeId === sourceNode.id);
      for (const sourceColumn of readColumns(sourceNode)) {
        const targetColumn = targetColumns.find((column) => column.name === sourceColumn.name);
        if (targetColumn == null) continue;
        projected.push(
          buildLineageEdge({
            sourceNodeId: sourceNode.id,
            sourceColumnName: sourceColumn.name,
            sourceColumnId: sourceColumn.name,
            targetNodeId: model.id,
            targetColumnName: targetColumn.name,
            targetColumnId: targetColumn.name,
            outputId: targetColumn.name,
            terminal: false,
            removable: false,
          })
        );
      }
      continue;
    }

    if (model.pluginId === 'dbt' && model.kind === 'dbt:snapshot') {
      if (!args.expandedNodeIds.has(model.id)) continue;
      const targetColumns = projectCanvasNodePresentationTruth({
        node: model,
        nodes: args.nodes,
        edges: args.edges,
      }).columns.visible;
      const upstreamColumns = args.edges
        .filter((edge) => edge.targetId === model.id)
        .flatMap((edge) => {
          const sourceNode = nodeById.get(edge.sourceId);
          if (
            sourceNode == null ||
            sourceNode.pluginId !== 'dbt' ||
            sourceNode.kind !== 'dbt:model' ||
            !args.expandedNodeIds.has(sourceNode.id)
          ) {
            return [];
          }
          const artifact = projectDbtModelArtifact({
            modelNode: sourceNode,
            nodes: args.nodes,
            edges: args.edges,
          });
          if (!artifact.ok || artifact.artifact.provenance !== 'generated') return [];
          return projectCanvasNodePresentationTruth({
            node: sourceNode,
            nodes: args.nodes,
            edges: args.edges,
          }).columns.visible.map((column) => ({ node: sourceNode, column }));
        });

      for (const targetColumn of targetColumns) {
        if (targetColumns.filter((column) => column.name === targetColumn.name).length !== 1) {
          continue;
        }
        const compatibleSources = upstreamColumns.filter(
          ({ column }) =>
            column.name === targetColumn.name &&
            areCanvasColumnTypesCompatible(column.type, targetColumn.type)
        );
        if (compatibleSources.length !== 1) continue;
        const source = compatibleSources[0];
        if (source == null) continue;
        projected.push(
          buildLineageEdge({
            sourceNodeId: source.node.id,
            sourceColumnName: source.column.name,
            sourceColumnId: source.column.name,
            targetNodeId: model.id,
            targetColumnName: targetColumn.name,
            targetColumnId: targetColumn.name,
            outputId: targetColumn.name,
            terminal: false,
            removable: false,
          })
        );
      }
      continue;
    }

    const lineageRecipe = readLineageRecipe(model);
    if (lineageRecipe == null || !args.expandedNodeIds.has(model.id)) continue;

    for (const output of lineageRecipe.recipe.outputs) {
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
            removable: lineageRecipe.removable,
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
            removable: false,
          })
        );
      }
    }
  }

  return projected;
}
