/**
 * Owned concern: inspect and rebind existing protobuf field references without expanding definitions.
 * @baseline ADR-0064: field ordinals describe an input scope, not stable authoring identity.
 * @decision Resolve each local ordinal through its current identity map.
 * @consequence Moving a definition between canonical stages preserves its dependencies.
 * @version 1.0.0
 */
import { clone } from '@bufbuild/protobuf';
import {
  ExpressionSchema,
  type Expression,
  type Expression_FieldReference,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  TransformDependencyError,
  TRANSFORM_DEPENDENCY_REJECTION,
} from './TransformDependencyError';

function references(expression: Expression): readonly Expression_FieldReference[] {
  const result: Expression_FieldReference[] = [];
  const pending: unknown[] = [expression];
  while (pending.length > 0) {
    const value = pending.pop();
    if (value == null || typeof value !== 'object') continue;
    if ('$typeName' in value && value.$typeName === 'substrait.Expression.FieldReference')
      result.push(value as Expression_FieldReference);
    else pending.push(...Object.values(value));
  }
  return result;
}

function fieldSegment(reference: Expression_FieldReference) {
  const segment =
    reference.referenceType.case === 'directReference'
      ? reference.referenceType.value.referenceType
      : undefined;
  if (reference.rootType.case !== 'rootReference' || segment?.case !== 'structField')
    throw new TransformDependencyError(TRANSFORM_DEPENDENCY_REJECTION.unavailable);
  return segment.value;
}

export function transformExpressionDependencies(
  expression: Expression,
  inputIds: readonly string[]
): readonly string[] {
  return [
    ...new Set(
      references(expression).map((reference) => {
        const id = inputIds[fieldSegment(reference).field];
        if (id == null)
          throw new TransformDependencyError(TRANSFORM_DEPENDENCY_REJECTION.unavailable);
        return id;
      })
    ),
  ];
}

export function rebindTransformExpression(
  expression: Expression,
  inputIds: readonly string[],
  nextIds: readonly string[]
): Expression {
  const result = clone(ExpressionSchema, expression);
  const ordinals = new Map(nextIds.map((id, ordinal) => [id, ordinal]));
  for (const reference of references(result)) {
    const segment = fieldSegment(reference);
    const next = ordinals.get(inputIds[segment.field]!);
    if (next == null)
      throw new TransformDependencyError(TRANSFORM_DEPENDENCY_REJECTION.unavailable);
    segment.field = next;
  }
  return result;
}
