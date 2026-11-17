/** Keep complete Read admission separate from the logical namespace's published subset. */
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { TypeSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create, equals } from '@bufbuild/protobuf';
import {
  createProducerInput,
  resolveProducerInput,
  type IndexedRelation,
} from '@dvt/substrait-analysis';

import {
  appendSourceRelation,
  nextSourceRelation,
  sourceError,
  sourceOutputFields,
  type ModelSqlSourceInput,
  type SqlCompilationState,
} from './context.js';

export function sourcePublicationOrdinals(
  entry: IndexedRelation,
  input: ModelSqlSourceInput
): number[] {
  return input.columns.map((column) => {
    const field = entry.fields.find((candidate) =>
      entry.binding.producerRef != null
        ? entry.binding.producerRef.fields.some(
            (mapping) =>
              mapping.fieldId === candidate.fieldId && mapping.producerFieldId === column.id
          )
        : candidate.displayName === column.id
    );
    if (field == null || field.parentFieldId != null || field.displayName !== column.name)
      return sourceError(
        'input_unavailable',
        'The requested field is outside the current Read publication.'
      );
    return field.outputOrdinal;
  });
}

export function admitRetainedSourceColumns(
  entry: IndexedRelation,
  input: ModelSqlSourceInput
): void {
  if (entry.relation.relType.case !== 'read')
    return sourceError('invalid_model', 'Expected a Read.');
  const read = entry.relation.relType.value;
  const names = read.baseSchema?.names ?? [];
  const types = read.baseSchema?.struct?.types ?? [];
  if (
    read.projection != null ||
    read.filter != null ||
    read.bestEffortFilter != null ||
    read.common?.emitKind.case === 'emit' ||
    names.length !== entry.fields.length ||
    new Set(names).size !== names.length
  )
    return sourceError(
      'input_unavailable',
      'The retained Read is outside the admitted publication profile.'
    );
  if ('producer' in input.source) resolveProducerInput(entry, input.source.producer.document);
  else {
    const facts = input.source.columns ?? input.columns;
    if (
      names.some((name, ordinal) => {
        const column = facts.find((candidate) => candidate.id === name && candidate.name === name);
        return (
          column == null ||
          types[ordinal] == null ||
          !equals(TypeSchema, column.type, types[ordinal]!)
        );
      })
    )
      return sourceError(
        'input_unavailable',
        'The retained physical Read no longer matches its complete publication facts.'
      );
  }
  const ordinals = sourcePublicationOrdinals(entry, input);
  if (
    ordinals.some(
      (ordinal, position) =>
        types[ordinal] == null ||
        !equals(TypeSchema, input.columns[position]!.type, types[ordinal]!)
    )
  )
    return sourceError('input_unavailable', 'The retained visible field type changed.');
}

export function createSourceProducerOccurrence(
  input: ModelSqlSourceInput,
  name: string,
  anchor: number
): ReturnType<typeof createProducerInput> {
  if (!('producer' in input.source))
    return sourceError('invalid_model', 'Expected a producer publication.');
  const bundle = createProducerInput({ ...input.source.producer, name }, anchor);
  const references = bundle.binding.producerRef!.fields;
  const fields = input.columns.map((column, outputOrdinal) => {
    const field = bundle.fields.find((candidate) =>
      references.some(
        (mapping) => mapping.fieldId === candidate.fieldId && mapping.producerFieldId === column.id
      )
    );
    const read = bundle.relation.relType;
    const original =
      read.case === 'read'
        ? read.value.baseSchema?.struct?.types[field?.outputOrdinal ?? -1]
        : undefined;
    if (
      field == null ||
      field.parentFieldId != null ||
      field.displayName !== column.name ||
      original == null ||
      !equals(TypeSchema, original, column.type)
    )
      return sourceError(
        'input_unavailable',
        'Producer occurrence is outside its current publication.'
      );
    return { ...field, outputOrdinal };
  });
  if (bundle.relation.relType.case !== 'read')
    return sourceError('invalid_model', 'Expected a producer Read.');
  bundle.relation.relType.value.baseSchema!.names = input.columns.map((column) => column.name);
  bundle.relation.relType.value.baseSchema!.struct!.types = input.columns.map(
    (column) => column.type
  );
  return {
    ...bundle,
    fields,
    binding: {
      ...bundle.binding,
      producerRef: {
        ...bundle.binding.producerRef!,
        fields: references.filter((mapping) =>
          fields.some((field) => field.fieldId === mapping.fieldId)
        ),
      },
    },
  };
}

export function projectSourcePublication(
  state: SqlCompilationState,
  entry: IndexedRelation,
  input: ModelSqlSourceInput
): IndexedRelation {
  const ordinals = sourcePublicationOrdinals(entry, input);
  if (
    ordinals.length === entry.fields.length &&
    ordinals.every((ordinal, position) => ordinal === position)
  )
    return entry;
  const binding = nextSourceRelation(state);
  return appendSourceRelation(state, {
    binding,
    inputs: [entry.binding.relationId],
    relation: create(RelSchema, {
      relType: {
        case: 'project',
        value: {
          common: {
            relAnchor: binding.relAnchor,
            emitKind: { case: 'emit', value: { outputMapping: ordinals } },
          },
          input: entry.relation,
        },
      },
    }),
    fields: sourceOutputFields(
      binding.relationId,
      input.columns.map((column) => column.name),
      ordinals.map((ordinal) => entry.fields[ordinal]!.fieldId)
    ),
  });
}
