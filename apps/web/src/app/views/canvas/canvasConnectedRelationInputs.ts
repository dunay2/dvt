/** Match connected physical provenance independently of the operations between Read and output. */
import { hasSameConnectionRef } from '@dvt/postgres-projection';
import {
  deriveSubstraitSchemas,
  resolveProducerInput,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  resolveCanvasDvtCompositionInputs,
  type CanvasDvtCompositionInput,
} from './canvasDvtCompositionInputCatalog';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import type { SourceSetInput } from './canvasSourceSet';
import { equals } from '@bufbuild/protobuf';
import { TypeSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import {
  sourceFieldType,
  canvasInputConnection,
  type CanvasRelationInputSource,
} from './canvasSourceRelation';
import { canvasInputRequiresProjection } from './canvasInputComposition';

/** Execution closure checks provenance; physical schema admission belongs to authoring. */
export function hasConnectedRelationSources(
  document: SubstraitDocument,
  sources: readonly Pick<CanvasDvtCompositionInput, 'sourceRef'>[]
): boolean {
  const { index } = deriveSubstraitSchemas(document);
  const reads = [...index.relations.values()].filter(
    (entry) => entry.relation.relType.case === 'read'
  );
  const matches = (read: (typeof reads)[number], source: (typeof sources)[number]) =>
    source.sourceRef != null &&
    read.binding.sourceRef != null &&
    read.binding.sourceRef.sourceObjectId === source.sourceRef.sourceObjectId &&
    hasSameConnectionRef(read.binding.sourceRef.connectionRef, source.sourceRef.connectionRef);
  return (
    reads.length > 0 &&
    reads.every((read) => sources.filter((source) => matches(read, source)).length === 1) &&
    sources.every((source) => reads.some((read) => matches(read, source)))
  );
}

export function hasConnectedRelationInputs(
  document: SubstraitDocument,
  sources: readonly CanvasDvtCompositionInput[]
): boolean {
  const { index } = deriveSubstraitSchemas(document);
  const reads = [...index.relations.values()].filter(
    (entry) => entry.relation.relType.case === 'read'
  );
  const matches = (read: (typeof reads)[number], source: CanvasDvtCompositionInput): boolean => {
    if (source.producer != null) {
      if (read.binding.producerRef?.nodeId !== source.nodeId) return false;
      try {
        resolveProducerInput(read, source.producer.document);
        return true;
      } catch {
        return false;
      }
    }
    return (
      source.sourceRef != null &&
      read.binding.sourceRef != null &&
      read.binding.sourceRef.sourceObjectId === source.sourceRef.sourceObjectId &&
      hasSameConnectionRef(read.binding.sourceRef.connectionRef, source.sourceRef.connectionRef) &&
      read.relation.relType.case === 'read' &&
      read.relation.relType.value.baseSchema?.struct?.types.length === source.fields.length &&
      source.fields.every((field, ordinal) => {
        const variant = read.relation.relType;
        if (variant.case !== 'read' || field.joinDataType == null) return false;
        const schema = variant.value.baseSchema!;
        return (
          schema.names[ordinal] === field.name &&
          equals(
            TypeSchema,
            schema.struct!.types[ordinal]!,
            sourceFieldType(field.joinDataType, field.nullable ?? true)
          )
        );
      })
    );
  };
  return (
    reads.length > 0 &&
    reads.every((read) => sources.filter((source) => matches(read, source)).length === 1) &&
    sources.every((source) => reads.some((read) => matches(read, source)))
  );
}

export function resolveConnectedSetEntry(
  args: Readonly<{
    targetNode: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
    requirePersistedAuthority?: boolean;
  }>
): Readonly<{
  inputs: readonly SourceSetInput<CanvasRelationInputSource>[];
  targetNodeId: string;
}> | null {
  if (args.targetNode.kind !== 'dvt:transform' || args.targetNode.role !== 'transform') return null;
  const sources = resolveCanvasDvtCompositionInputs({ ...args, targetNodeId: args.targetNode.id });
  if (sources.some(canvasInputRequiresProjection)) return null;
  const connected = new Set(
    args.edges.filter((edge) => edge.targetId === args.targetNode.id).map((edge) => edge.sourceId)
  );
  if (connected.size !== sources.length) return null;
  const first = sources[0];
  if (
    first == null ||
    sources.length < 2 ||
    sources.some(
      (source) =>
        !hasSameConnectionRef(canvasInputConnection(first), canvasInputConnection(source)) ||
        source.fields.length !== first.fields.length ||
        source.fields.some(
          (field, ordinal) =>
            field.joinDataType == null || field.joinDataType !== first.fields[ordinal]!.joinDataType
        )
    )
  )
    return null;
  if (args.requirePersistedAuthority) {
    try {
      const authority = readDvtTransformAuthoringAuthority(args.targetNode);
      if (
        authority == null ||
        !hasConnectedRelationInputs(
          decodeDvtSubstraitSemanticDocument(authority.semanticDocument),
          sources
        )
      )
        return null;
    } catch {
      return null;
    }
  }
  return {
    targetNodeId: args.targetNode.id,
    inputs: sources.map((source) => ({
      ...source,
      fields: source.fields.map((field) => ({
        id: field.id,
        name: field.name,
        type: field.joinDataType!,
        nullable: field.nullable,
      })),
    })),
  };
}
