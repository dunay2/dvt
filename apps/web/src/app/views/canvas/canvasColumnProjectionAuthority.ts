/** Owns canonical Substrait projection reads and persistence for column commands. */
import type { CanonicalNode } from '../../types/canonical';
import type {
  CanvasColumnMappingRejection,
  CanvasColumnMappingTarget,
} from './canvasColumnMappingModel';
import { readCanvasNodeColumns } from './canvasColumnMappingModel';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import {
  applyDvtSubstraitProjectionFunction,
  createDvtSubstraitProjectionDraft,
  decodeDvtSubstraitProjectionDocument,
  encodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitColumnFunctions,
  resolveDvtSubstraitProjectionEntry,
  resolveDvtSubstraitProjectionSource,
  type DvtSubstraitProjection,
  type DvtSubstraitProjectionDraft,
  type DvtSubstraitProjectionOutput,
  type DvtSubstraitProjectionSemantics,
} from './canvasDvtSubstraitProjection';

export type EditableCanvasProjection =
  | Readonly<{ outcome: 'ready'; projection: DvtSubstraitProjectionSemantics | null }>
  | Readonly<{ outcome: 'rejected'; reason: CanvasColumnMappingRejection }>;

export type EditableCanvasProjectionEntry =
  | Readonly<{ outcome: 'ready'; projection: DvtSubstraitProjection | null }>
  | Readonly<{ outcome: 'rejected'; reason: CanvasColumnMappingRejection }>;

function hasEditableOutputs(projection: DvtSubstraitProjectionSemantics): boolean {
  return projection.outputs.every(
    (output) => output.sourceFieldName != null && output.calculation == null
  );
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

export function readEditableCanvasProjectionEntry(args: {
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
    if (!inspection.ok || !hasEditableOutputs(inspection.projection)) {
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
    const projection = resolveDvtSubstraitProjectionEntry({
      targetNode: args.targetNode,
      nodes,
      edges: args.edges,
      draft,
    });
    return projection == null
      ? { outcome: 'rejected', reason: 'target_not_canonical_transform' }
      : { outcome: 'ready', projection };
  } catch {
    return { outcome: 'rejected', reason: 'invalid_transform_authority' };
  }
}

export function canAuthorCanvasColumnMappings(targetNode: CanonicalNode): boolean {
  return readEditableCanvasProjection(targetNode).outcome === 'ready';
}

export function resolveCanvasColumnMappingTarget(
  targetNode: CanonicalNode,
  columnId: string
): CanvasColumnMappingTarget | null {
  if (targetNode.pluginId !== 'dvt' || targetNode.kind !== 'dvt:transform') return null;
  try {
    const authority = readDvtTransformAuthoringAuthority(targetNode);
    if (authority != null) {
      const inspection = inspectDvtSubstraitProjectionDraft(
        decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
      );
      if (!inspection.ok) return null;
      const output = inspection.projection.outputs.find(
        (candidate) => candidate.fieldId === columnId || candidate.name === columnId
      );
      return output == null
        ? { nodeId: targetNode.id, columnName: columnId }
        : { nodeId: targetNode.id, outputId: output.fieldId, columnName: output.name };
    }
    const targetColumn = readCanvasNodeColumns(targetNode).find(
      (column) => column.name === columnId
    );
    return {
      nodeId: targetNode.id,
      columnName: columnId,
      ...(targetColumn?.type == null ? {} : { dataType: targetColumn.type }),
    };
  } catch {
    return null;
  }
}

export function isSimpleCanvasPassthrough(output: DvtSubstraitProjectionOutput): boolean {
  return output.sourceFieldName != null && output.calculation == null && !output.operations?.length;
}

export function persistCanvasProjectionOutputs(args: {
  targetNode: CanonicalNode;
  projection: DvtSubstraitProjection | null;
  outputs: readonly DvtSubstraitProjectionOutput[];
  resolveNode: (nodeId: string) => CanonicalNode | undefined;
  sourceNodeIdHint?: string;
}):
  | Readonly<{ outcome: 'applied'; node: CanonicalNode }>
  | Readonly<{
      outcome: 'rejected';
      reason: Extract<CanvasColumnMappingRejection, 'projection_requires_one_connected_source'>;
    }> {
  const sourceNodeId = args.sourceNodeIdHint ?? args.projection?.source.nodeId;
  const sourceNode = sourceNodeId == null ? undefined : args.resolveNode(sourceNodeId);
  const source = sourceNode == null ? null : resolveDvtSubstraitProjectionSource(sourceNode);
  if (source == null || args.outputs.some((output) => output.sourceFieldName == null)) {
    return { outcome: 'rejected', reason: 'projection_requires_one_connected_source' };
  }
  let draft = createDvtSubstraitProjectionDraft({
    source,
    targetNodeId: args.targetNode.id,
    outputs: args.outputs.map((output) => ({
      fieldId: output.fieldId,
      name: output.name,
      sourceFieldName: output.sourceFieldName!,
    })),
  });
  for (const output of args.outputs) {
    const sourceField = source.fields.find((field) => field.name === output.sourceFieldName);
    if (sourceField == null) {
      return { outcome: 'rejected', reason: 'projection_requires_one_connected_source' };
    }
    for (const functionName of output.operations ?? []) {
      const capability = resolveDvtSubstraitColumnFunctions({
        dataType: sourceField.dataType,
        provider: source.sourceRef.connectionRef.provider,
      }).find((candidate) => candidate.name === functionName);
      if (capability == null) {
        return { outcome: 'rejected', reason: 'projection_requires_one_connected_source' };
      }
      const nextDraft = applyDvtSubstraitProjectionFunction(draft, {
        fieldId: output.fieldId,
        capabilityId: capability.capabilityId,
        alias: output.name,
        dataType: sourceField.dataType,
        provider: source.sourceRef.connectionRef.provider,
      });
      if (nextDraft === draft) {
        return { outcome: 'rejected', reason: 'projection_requires_one_connected_source' };
      }
      draft = nextDraft;
    }
  }
  const document = encodeDvtSubstraitProjectionDocument(
    copyOutputDescriptions(draft, args.outputs)
  );
  return {
    outcome: 'applied',
    node: applyDvtSubstraitSemanticDocument(args.targetNode, document),
  };
}

function copyOutputDescriptions(
  draft: DvtSubstraitProjectionDraft,
  outputs: readonly DvtSubstraitProjectionOutput[]
): DvtSubstraitProjectionDraft {
  const descriptions = new Map(
    outputs.flatMap((output) =>
      output.description == null ? [] : [[output.fieldId, output.description] as const]
    )
  );
  return descriptions.size === 0
    ? draft
    : {
        ...draft,
        sidecar: {
          ...draft.sidecar,
          fields: draft.sidecar.fields.map((field) => {
            const description = descriptions.get(field.fieldId);
            return description == null ? field : { ...field, description };
          }),
        },
      };
}
