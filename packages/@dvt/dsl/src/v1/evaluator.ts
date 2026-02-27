import type { DslV1Expression } from './ast.js';

/**
 * Pure deterministic evaluator for DSL v1.
 */
export function evaluateDslV1(
  expr: DslV1Expression,
  ctx: Readonly<Record<string, unknown>>
): boolean {
  const leftVal = ctx[expr.left];

  if (typeof expr.right === 'string') {
    return typeof leftVal === 'string' && leftVal === expr.right;
  }

  if (typeof expr.right === 'number') {
    return typeof leftVal === 'number' && leftVal === expr.right;
  }

  if (typeof expr.right === 'boolean') {
    return typeof leftVal === 'boolean' && leftVal === expr.right;
  }

  const _never: never = expr.right;
  return _never;
}
