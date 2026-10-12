/** Disposable publication validity; authored messages and field identities are never rewritten. */
import {
  SetRel_SetOp,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import type { SubstraitDocument } from './document.js';
import type { IndexedRelation } from './relationIndex.js';
import { deriveSubstraitSchemas } from './relationSchema.js';
import { deriveExpressionSchema } from './schemaExpression.js';
import { bindSchemaFields } from './schemaHierarchy.js';

export type RelationPublication = Readonly<{
  unavailableFieldIds: readonly string[];
  rowUnavailable: boolean;
}>;

function rowExpressions(entry: IndexedRelation): readonly Expression[] {
  const rel = entry.relation.relType;
  switch (rel.case) {
    case 'read':
      return [rel.value.filter, rel.value.bestEffortFilter].filter((value) => value != null);
    case 'filter':
      return rel.value.condition == null ? [] : [rel.value.condition];
    case 'join':
      return [rel.value.expression, rel.value.postJoinFilter].filter((value) => value != null);
    case 'sort':
      return rel.value.sorts.flatMap((sort) => (sort.expr == null ? [] : [sort.expr]));
    case 'fetch':
      return [rel.value.countExpr, rel.value.offsetExpr].filter((value) => value != null);
    case 'aggregate':
      return [
        ...rel.value.groupingExpressions,
        ...rel.value.measures.flatMap((measure) =>
          measure.filter == null ? [] : [measure.filter]
        ),
      ];
    default:
      return [];
  }
}

export function deriveSubstraitPublication(
  document: SubstraitDocument,
  unavailableReadFieldIds: ReadonlySet<string>
): ReadonlyMap<string, RelationPublication> {
  const { index, schemas } = deriveSubstraitSchemas(document);
  const publication = new Map<string, RelationPublication>();
  for (const id of index.postorder) {
    const entry = index.relations.get(id)!;
    const input = entry.inputs.flatMap((inputId) => schemas.get(inputId)!);
    const missing = (ids: readonly string[]): boolean =>
      ids.some((fieldId) => unavailableReadFieldIds.has(fieldId));
    const rowUnavailable =
      entry.inputs.some((inputId) => publication.get(inputId)!.rowUnavailable) ||
      (entry.relation.relType.case === 'set' &&
        entry.relation.relType.value.op !== SetRel_SetOp.UNION_ALL &&
        entry.inputs.some((inputId) => publication.get(inputId)!.unavailableFieldIds.length > 0)) ||
      rowExpressions(entry).some((expression) =>
        missing(
          deriveExpressionSchema(
            expression,
            entry.relation.relType.case === 'read' ? schemas.get(id)! : input
          ).sourceFieldIds
        )
      );
    const fields = bindSchemaFields(schemas.get(id)!, entry.fields);
    publication.set(id, {
      rowUnavailable,
      unavailableFieldIds: entry.fields
        .filter((field) => rowUnavailable || missing(fields.get(field.fieldId)!.sourceFieldIds))
        .map((field) => field.fieldId),
    });
  }
  return publication;
}
