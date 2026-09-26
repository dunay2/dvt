/** A consumer owns a Read occurrence, never the producer's relation tree. */
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  TypeSchema,
  Type_Nullability,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create, toJson } from '@bufbuild/protobuf';
import { allocateDvtFieldId, allocateDvtRelationId } from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';

import { SubstraitAnalysisError, type SubstraitDocument } from './document.js';
import type { IndexedRelation } from './relationIndex.js';
import { deriveSubstraitSchemas } from './relationSchema.js';
import { bindSchemaFields } from './schemaHierarchy.js';

export function createProducerInput(
  producer: Readonly<{ nodeId: string; name: string; document: SubstraitDocument }>,
  relAnchor: number
): {
  relation: IndexedRelation['relation'];
  binding: IndexedRelation['binding'];
  fields: SubstraitDocument['sidecar']['fields'];
} {
  const analysis = deriveSubstraitSchemas(producer.document);
  const root = analysis.index.relations.get(analysis.index.rootId)!;
  const fields = analysis.schemas.get(analysis.index.rootId)!;
  const relationId = allocateDvtRelationId();
  const ids = new Map(root.fields.map((field) => [field.fieldId, allocateDvtFieldId()]));
  const bindings = root.fields.map((field) => ({
    fieldId: ids.get(field.fieldId)!,
    relationId,
    outputOrdinal: field.outputOrdinal,
    displayName: field.displayName,
    ...(field.description == null ? {} : { description: field.description }),
    ...(field.parentFieldId == null ? {} : { parentFieldId: ids.get(field.parentFieldId)! }),
  }));
  const names = (parent?: string): string[] =>
    bindings
      .filter((field) => field.parentFieldId === parent)
      .sort((left, right) => left.outputOrdinal - right.outputOrdinal)
      .flatMap((field) => [field.displayName ?? field.fieldId, ...names(field.fieldId)]);
  return {
    relation: create(RelSchema, {
      relType: {
        case: 'read',
        value: {
          common: { relAnchor },
          readType: { case: 'namedTable', value: { names: [producer.nodeId] } },
          baseSchema: {
            names: names(),
            struct: {
              nullability: Type_Nullability.REQUIRED,
              types: fields.map((field) => field.type),
            },
          },
        },
      },
    }),
    binding: {
      relationId,
      relAnchor,
      displayName: producer.name,
      producerRef: {
        nodeId: producer.nodeId,
        fields: root.fields.map((field) => ({
          fieldId: ids.get(field.fieldId)!,
          producerFieldId: field.fieldId,
        })),
      },
    },
    fields: bindings,
  };
}

/** Validate by published identity and schema, never by column name or ordinal. */
export function resolveProducerInput(
  entry: IndexedRelation,
  producer: SubstraitDocument
): {
  analysis: ReturnType<typeof deriveSubstraitSchemas>;
  root: IndexedRelation;
  fields: IndexedRelation['fields'];
} {
  const reference = entry.binding.producerRef;
  if (entry.relation.relType.case !== 'read' || reference == null)
    throw new SubstraitAnalysisError('invalid_binding', 'Expected a producer input.');
  const analysis = deriveSubstraitSchemas(producer);
  const root = analysis.index.relations.get(analysis.index.rootId)!;
  const published = bindSchemaFields(analysis.schemas.get(analysis.index.rootId)!, root.fields);
  const localTypes = entry.relation.relType.value.baseSchema?.struct?.types ?? [];
  const local = new Map(entry.fields.map((field) => [field.fieldId, field]));
  const output = new Map(root.fields.map((field) => [field.fieldId, field]));
  const top = reference.fields
    .filter((field) => local.get(field.fieldId)?.parentFieldId == null)
    .sort(
      (left, right) =>
        local.get(left.fieldId)!.outputOrdinal - local.get(right.fieldId)!.outputOrdinal
    );
  for (const field of top) {
    const current = published.get(field.producerFieldId);
    const type = localTypes[local.get(field.fieldId)!.outputOrdinal];
    if (
      current == null ||
      type == null ||
      jcsCanonicalize(toJson(TypeSchema, current.type)) !==
        jcsCanonicalize(toJson(TypeSchema, type))
    )
      throw new SubstraitAnalysisError(
        'invalid_binding',
        'A producer field was removed or its type changed.'
      );
  }
  return { analysis, root, fields: top.map((field) => output.get(field.producerFieldId)!) };
}
