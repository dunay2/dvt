/** Owns the admitted FilterRel projection into the bounded PostgreSQL AST. */
import { inspectDvtSubstraitFilter, removeDvtSubstraitFilter } from './canvasDvtSubstraitFilter';
import {
  pgColumnRef,
  pgComparison,
  pgStringLiteral,
  type PostgresComparisonOperator,
  type PostgresAstNode,
} from './canvasDvtSubstraitPostgresAst';
import type { DvtSubstraitTextComparisonOperator } from './canvasDvtSubstraitTextComparison';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';

const POSTGRES_OPERATOR: Readonly<
  Record<DvtSubstraitTextComparisonOperator, PostgresComparisonOperator>
> = {
  equal: '=',
  not_equal: '<>',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
};

export function resolveDvtSubstraitFilterPostgresProjection(
  draft: DvtSubstraitProjectionDraft
): Readonly<{ baseDraft: DvtSubstraitProjectionDraft; whereClause?: PostgresAstNode }> {
  const filter = inspectDvtSubstraitFilter(draft);
  return filter == null
    ? { baseDraft: draft }
    : {
        baseDraft: removeDvtSubstraitFilter(draft),
        whereClause: pgComparison(
          POSTGRES_OPERATOR[filter.operator],
          pgColumnRef(filter.fieldName),
          pgStringLiteral(filter.value)
        ),
      };
}
