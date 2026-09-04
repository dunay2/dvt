/** Owns the admitted FilterRel projection into the bounded PostgreSQL AST. */
import { inspectDvtSubstraitFilter, removeDvtSubstraitFilter } from './canvasDvtSubstraitFilter';
import {
  pgColumnRef,
  pgEquals,
  pgStringLiteral,
  type PostgresAstNode,
} from './canvasDvtSubstraitPostgresAst';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';

export function resolveDvtSubstraitFilterPostgresProjection(
  draft: DvtSubstraitProjectionDraft
): Readonly<{ baseDraft: DvtSubstraitProjectionDraft; whereClause?: PostgresAstNode }> {
  const filter = inspectDvtSubstraitFilter(draft);
  return filter == null
    ? { baseDraft: draft }
    : {
        baseDraft: removeDvtSubstraitFilter(draft),
        whereClause: pgEquals(pgColumnRef(filter.fieldName), pgStringLiteral(filter.value)),
      };
}
