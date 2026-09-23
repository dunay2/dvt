/** Port-sensitive JOIN semantics and ordinal SET alignment, independent of tree shape. */
import {
  JoinRel_JoinType,
  SetRel_SetOp,
  type JoinRel,
  type SetRel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { TypeSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { equals } from '@bufbuild/protobuf';

import {
  invalidSchema,
  isSchemaTypeNullable,
  withSchemaNullability,
  type SchemaField,
} from './schemaTypes.js';

const joinSides: Partial<Record<JoinRel_JoinType, readonly [boolean | null, boolean | null]>> = {
  [JoinRel_JoinType.INNER]: [false, false],
  [JoinRel_JoinType.LEFT]: [false, true],
  [JoinRel_JoinType.RIGHT]: [true, false],
  [JoinRel_JoinType.OUTER]: [true, true],
  [JoinRel_JoinType.LEFT_SEMI]: [false, null],
  [JoinRel_JoinType.LEFT_ANTI]: [false, null],
  [JoinRel_JoinType.RIGHT_SEMI]: [null, false],
  [JoinRel_JoinType.RIGHT_ANTI]: [null, false],
};

export function deriveJoinSchema(
  join: JoinRel,
  inputs: readonly (readonly SchemaField[])[]
): readonly SchemaField[] {
  const sides = joinSides[join.type];
  if (sides == null) return invalidSchema('JOIN type is outside the supported schema profile.');
  return sides.flatMap((extend, side) =>
    extend === null
      ? []
      : inputs[side]!.map((field) => (extend ? withSchemaNullability(field, true) : field))
  );
}

const setNullability: Partial<Record<SetRel_SetOp, (nullable: readonly boolean[]) => boolean>> = {
  [SetRel_SetOp.UNION_ALL]: (values) => values.some(Boolean),
  [SetRel_SetOp.UNION_DISTINCT]: (values) => values.some(Boolean),
  [SetRel_SetOp.INTERSECTION_MULTISET]: (values) => values.every(Boolean),
  [SetRel_SetOp.INTERSECTION_MULTISET_ALL]: (values) => values.every(Boolean),
  [SetRel_SetOp.MINUS_PRIMARY]: (values) => values[0]!,
  [SetRel_SetOp.MINUS_PRIMARY_ALL]: (values) => values[0]!,
};

export function deriveSetSchema(
  set: SetRel,
  inputs: readonly (readonly SchemaField[])[]
): readonly SchemaField[] {
  const nullable = setNullability[set.op];
  const first = inputs[0];
  if (
    nullable == null ||
    first == null ||
    inputs.length < 2 ||
    inputs.some((input) => input.length !== first.length)
  ) {
    return invalidSchema('SET requires a supported operation and equally sized inputs.');
  }
  return first.map((field, ordinal) => {
    const fields = inputs.map((input) => input[ordinal]!);
    const normalized = withSchemaNullability(field, false).type;
    if (
      fields.some(
        (candidate) =>
          candidate.type.kind.case === 'unbound' ||
          !equals(TypeSchema, normalized, withSchemaNullability(candidate, false).type)
      )
    ) {
      return invalidSchema('SET input types differ at the same ordinal.');
    }
    return {
      ...withSchemaNullability(
        field,
        nullable(fields.map((candidate) => isSchemaTypeNullable(candidate.type)))
      ),
      sourceFieldIds: [...new Set(fields.flatMap((candidate) => candidate.sourceFieldIds))],
    };
  });
}
