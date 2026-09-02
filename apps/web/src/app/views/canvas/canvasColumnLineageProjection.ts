/** Owned concern: derive stable Canvas column handles and lineage edges from semantic recipe truth. */
import {
  DVT_TRANSFORM_AUTHORING_MODE,
  ConnectedSourceRefSchema,
  type ConnectedSourceRef,
  type VisualTransformRecipeV1,
} from '@dvt/contracts';
import type { Edge } from '@xyflow/react';

import { buildCanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth';
import type { CoreNodeRole, CanonicalNode } from '../../types/canonical';
import { areCanvasColumnTypesCompatible } from './canvasColumnMappingAuthoring';
import { projectDbtModelArtifact } from './canvasDbtModelArtifactProjection';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import {
  decodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitNInputJoinDraft,
  inspectDvtSubstraitInnerJoinGroupedWindowDraft,
  inspectDvtSubstraitInnerJoinGroupingDraft,
  inspectDvtSubstraitInnerJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import {
  decodeDvtSubstraitUnionAllDocument,
  inspectDvtSubstraitUnionAllGroupedWindowDraft,
  inspectDvtSubstraitUnionAllGroupingDraft,
  inspectDvtSubstraitUnionAllDraft,
} from './canvasDvtSubstraitSetComposition';
import {
  decodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  type DvtSubstraitProjection,
} from './canvasDvtSubstraitProjection';
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
  sourceFieldId?: string;
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
  if (node.pluginId !== 'dvt' || node.kind !== 'dvt:transform') return null;
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

function readSubstraitProjectionLineage(node: CanonicalNode): DvtSubstraitProjection | null {
  if (node.pluginId !== 'dvt' || node.kind !== 'dvt:transform') return null;
  try {
    const authority = readDvtTransformAuthoringAuthority(node);
    if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) return null;
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

type DvtSubstraitInnerJoinLineage =
  | Readonly<{
      kind: 'binary';
      left: Readonly<{ sourceRef: ConnectedSourceRef }>;
      right: Readonly<{ sourceRef: ConnectedSourceRef }>;
      outputs: readonly Readonly<{
        fieldKey: string;
        name: string;
        fieldId: string;
        source: Readonly<{ relation: 'left' | 'right'; name: string }>;
      }>[];
    }>
  | Readonly<{
      kind: 'n-input';
      inputs: readonly Readonly<{
        nodeId: string;
        sourceRef: ConnectedSourceRef;
        fields: readonly Readonly<{ name: string; fieldId: string }>[];
      }>[];
      outputs: readonly Readonly<{
        name: string;
        fieldId: string;
        source: Readonly<{ nodeId: string; name: string; fieldId: string }>;
      }>[];
    }>;

function readSubstraitJoinLineage(node: CanonicalNode): DvtSubstraitInnerJoinLineage | null {
  if (node.pluginId !== 'dvt' || node.kind !== 'dvt:transform') return null;
  try {
    const authority = readDvtTransformAuthoringAuthority(node);
    if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) return null;
    const draft = decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument);
    const nInput = inspectDvtSubstraitNInputJoinDraft(draft);
    if (nInput.ok && nInput.projection.inputs.length > 2) {
      if (nInput.projection.targetNodeId !== node.id) return null;
      return {
        kind: 'n-input',
        inputs: nInput.projection.inputs,
        outputs: nInput.projection.outputs,
      };
    }
    const groupedWindow = inspectDvtSubstraitInnerJoinGroupedWindowDraft(draft);
    if (groupedWindow.ok) {
      if (groupedWindow.projection.kind === 'n-input') {
        if (groupedWindow.projection.targetNodeId !== node.id) return null;
        return {
          kind: 'n-input',
          inputs: groupedWindow.projection.inputs,
          outputs: [groupedWindow.projection.groupField],
        };
      }
      return {
        kind: 'binary',
        left: groupedWindow.projection.left,
        right: groupedWindow.projection.right,
        outputs: [groupedWindow.projection.groupField],
      };
    }
    const grouping = inspectDvtSubstraitInnerJoinGroupingDraft(draft);
    if (grouping.ok) {
      if (grouping.projection.kind === 'n-input') {
        if (grouping.projection.targetNodeId !== node.id) return null;
        return {
          kind: 'n-input',
          inputs: grouping.projection.inputs,
          outputs: [grouping.projection.groupField],
        };
      }
      return {
        kind: 'binary',
        left: grouping.projection.left,
        right: grouping.projection.right,
        outputs: [grouping.projection.groupField],
      };
    }
    const inspection = inspectDvtSubstraitInnerJoinDraft(draft);
    return inspection.ok ? { kind: 'binary', ...inspection.projection } : null;
  } catch {
    return null;
  }
}

type DvtSubstraitUnionAllLineage = Readonly<{
  inputs: readonly Readonly<{ sourceRef: ConnectedSourceRef }>[];
  outputs: readonly Readonly<{ fieldKey: string; name: string; fieldId: string }>[];
}>;

function readSubstraitUnionAllLineage(node: CanonicalNode): DvtSubstraitUnionAllLineage | null {
  if (node.pluginId !== 'dvt' || node.kind !== 'dvt:transform') return null;
  try {
    const authority = readDvtTransformAuthoringAuthority(node);
    if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) return null;
    const draft = decodeDvtSubstraitUnionAllDocument(authority.semanticDocument);
    const groupedWindow = inspectDvtSubstraitUnionAllGroupedWindowDraft(draft);
    if (groupedWindow.ok) {
      return {
        inputs: groupedWindow.projection.inputs,
        outputs: [groupedWindow.projection.groupField],
      };
    }
    const grouping = inspectDvtSubstraitUnionAllGroupingDraft(draft);
    if (grouping.ok) {
      return {
        inputs: grouping.projection.inputs,
        outputs: [grouping.projection.groupField],
      };
    }
    const unionAll = inspectDvtSubstraitUnionAllDraft(draft);
    return unionAll.ok ? unionAll.projection : null;
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
  sourceColumnName: string;
  sourceColumnId: string;
  sourceFieldId?: string;
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
      ...(args.sourceFieldId == null ? {} : { sourceFieldId: args.sourceFieldId }),
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
      const targetColumns = projectCanvasNodePresentationTruth({
        node: model,
        nodes: args.nodes,
        edges: args.edges,
      }).columns.visible.filter((column) => artifact.artifact.outputColumns.includes(column.name));
      const sourceTruth = projectCanvasNodePresentationTruth({
        node: sourceNode,
        nodes: args.nodes,
        edges: args.edges,
      });
      const sourceArtifact = projectDbtModelArtifact({
        modelNode: sourceNode,
        nodes: args.nodes,
        edges: args.edges,
      });
      const activeSourceNames =
        sourceArtifact.ok && sourceArtifact.artifact.provenance === 'generated'
          ? new Set(sourceArtifact.artifact.outputColumns)
          : null;
      const sourceColumns = sourceTruth.columns.visible.filter(
        (column) => activeSourceNames == null || activeSourceNames.has(column.name)
      );
      for (const sourceColumn of sourceColumns) {
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
            removable: true,
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
      if (
        substraitProjection.outputs.some((output) => !sourceColumns.has(output.sourceFieldName))
      ) {
        continue;
      }
      for (const output of substraitProjection.outputs) {
        projected.push(
          buildLineageEdge({
            sourceNodeId: sourceNode.id,
            sourceColumnName: output.sourceFieldName,
            sourceColumnId: output.sourceFieldName,
            sourceFieldId: output.sourceFieldId,
            targetNodeId: model.id,
            targetColumnName: output.name,
            targetColumnId: output.fieldId,
            outputId: output.fieldId,
            terminal: false,
            removable: true,
          })
        );
      }
      continue;
    }

    const substraitUnionAll = readSubstraitUnionAllLineage(model);
    if (substraitUnionAll != null && args.expandedNodeIds.has(model.id)) {
      for (const output of substraitUnionAll.outputs) {
        for (const input of substraitUnionAll.inputs) {
          const matchingSource = args.edges
            .filter((edge) => edge.targetId === model.id)
            .map((edge) => nodeById.get(edge.sourceId))
            .find((sourceNode) => {
              if (sourceNode == null || !args.expandedNodeIds.has(sourceNode.id)) return false;
              const sourceRef = ConnectedSourceRefSchema.safeParse(
                sourceNode.metadata?.connectedSourceRef
              );
              return (
                sourceRef.success &&
                sameConnectedSourceRef(sourceRef.data, input.sourceRef) &&
                readColumns(sourceNode).some((column) => column.name === output.fieldKey)
              );
            });
          if (matchingSource == null) continue;
          projected.push(
            buildLineageEdge({
              sourceNodeId: matchingSource.id,
              sourceColumnName: output.fieldKey,
              sourceColumnId: output.fieldKey,
              targetNodeId: model.id,
              targetColumnName: output.name,
              targetColumnId: output.fieldId,
              outputId: output.fieldId,
              terminal: false,
              removable: false,
            })
          );
        }
      }
      continue;
    }

    const substraitJoin = readSubstraitJoinLineage(model);
    if (substraitJoin != null && args.expandedNodeIds.has(model.id)) {
      if (substraitJoin.kind === 'n-input') {
        const incomingEdges = args.edges.filter((edge) => edge.targetId === model.id);
        const sourceByInputId = new Map<string, CanonicalNode>();
        let exactClosure = incomingEdges.length === substraitJoin.inputs.length;
        for (const input of substraitJoin.inputs) {
          const matchingSources = incomingEdges.flatMap((edge) => {
            if (edge.sourceId !== input.nodeId) return [];
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
          if (matchingSources.length !== 1 || sourceByInputId.has(input.nodeId)) {
            exactClosure = false;
            break;
          }
          sourceByInputId.set(input.nodeId, matchingSources[0]!);
        }
        if (!exactClosure) continue;

        const resolvedOutputs = substraitJoin.outputs.map((output) => {
          const input = substraitJoin.inputs.find(
            (candidate) => candidate.nodeId === output.source.nodeId
          );
          const sourceNode = sourceByInputId.get(output.source.nodeId);
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
              sourceColumnName: resolved.sourceField.name,
              sourceColumnId: resolved.sourceField.name,
              sourceFieldId: resolved.sourceField.fieldId,
              targetNodeId: model.id,
              targetColumnName: resolved.output.name,
              targetColumnId: resolved.output.fieldId,
              outputId: resolved.output.fieldId,
              terminal: false,
              removable: false,
            })
          );
        }
        continue;
      }
      for (const output of substraitJoin.outputs) {
        const sourceIdentity =
          output.source.relation === 'left' ? substraitJoin.left : substraitJoin.right;
        const matchingSources = args.edges
          .filter((edge) => edge.targetId === model.id)
          .flatMap((edge) => {
            const sourceNode = nodeById.get(edge.sourceId);
            if (sourceNode == null || !args.expandedNodeIds.has(sourceNode.id)) return [];
            const sourceRef = ConnectedSourceRefSchema.safeParse(
              sourceNode.metadata?.connectedSourceRef
            );
            return sourceRef.success &&
              sameConnectedSourceRef(sourceRef.data, sourceIdentity.sourceRef) &&
              readColumns(sourceNode).some((column) => column.name === output.source.name)
              ? [sourceNode]
              : [];
          });
        if (matchingSources.length !== 1) continue;
        const sourceNode = matchingSources[0];
        if (sourceNode == null) continue;
        projected.push(
          buildLineageEdge({
            sourceNodeId: sourceNode.id,
            sourceColumnName: output.source.name,
            sourceColumnId: output.source.name,
            targetNodeId: model.id,
            targetColumnName: output.name,
            targetColumnId: output.fieldId,
            outputId: output.fieldId,
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
