import type { DslV1Expression } from './ast.js';

const IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const NUMBER_LITERAL = /^[-+]?(?:\d+\.?\d*|\.\d+)$/;

/**
 * DSL v1 grammar:
 *   expr := IDENT '=' LITERAL
 *
 * No AND/OR, no function calls, no side effects.
 */
export function parseDslV1(expression: string): DslV1Expression {
  const trimmed = expression.trim();
  if (trimmed.length === 0) {
    throw new Error('Invalid DSL v1 expression: empty input');
  }

  if (/\b(?:AND|OR)\b/i.test(trimmed)) {
    throw new Error(
      `Invalid DSL v1 expression: logical operators are not supported: ${expression}`
    );
  }

  const eqIndex = trimmed.indexOf('=');
  if (eqIndex <= 0 || eqIndex >= trimmed.length - 1) {
    throw new Error(`Invalid DSL v1 expression (missing '='): ${expression}`);
  }

  if (trimmed.indexOf('=', eqIndex + 1) !== -1) {
    throw new Error(`Invalid DSL v1 expression (only one '=' is allowed): ${expression}`);
  }

  const left = trimmed.slice(0, eqIndex).trim();
  const rightRaw = trimmed.slice(eqIndex + 1).trim();

  if (!IDENTIFIER.test(left)) {
    throw new Error(`Invalid left identifier in DSL v1: '${left}'`);
  }

  const right = parseLiteral(rightRaw);
  return {
    dslVersion: '1.0',
    left,
    operator: '=',
    right,
  };
}

function parseLiteral(raw: string): string | number | boolean {
  if (raw === 'true') return true;
  if (raw === 'false') return false;

  if (raw.startsWith("'") && raw.endsWith("'") && raw.length >= 2) {
    return raw.slice(1, -1);
  }

  if (NUMBER_LITERAL.test(raw)) {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Invalid number literal in DSL v1: '${raw}'`);
    }
    return parsed;
  }

  throw new Error(`Invalid literal in DSL v1: '${raw}'`);
}
