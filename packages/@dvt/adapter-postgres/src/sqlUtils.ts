/**
 * @file packages/@dvt/adapter-postgres/src/sqlUtils.ts
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Section 2.3 — PostgreSQL is the canonical transactional store and requires safe schema/identifier handling
 * @consequence SQL identifier and schema normalization reduces invalid writes and preserves deterministic adapter behavior
 * @version 1.0.0
 * @date 2026-02-21
 */
export function normalizeSchema(schema: string): string {
  if (!/^[a-zA-Z_]\w*$/.test(schema)) {
    throw new Error(`Invalid PostgreSQL schema: ${schema}`);
  }
  return schema;
}

export function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}`;
}
