/** Collect literal physical addresses, never resolve scalar bindings or admit rewrite rules. */
import type { PostgresAstNode } from '@dvt/postgres-projection';

import type { SqlPresentationRelation } from '../ports/postgresSqlPresentationEvidence.js';

export function collectPostgresSqlPresentationRelations(
  ast: PostgresAstNode
): readonly SqlPresentationRelation[] | null {
  const relations = new Map<string, SqlPresentationRelation>();
  const pending: { value: unknown; depth: number }[] = [{ value: ast, depth: 0 }];
  let nodes = 0;
  while (pending.length > 0) {
    const current = pending.pop()!;
    const value = current.value;
    if (value === null || typeof value !== 'object') continue;
    if (++nodes > 10000 || current.depth > 64) return null;
    const record = value as Record<string, unknown>;
    if (record.RangeVar !== undefined) {
      const range = record.RangeVar as Record<string, unknown> | null;
      if (
        range === null ||
        typeof range !== 'object' ||
        (range.catalogname !== undefined &&
          (typeof range.catalogname !== 'string' ||
            range.catalogname.length === 0 ||
            range.catalogname.length > 1024)) ||
        typeof range.schemaname !== 'string' ||
        range.schemaname.length === 0 ||
        range.schemaname.length > 1024 ||
        typeof range.relname !== 'string' ||
        range.relname.length === 0 ||
        range.relname.length > 1024
      )
        return null;
      const relation = {
        schema: range.schemaname,
        table: range.relname,
        ...(range.catalogname === undefined ? {} : { catalog: range.catalogname as string }),
      };
      relations.set(JSON.stringify(relation), relation);
      if (relations.size > 128) return null;
    }
    for (const child of Object.values(value))
      pending.push({ value: child, depth: current.depth + 1 });
  }
  return [...relations.values()];
}
