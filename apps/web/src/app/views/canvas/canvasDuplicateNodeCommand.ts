/** Owned concern: derive semantic duplicate-node commands from a source node and current graph state. */

import {
  allocateDvtFieldId,
  allocateDvtRelationId,
  DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY,
} from '@dvt/contracts';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import type { CanonicalNode } from '../../types/canonical';
import { toCanvasAuthoringMetadata } from './canvasAuthoringMetadata';
import { admitCanonicalNodeToCanvas } from './canvasNodeDropAggregate';

type CanvasDuplicateSourceNode = Readonly<{
  id: string;
  position: { x: number; y: number };
}> &
  Readonly<Record<string, unknown>>;

type BuildDuplicateNodeCommandArgs = Readonly<{
  sourceNode: CanvasDuplicateSourceNode;
  sourceCanonicalNode: CanonicalNode;
  existingNodes: readonly CanvasDuplicateSourceNode[];
}>;

type CanvasDuplicateNodeCommand = Readonly<{
  canonicalNode: CanonicalNode;
  position: { x: number; y: number };
}>;

const DUPLICATE_NODE_POSITION_OFFSET = 48;

type ResolveCanvasNodeDuplicateTransactionArgs = Readonly<{
  nodeId: string;
  sourceCanonicalNode: CanonicalNode | null;
  existingNodes: readonly CanvasDuplicateSourceNode[];
  visibleNodeIds: readonly string[];
}>;

export type CanvasNodeDuplicateTransaction =
  | Readonly<{
      outcome: 'added';
      canonicalNode: CanonicalNode;
      position: { x: number; y: number };
    }>
  | Readonly<{
      outcome: 'noop';
      reason: string;
    }>
  | Readonly<{
      outcome: 'missing_source_node';
    }>;

function resolveNextDuplicateIndex(
  sourceNodeId: string,
  existingNodes: readonly CanvasDuplicateSourceNode[]
): number {
  const existingIds = new Set(existingNodes.map((node) => node.id));
  let nextIndex = 1;

  while (existingIds.has(`${sourceNodeId}-copy-${nextIndex}`)) {
    nextIndex += 1;
  }

  return nextIndex;
}

export function buildDuplicateNodeCommand({
  sourceNode,
  sourceCanonicalNode,
  existingNodes,
}: BuildDuplicateNodeCommandArgs): CanvasDuplicateNodeCommand {
  const nextIndex = resolveNextDuplicateIndex(sourceNode.id, existingNodes);

  let canonicalNode: CanonicalNode = {
    id: `${sourceNode.id}-copy-${nextIndex}`,
    name: `${sourceCanonicalNode.name} (copy ${nextIndex})`,
    pluginId: sourceCanonicalNode.pluginId,
    kind: sourceCanonicalNode.kind,
    role: sourceCanonicalNode.role,
    status: 'idle',
    tags: [...sourceCanonicalNode.tags],
    path: sourceCanonicalNode.path,
    description: sourceCanonicalNode.description,
    metadata: toCanvasAuthoringMetadata(sourceCanonicalNode.metadata),
  };
  if (
    (canonicalNode.kind === 'dvt:source' || canonicalNode.kind === 'dvt:transform') &&
    canonicalNode.metadata?.[DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY] != null
  ) {
    const authority = readDvtTransformAuthoringAuthority(canonicalNode);
    if (authority != null) {
      const { sidecar } = authority.semanticDocument;
      const relationIds = new Map(
        sidecar.relations.map((relation) => [relation.relationId, allocateDvtRelationId()])
      );
      const fieldIds = new Map(
        sidecar.fields.map((field) => [field.fieldId, allocateDvtFieldId()])
      );
      canonicalNode = applyDvtSubstraitSemanticDocument(canonicalNode, {
        ...authority.semanticDocument,
        sidecar: {
          ...sidecar,
          relations: sidecar.relations.map((relation) => ({
            ...relation,
            relationId: relationIds.get(relation.relationId)!,
          })),
          fields: sidecar.fields.map((field) => ({
            ...field,
            fieldId: fieldIds.get(field.fieldId)!,
            relationId: relationIds.get(field.relationId)!,
            ...(field.sourceFieldId == null
              ? {}
              : { sourceFieldId: fieldIds.get(field.sourceFieldId)! }),
            ...(field.parentFieldId == null
              ? {}
              : { parentFieldId: fieldIds.get(field.parentFieldId)! }),
          })),
        },
      });
    }
  }
  return {
    canonicalNode,
    position: {
      x: sourceNode.position.x + DUPLICATE_NODE_POSITION_OFFSET * nextIndex,
      y: sourceNode.position.y + DUPLICATE_NODE_POSITION_OFFSET * nextIndex,
    },
  };
}
export function resolveCanvasNodeDuplicateTransaction({
  nodeId,
  sourceCanonicalNode,
  existingNodes,
  visibleNodeIds,
}: ResolveCanvasNodeDuplicateTransactionArgs): CanvasNodeDuplicateTransaction {
  const sourceNode = existingNodes.find((candidate) => candidate.id === nodeId);
  if (sourceCanonicalNode == null || sourceNode == null) {
    return { outcome: 'missing_source_node' };
  }

  let command: CanvasDuplicateNodeCommand;
  try {
    command = buildDuplicateNodeCommand({ sourceNode, sourceCanonicalNode, existingNodes });
  } catch {
    return { outcome: 'noop', reason: 'invalid_semantic_authority' };
  }
  const { canonicalNode, position } = command;
  const admission = admitCanonicalNodeToCanvas({
    canonicalNode,
    visibleNodeIds,
  });

  switch (admission.outcome) {
    case 'added':
      return {
        outcome: 'added',
        canonicalNode: admission.canonicalNode,
        position,
      };
    case 'noop':
      return {
        outcome: 'noop',
        reason: admission.reason,
      };
  }
}
