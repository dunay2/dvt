/** Bound traversal and compare SQL syntax independently of parser byte positions. */
import { jcsCanonicalize } from '@dvt/crypto';

import { CanvasModelSqlUnavailableError } from '../ports/canvasModelSql.js';

export type WorksheetAstObject = Record<string, unknown>;
export const worksheetAstObject = (value: unknown): WorksheetAstObject | undefined =>
  value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as WorksheetAstObject)
    : undefined;

export function mapWorksheetAst(
  value: unknown,
  replace: (node: WorksheetAstObject) => WorksheetAstObject | undefined,
  depth = 0
): unknown {
  if (depth > 128) throw new CanvasModelSqlUnavailableError('unsupported_sql');
  if (Array.isArray(value)) return value.map((child) => mapWorksheetAst(child, replace, depth + 1));
  const node = worksheetAstObject(value);
  if (node == null) return value;
  const replacement = replace(node);
  if (replacement != null) return replacement;
  return Object.fromEntries(
    Object.entries(node).map(([key, child]) => [key, mapWorksheetAst(child, replace, depth + 1)])
  );
}

export function worksheetSyntaxIdentity(value: unknown): string {
  return jcsCanonicalize(
    mapWorksheetAst(value, (node) => {
      const isPosition = (key: string) => ['location', 'stmt_location', 'stmt_len'].includes(key);
      if (!Object.keys(node).some(isPosition)) return;
      return Object.fromEntries(
        Object.entries(node)
          .filter(([key]) => !isPosition(key))
          .map(([key, child]) => [key, JSON.parse(worksheetSyntaxIdentity(child)) as unknown])
      );
    })
  );
}
