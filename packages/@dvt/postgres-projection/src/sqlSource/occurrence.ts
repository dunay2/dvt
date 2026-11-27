/** Admit current Read provenance and allocate one explicit source occurrence. */
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { clone, create, equals } from '@bufbuild/protobuf';
import { allocateDvtRelationId } from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';
import { createProducerInput, type IndexedRelation } from '@dvt/substrait-analysis';

import {
  appendSourceRelation,
  sourceBudget,
  sourceError,
  sourceOutputFields,
  type ModelSqlSourceInput,
  type SqlCompilationState,
  type SqlScope,
} from './context.js';
import { checkedSourceAnalysis } from './provenance.js';
import {
  admitRetainedSourceColumns,
  createSourceProducerOccurrence,
  projectSourcePublication,
  sourcePublicationOrdinals,
} from './publication.js';

export function prepareRetainedSourceAuthority(state: SqlCompilationState): void {
  for (const document of [
    state.context.currentDocument,
    ...(state.context.retainedDocuments ?? []),
  ]) {
    if (document == null) continue;
    for (const entry of checkedSourceAnalysis(document).index.relations.values()) {
      if (entry.relation.relType.case !== 'read') continue;
      const previous = state.retainedReads.get(entry.binding.relationId);
      if (
        previous != null &&
        (!equals(RelSchema, previous.relation, entry.relation) ||
          jcsCanonicalize(previous.binding) !== jcsCanonicalize(entry.binding) ||
          jcsCanonicalize(previous.fields) !== jcsCanonicalize(entry.fields))
      )
        sourceError('invalid_model', 'Retained Read identities have conflicting authorities.');
      state.retainedReads.set(entry.binding.relationId, entry);
    }
  }
}

function admitRetainedRead(
  state: SqlCompilationState,
  input: ModelSqlSourceInput
): IndexedRelation | null {
  const entry = input.retainedRead;
  if (entry == null) return null;
  const known = state.retainedReads.get(entry.binding.relationId);
  if (
    known == null ||
    !equals(RelSchema, known.relation, entry.relation) ||
    jcsCanonicalize(known.binding) !== jcsCanonicalize(entry.binding) ||
    jcsCanonicalize(known.fields) !== jcsCanonicalize(entry.fields) ||
    entry.relation.relType.case !== 'read'
  )
    return sourceError(
      'input_unavailable',
      'The retained Read is outside current semantic authority.'
    );
  const read = entry.relation.relType.value;
  admitRetainedSourceColumns(entry, input);
  if ('sourceRef' in input.source) {
    if (
      jcsCanonicalize(entry.binding.sourceRef ?? null) !==
        jcsCanonicalize(input.source.sourceRef) ||
      read.readType.case !== 'namedTable' ||
      jcsCanonicalize(read.readType.value.names) !== jcsCanonicalize(input.source.names)
    )
      return sourceError('input_unavailable', 'The retained physical binding changed.');
  } else {
    if (
      entry.binding.producerRef?.nodeId !== input.nodeId ||
      input.source.producer.nodeId !== input.nodeId
    )
      return sourceError('input_unavailable', 'The retained producer binding changed.');
  }
  return entry;
}

export function readSourceOccurrence(
  state: SqlCompilationState,
  input: ModelSqlSourceInput,
  qualifier: string
): SqlScope {
  sourceBudget(state);
  if (input.columns.length === 0)
    return sourceError('input_unavailable', 'The logical input publishes no fields.');
  const retained = admitRetainedRead(state, input);
  const relAnchor = state.entries.length + 1;
  let bundle: ReturnType<typeof createProducerInput>;
  if (retained != null && !state.usedReadIds.has(retained.binding.relationId)) {
    const relation = clone(RelSchema, retained.relation);
    if (relation.relType.case !== 'read')
      return sourceError('invalid_model', 'Expected a retained Read.');
    relation.relType.value.common = { ...relation.relType.value.common!, relAnchor };
    bundle = {
      relation,
      binding: { ...retained.binding, relAnchor },
      fields: retained.fields.map((field) => ({ ...field })),
    };
  } else if ('producer' in input.source) {
    bundle = createSourceProducerOccurrence(input, qualifier, relAnchor);
  } else {
    const binding = {
      relationId: allocateDvtRelationId(),
      relAnchor,
      sourceRef: input.source.sourceRef,
      displayName: qualifier,
    };
    const names = input.columns.map((column) => column.name);
    bundle = {
      binding,
      fields: [...sourceOutputFields(binding.relationId, names)],
      relation: create(RelSchema, {
        relType: {
          case: 'read',
          value: {
            common: { relAnchor },
            readType: { case: 'namedTable', value: { names: [...input.source.names] } },
            baseSchema: {
              names,
              struct: {
                types: input.columns.map((column) => column.type),
                nullability: Type_Nullability.REQUIRED,
              },
            },
          },
        },
      }),
    };
  }
  state.usedReadIds.add(bundle.binding.relationId);
  const entry = appendSourceRelation(state, { ...bundle, inputs: [] });
  const ordinals = sourcePublicationOrdinals(entry, input);
  for (const [position, ordinal] of ordinals.entries()) {
    const field = entry.fields[ordinal]!;
    state.readOrigins.set(field.fieldId, {
      nodeId: input.nodeId,
      columnId: input.columns[position]!.id,
    });
  }
  const published = projectSourcePublication(state, entry, input);
  return {
    entry: published,
    bindings: input.columns.map((column, ordinal) => ({ name: column.name, qualifier, ordinal })),
  };
}
