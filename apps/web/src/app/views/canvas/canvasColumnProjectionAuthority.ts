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
  type DvtSubstraitProjectionSource,
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

function sameProjectionSource(
  left: DvtSubstraitProjectionSemantics['source'],
  right: DvtSubstraitProjectionSemantics['source']
): boolean {
  return (
    left.schema === right.schema &&
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
        output.calculation == null
          ? (source.fields.find((field) => field.name === output.sourceFieldName)?.dataType ??
            'unknown')
          : output.dataType,
    })),
  };
}

function carryForwardProjectionIdentity(
  previous: DvtSubstraitProjectionDraft | null,
  next: DvtSubstraitProjectionDraft
): DvtSubstraitProjectionDraft {
  if (previous == null) return next;
  const previousInspection = inspectDvtSubstraitProjectionDraft(previous);
  const nextInspection = inspectDvtSubstraitProjectionDraft(next);
  if (!previousInspection.ok || !nextInspection.ok) return next;

  const previousSources = previous.sidecar.relations.filter(
    (relation) => relation.sourceRef != null
  );
  const previousTargets = previous.sidecar.relations.filter(
    (relation) => relation.sourceRef == null
  );
  const nextSources = next.sidecar.relations.filter((relation) => relation.sourceRef != null);
  const nextTargets = next.sidecar.relations.filter((relation) => relation.sourceRef == null);
  if (
    previousSources.length !== 1 ||
    previousTargets.length !== 1 ||
    nextSources.length !== 1 ||
    nextTargets.length !== 1
  ) {
    return next;
  }
  const previousSource = previousSources[0]!;
  const previousTarget = previousTargets[0]!;
  const nextSource = nextSources[0]!;
  const nextTarget = nextTargets[0]!;
  const sameSource = sameProjectionSource(
    previousInspection.projection.source,
    nextInspection.projection.source
  );

  const nextSourceFieldIdToPrevious = new Map<string, string>();
  if (sameSource) {
    const previousSourceFieldIdByName = new Map(
      previous.sidecar.fields
        .filter(
          (field) => field.relationId === previousSource.relationId && field.displayName != null
        )
        .map((field) => [field.displayName!, field.fieldId] as const)
    );
    next.sidecar.fields
      .filter((field) => field.relationId === nextSource.relationId && field.displayName != null)
      .forEach((field) => {
        const previousFieldId = previousSourceFieldIdByName.get(field.displayName!);
        if (previousFieldId != null)
          nextSourceFieldIdToPrevious.set(field.fieldId, previousFieldId);
      });
    if (nextSourceFieldIdToPrevious.size !== nextInspection.projection.source.fields.length) {
      return next;
    }
  }

  return {
    plan: next.plan,
    sidecar: {
      ...next.sidecar,
      relations: next.sidecar.relations.map((relation) => {
        if (relation.relationId === nextTarget.relationId) {
          return { ...relation, relationId: previousTarget.relationId };
        }
        return sameSource && relation.relationId === nextSource.relationId
          ? { ...relation, relationId: previousSource.relationId }
          : relation;
      }),
      fields: next.sidecar.fields.map((field) => {
        const relationId =
          field.relationId === nextTarget.relationId
            ? previousTarget.relationId
            : sameSource && field.relationId === nextSource.relationId
              ? previousSource.relationId
              : field.relationId;
        const fieldId = sameSource
          ? (nextSourceFieldIdToPrevious.get(field.fieldId) ?? field.fieldId)
          : field.fieldId;
        const sourceFieldId =
          sameSource && field.sourceFieldId != null
            ? (nextSourceFieldIdToPrevious.get(field.sourceFieldId) ?? field.sourceFieldId)
            : field.sourceFieldId;
        return {
          ...field,
          relationId,
          fieldId,
          ...(sourceFieldId == null ? {} : { sourceFieldId }),
        };
      }),
    },
  };
}

function readCurrentProjectionDraft(targetNode: CanonicalNode): DvtSubstraitProjectionDraft | null {
  try {
    const authority = readDvtTransformAuthoringAuthority(targetNode);
    return authority == null
      ? null
      : decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
  } catch {
    return null;
  }
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
        (candidate) => candidate.fieldId === columnId
      );
      if (output != null) {
        return { nodeId: targetNode.id, outputId: output.fieldId, columnName: output.name };
      }
      if (inspection.projection.outputs.some((candidate) => candidate.name === columnId)) {
        return null;
      }
      return { nodeId: targetNode.id, columnName: columnId };
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
  const previousDraft = readCurrentProjectionDraft(args.targetNode);
  let draft = carryForwardProjectionIdentity(
    previousDraft,
    createDvtSubstraitProjectionDraft({
      source,
      targetNodeId: args.targetNode.id,
      outputs: args.outputs.map((output) => ({
        fieldId: output.fieldId,
        name: output.name,
        sourceFieldName: output.sourceFieldName!,
      })),
    })
  );
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
