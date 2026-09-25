/** Retiring a composition preserves the authored output contract of its surviving operand. */
import { create } from '@bufbuild/protobuf';
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { RelationChangeSet } from '@dvt/substrait-analysis';
import { retainCompositionOutputs } from './canvasCompositionOutputs';

type Entry = RelationChangeSet['upserts'][number];

export function retainedOperandProjection(target: Entry, input: Entry, port: number): Entry {
  const inputFields = new Map(input.fields.map((field) => [field.fieldId, field]));
  const origin = (field: Entry['fields'][number]) =>
    field.sourceFieldId ?? field.operandFieldIds?.[port];
  const selected = target.fields
    .filter((field) => field.parentFieldId == null && inputFields.has(origin(field) ?? ''))
    .sort((a, b) => a.outputOrdinal - b.outputOrdinal);
  const fields = retainCompositionOutputs(
    target.fields,
    selected.map((field) => field.outputOrdinal)
  ).map(({ operandFieldIds: _operands, sourceFieldId: _source, ...field }) => ({
    ...field,
    sourceFieldId: origin(target.fields.find((prior) => prior.fieldId === field.fieldId)!)!,
  }));
  return {
    binding: { ...target.binding, displayName: 'project' },
    fields,
    relation: create(RelSchema, {
      relType: {
        case: 'project',
        value: {
          common: {
            relAnchor: target.binding.relAnchor,
            emitKind: {
              case: 'emit',
              value: {
                outputMapping: selected.map(
                  (field) => inputFields.get(origin(field)!)!.outputOrdinal
                ),
              },
            },
          },
          input: input.relation,
        },
      },
    }),
  };
}
