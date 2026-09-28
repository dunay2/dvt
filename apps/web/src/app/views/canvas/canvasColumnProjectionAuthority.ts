/** Read canonical projection availability and published fields without owning mutations. */
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasColumnMappingRejection } from './canvasColumnMappingModel';
import { readDvtSourceOutputProjection } from './canvasDvtSourceSemanticAuthoring';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import {
  decodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitProjectionEntry,
  resolveDvtSubstraitProjectionSource,
  type DvtSubstraitProjection,
  type DvtSubstraitProjectionSemantics,
  type DvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';

export type EditableCanvasProjection =
  | Readonly<{ outcome: 'ready'; projection: DvtSubstraitProjectionSemantics | null }>
  | Readonly<{ outcome: 'rejected'; reason: CanvasColumnMappingRejection }>;

type EditableCanvasProjectionEntry =
  | Readonly<{ outcome: 'ready'; projection: DvtSubstraitProjection | null }>
  | Readonly<{ outcome: 'rejected'; reason: CanvasColumnMappingRejection }>;

export type CanvasColumnMappingInputField = Readonly<{
  columnId: string;
  name: string;
  dataType: string;
}>;

export function readCanvasColumnMappingInputFields(args: {
  sourceNode: CanonicalNode;
  edges: readonly Readonly<{ sourceId: string; targetId: string }>[];
  resolveNode: (nodeId: string) => CanonicalNode | undefined;
}): readonly CanvasColumnMappingInputField[] {
  const physicalSource = resolveDvtSubstraitProjectionSource(args.sourceNode);
  if (physicalSource != null) {
    try {
      const sourceProjection = readDvtSourceOutputProjection(args.sourceNode);
      const projectedFields =
        sourceProjection == null
          ? physicalSource.fields
          : sourceProjection.outputs.flatMap((output) => {
              const field = physicalSource.fields.find(
                (candidate) => candidate.name === output.sourceFieldName
              );
              return field == null ? [] : [field];
            });
      return projectedFields.map((field) => ({
        columnId: field.name,
        name: field.name,
        dataType: field.dataType,
      }));
    } catch {
      return [];
    }
  }
  if (args.sourceNode.pluginId !== 'dvt' || args.sourceNode.kind !== 'dvt:transform') return [];
  const entry = readCanvasProjectionEntry({
    targetNode: args.sourceNode,
    edges: args.edges,
    resolveNode: args.resolveNode,
  });
  return entry.outcome === 'ready' && entry.projection != null
    ? entry.projection.outputs.map((output) => ({
        columnId: output.fieldId,
        name: output.name,
        dataType: output.dataType,
      }))
    : [];
}

function hasEditableOutputs(projection: Pick<DvtSubstraitProjectionSemantics, 'outputs'>): boolean {
  return projection.outputs.every(
    (output) =>
      (output.sourceFieldName != null || output.scalarExpression != null) &&
      output.calculation == null
  );
}

function sameProjectionSource(
  left: DvtSubstraitProjectionSemantics['source'],
  right: DvtSubstraitProjectionSemantics['source']
): boolean {
  return (
    left.table === right.table &&
    left.sourceRef.schemaVersion === right.sourceRef.schemaVersion &&
    left.sourceRef.sourceObjectId === right.sourceRef.sourceObjectId &&
    left.sourceRef.connectionRef.schemaVersion === right.sourceRef.connectionRef.schemaVersion &&
    left.sourceRef.connectionRef.connectionId === right.sourceRef.connectionRef.connectionId &&
    left.sourceRef.connectionRef.provider === right.sourceRef.connectionRef.provider &&
    left.fields.map((field) => field.name).join('\u0000') ===
      right.fields.map((field) => field.name).join('\u0000')
  );
}

function bindProjectionSourceTypes(
  targetNodeId: string,
  source: DvtSubstraitProjectionSource,
  projection: DvtSubstraitProjectionSemantics
): DvtSubstraitProjection {
  return {
    targetNodeId,
    source,
    outputs: projection.outputs.map((output) => ({
      ...output,
      dataType:
        output.scalarExpression != null
          ? output.dataType
          : output.calculation == null
            ? (source.fields.find((field) => field.name === output.sourceFieldName)?.dataType ??
              'unknown')
            : output.dataType,
    })),
  };
}

export function readEditableCanvasProjection(targetNode: CanonicalNode): EditableCanvasProjection {
  if (targetNode.pluginId !== 'dvt' || targetNode.kind !== 'dvt:transform') {
    return { outcome: 'rejected', reason: 'target_not_canonical_transform' };
  }
  try {
    const authority = readDvtTransformAuthoringAuthority(targetNode);
    if (authority == null) return { outcome: 'ready', projection: null };
    const inspection = inspectDvtSubstraitProjectionDraft(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
    );
    if (!inspection.ok || !hasEditableOutputs(inspection.projection)) {
      return { outcome: 'rejected', reason: 'target_not_canonical_transform' };
    }
    return { outcome: 'ready', projection: inspection.projection };
  } catch {
    return { outcome: 'rejected', reason: 'invalid_transform_authority' };
  }
}

function readCanvasProjectionEntry(args: {
  targetNode: CanonicalNode;
  edges: readonly Readonly<{ sourceId: string; targetId: string }>[];
  resolveNode: (nodeId: string) => CanonicalNode | undefined;
}): EditableCanvasProjectionEntry {
  if (args.targetNode.pluginId !== 'dvt' || args.targetNode.kind !== 'dvt:transform') {
    return { outcome: 'rejected', reason: 'target_not_canonical_transform' };
  }
  try {
    const authority = readDvtTransformAuthoringAuthority(args.targetNode);
    if (authority == null) return { outcome: 'ready', projection: null };
    const draft = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
    const inspection = inspectDvtSubstraitProjectionDraft(draft);
    if (!inspection.ok) {
      return { outcome: 'rejected', reason: 'target_not_canonical_transform' };
    }
    const nodeIds = new Set<string>([args.targetNode.id]);
    args.edges.forEach((edge) => {
      nodeIds.add(edge.sourceId);
      nodeIds.add(edge.targetId);
    });
    const nodes = [...nodeIds]
      .map((nodeId) => args.resolveNode(nodeId))
      .filter((node): node is CanonicalNode => node != null);
    const resolved = resolveDvtSubstraitProjectionEntry({
      targetNode: args.targetNode,
      nodes,
      edges: args.edges,
      draft,
    });
    if (resolved != null) return { outcome: 'ready', projection: resolved };

    const matchingSources = args.edges
      .filter((edge) => edge.targetId === args.targetNode.id)
      .flatMap((edge) => {
        const node = args.resolveNode(edge.sourceId);
        const source = node == null ? null : resolveDvtSubstraitProjectionSource(node);
        return source != null && sameProjectionSource(inspection.projection.source, source)
          ? [source]
          : [];
      });
    return matchingSources.length === 1
      ? {
          outcome: 'ready',
          projection: bindProjectionSourceTypes(
            args.targetNode.id,
            matchingSources[0]!,
            inspection.projection
          ),
        }
      : { outcome: 'rejected', reason: 'target_not_canonical_transform' };
  } catch {
    return { outcome: 'rejected', reason: 'invalid_transform_authority' };
  }
}

export function canAuthorCanvasColumnMappings(targetNode: CanonicalNode): boolean {
  return readEditableCanvasProjection(targetNode).outcome === 'ready';
}
