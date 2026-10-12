/** Preserve and validate the canonical identity of a detached draft Read. */
import {
  indexSubstraitRelations,
  deriveRelationSchema,
  resolveProducerInput,
  type IndexedRelation,
} from '@dvt/substrait-analysis';
import { toJson } from '@bufbuild/protobuf';
import { TypeSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { jcsCanonicalize } from '@dvt/crypto';
import type { CanvasDvtCompositionInput } from '../canvasDvtCompositionInputCatalog';
import { createCanvasInputRead, sourceFieldType } from '../canvasSourceRelation';
import type { DvtRelationalAuthoringDraftV1 } from '@dvt/contracts';
import { decodeDvtSubstraitSemanticDocument } from '../canvasDvtSubstraitSemanticDocument';

export type PendingSourceOccurrence = Readonly<{
  sourceNodeId: string;
  read: ReturnType<typeof createCanvasInputRead>;
}>;

export function createPendingSourceOccurrence(
  input: CanvasDvtCompositionInput
): PendingSourceOccurrence {
  return {
    sourceNodeId: input.nodeId,
    read: createCanvasInputRead(input, 1),
  };
}
export function restorePendingSourceOccurrence(
  input: CanvasDvtCompositionInput,
  source: DvtRelationalAuthoringDraftV1['sources'][number]
): PendingSourceOccurrence | null {
  try {
    if (input.nodeId !== source.sourceNodeId) return null;
    const document = decodeDvtSubstraitSemanticDocument(source.semanticDocument);
    const indexed = indexSubstraitRelations(document);
    if (!indexed.ok || indexed.index.relations.size !== 1) return null;
    const read = indexed.index.relations.get(source.relationId);
    if (read == null || !validatePendingSourceInput(read, input)) return null;
    deriveRelationSchema(read, []);
    return {
      sourceNodeId: source.sourceNodeId,
      read: {
        relation: read.relation,
        binding: { ...read.binding, displayName: source.displayName },
        fields: read.fields,
      },
    };
  } catch {
    return null;
  }
}

function validatePendingSourceInput(
  read: IndexedRelation,
  input: CanvasDvtCompositionInput
): boolean {
  if (read.relation.relType.case !== 'read') return false;
  if (input.sourceRef == null) {
    if (read.binding.producerRef?.nodeId !== input.nodeId) return false;
    resolveProducerInput(read, input.producer.document);
    return true;
  }
  if (jcsCanonicalize(read.binding.sourceRef ?? null) !== jcsCanonicalize(input.sourceRef))
    return false;
  const saved = read.relation.relType.value;
  if (
    saved.readType.case !== 'namedTable' ||
    jcsCanonicalize(saved.readType.value.names) !== jcsCanonicalize([input.schema, input.table])
  )
    return false;
  const names = saved.baseSchema?.names ?? [];
  const types = saved.baseSchema?.struct?.types ?? [];
  return (
    names.length === input.fields.length &&
    names.length === types.length &&
    names.every((name, ordinal) => {
      const field = input.fields.find((candidate) => candidate.name === name);
      return (
        field != null &&
        jcsCanonicalize(toJson(TypeSchema, types[ordinal]!)) ===
          jcsCanonicalize(
            toJson(TypeSchema, sourceFieldType(field.joinDataType, field.nullable ?? true))
          )
      );
    })
  );
}
