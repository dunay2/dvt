/** Rebase a consumer's local ordinals while preserving its explicit output contract. */
import { create } from '@bufbuild/protobuf';
import {
  RelCommonSchema,
  JoinRel_JoinType,
  type Rel,
  type Expression_FieldReference,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  cloneLocalRelation,
  readRelationStructure,
  SubstraitAnalysisError,
} from '@dvt/substrait-analysis';
import type { DvtSubstraitFieldBindingV1 } from '@dvt/contracts';

type Fields = readonly DvtSubstraitFieldBindingV1[];
const top = (fields: Fields) =>
  fields
    .filter((field) => field.parentFieldId == null)
    .sort((a, b) => a.outputOrdinal - b.outputOrdinal);

function requireOrdinal(value: number | undefined): number {
  if (value == null)
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'A consumer still uses a field removed from its input.'
    );
  return value;
}

export function inputIdentityMap(before: Fields, after: Fields): ReadonlyMap<string, string> {
  const direct = new Map(after.map((field) => [field.fieldId, field.fieldId]));
  for (const field of before) {
    if (direct.has(field.fieldId)) continue;
    if (field.sourceFieldId != null && direct.has(field.sourceFieldId)) {
      direct.set(field.fieldId, field.sourceFieldId);
      continue;
    }
    const candidates = after.filter((next) => next.sourceFieldId === field.fieldId);
    const passthrough = candidates.filter(
      (next) => next.outputOrdinal === field.outputOrdinal && next.displayName === field.displayName
    );
    const candidate = passthrough.length === 1 ? passthrough[0] : candidates[0];
    if (candidate != null && (candidates.length === 1 || passthrough.length === 1))
      direct.set(field.fieldId, candidate.fieldId);
  }
  return new Map(
    before.flatMap((field) => {
      const replacement = direct.get(field.fieldId);
      return replacement == null ? [] : [[field.fieldId, replacement] as const];
    })
  );
}

function remapReferences(relation: Rel, ordinals: readonly (number | undefined)[]): void {
  const inputs = new Set(readRelationStructure(relation).inputs);
  const pending: unknown[] = [relation.relType.value];
  while (pending.length > 0) {
    const value = pending.pop();
    if (value == null || typeof value !== 'object' || inputs.has(value as Rel)) continue;
    if ('$typeName' in value && value.$typeName === 'substrait.Expression.FieldReference') {
      const ref = value as Expression_FieldReference;
      if (ref.rootType.case !== 'rootReference' || ref.referenceType.case !== 'directReference')
        throw new SubstraitAnalysisError(
          'unsupported_relation',
          'Input rebinding requires local field references.'
        );
      const segment = ref.referenceType.value.referenceType;
      if (segment.case !== 'structField')
        throw new SubstraitAnalysisError('invalid_binding', 'Expected a struct field.');
      segment.value.field = requireOrdinal(ordinals[segment.value.field]);
    } else pending.push(...Object.values(value));
  }
}

function outputSlots(relation: Rel, widths: readonly number[]): number[] {
  const all = Array.from({ length: widths.reduce((sum, width) => sum + width, 0) }, (_, i) => i);
  const variant = relation.relType;
  if (variant.case === 'join') {
    const sides: Partial<Record<JoinRel_JoinType, readonly boolean[]>> = {
      [JoinRel_JoinType.LEFT_SEMI]: [true, false],
      [JoinRel_JoinType.LEFT_ANTI]: [true, false],
      [JoinRel_JoinType.RIGHT_SEMI]: [false, true],
      [JoinRel_JoinType.RIGHT_ANTI]: [false, true],
    };
    const kept = sides[variant.value.type] ?? [true, true];
    return all.filter((ordinal) => kept[ordinal < widths[0]! ? 0 : 1]);
  }
  return all;
}

export function rebaseRelationInput(
  relation: Rel,
  inputs: readonly Rel[],
  before: readonly Fields[],
  after: readonly Fields[],
  retainedOutputs?: number[]
): Rel {
  const copy = cloneLocalRelation(relation, inputs);
  const oldWidths = before.map((fields) => top(fields).length);
  const newWidths = after.map((fields) => top(fields).length);
  let offset = 0;
  const ordinals = before.flatMap((fields, port) => {
    const next = top(after[port]!);
    const ids = inputIdentityMap(fields, after[port]!);
    const mapped = top(fields).map((field) => {
      const ordinal = next.find(
        (candidate) => candidate.fieldId === ids.get(field.fieldId)
      )?.outputOrdinal;
      return ordinal == null ? undefined : offset + ordinal;
    });
    offset += next.length;
    return mapped;
  });
  remapReferences(copy, ordinals);
  const variant = copy.relType;
  if (variant.case === 'aggregate' || variant.case === 'set') return copy;
  const previous = outputSlots(relation, oldWidths);
  const next = outputSlots(copy, newWidths);
  const output = previous.map((ordinal) => {
    const mapped = ordinals[ordinal];
    const position = mapped == null ? -1 : next.indexOf(mapped);
    return position < 0 ? undefined : position;
  });
  if (variant.case === 'project')
    output.push(...variant.value.expressions.map((_, ordinal) => next.length + ordinal));
  const common = readRelationStructure(copy).common ?? create(RelCommonSchema);
  const selected =
    common.emitKind.case === 'emit'
      ? common.emitKind.value.outputMapping
      : output.map((_, ordinal) => ordinal);
  const mapping = selected.flatMap((ordinal, position) => {
    const mapped = output[ordinal];
    if (retainedOutputs != null && mapped == null) return [];
    retainedOutputs?.push(position);
    return [requireOrdinal(mapped)];
  });
  common.emitKind = {
    case: 'emit',
    value: { $typeName: 'substrait.RelCommon.Emit', outputMapping: mapping },
  };
  if (variant.value != null && 'common' in variant.value) variant.value.common = common;
  return copy;
}
