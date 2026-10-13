/**
 * Owned concern: detect denied canonical inputs used by publication or retained computations.
 * @baseline ADR-0064: canonical protobuf expressions own dependencies.
 * @decision Share publication and original expression schema analysis across source and model guards.
 * @consequence Unselected passthrough fields remain removable; authored computations remain valid.
 * @version 1.0.0
 */
import type { Expression } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  deriveExpressionSchema,
  deriveSubstraitPublication,
  deriveSubstraitSchemas,
  type IndexedRelation,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';

function retainedExpressions(entry: IndexedRelation): readonly Expression[] {
  const variant = entry.relation.relType;
  if (variant.case === 'project') return variant.value.expressions;
  if (variant.case !== 'aggregate') return [];
  return variant.value.measures.flatMap(
    ({ measure }) =>
      measure?.arguments.flatMap((argument) =>
        argument.argType.case === 'value' ? [argument.argType.value] : []
      ) ?? []
  );
}

export function canonicalInputFieldsAreRequired(
  document: SubstraitDocument,
  denied: ReadonlySet<string>
): boolean {
  if (denied.size === 0) return false;
  const { index, schemas } = deriveSubstraitSchemas(document);
  const published = deriveSubstraitPublication(document, denied).get(index.rootId)!;
  if (published.rowUnavailable || published.unavailableFieldIds.length > 0) return true;
  return [...index.relations.values()].some((entry) => {
    const input = entry.inputs.flatMap((id) => schemas.get(id)!);
    return retainedExpressions(entry).some((expression) =>
      deriveExpressionSchema(expression, input).sourceFieldIds.some((id) => denied.has(id))
    );
  });
}
