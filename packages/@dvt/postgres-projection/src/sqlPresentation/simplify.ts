/**
 * Owned concern: execute the admitted PostgreSQL presentation rules once or to a true fixed point.
 * @baseline ADR-0064: neither derived syntax nor its trace changes canonical semantic authority.
 * @decision Share one admission, rule priority and bounded deterministic scheduler.
 * @consequence Unsupported complete candidates remain intact; budget exhaustion fails explicitly.
 * @version 1.0.0
 */
import type { PostgresAstNode } from '../postgresAst.js';

import {
  admitSqlAst,
  compileSqlResolution,
  SqlAdmissionError,
  sqlPath,
  type SqlDiagnostic,
  type SqlResolution,
  type SqlResolutionInput,
  type SqlSelect,
} from './admission.js';
import { rewriteAdmittedSql, type SqlRule } from './rules.js';

export type PostgresSqlSimplificationOptions = SqlResolutionInput & Readonly<{ maxSteps?: number }>;
export type PostgresSqlSimplificationStep = Readonly<{ rule: SqlRule; path: string }>;
export type PostgresSqlSimplificationResult = Readonly<{
  ast: PostgresAstNode;
  steps: readonly PostgresSqlSimplificationStep[];
  retained?: SqlDiagnostic;
}>;

function maxSteps(options?: PostgresSqlSimplificationOptions): number {
  const value = options?.maxSteps ?? 256;
  if (!Number.isSafeInteger(value) || value < 1 || value > 10000) {
    throw new RangeError('maxSteps must be a positive safe integer no greater than 10000.');
  }
  return value;
}

function prepare(
  ast: PostgresAstNode,
  options?: PostgresSqlSimplificationOptions
): Readonly<{ resolution: SqlResolution; selects: readonly SqlSelect[] }> | SqlDiagnostic {
  try {
    const resolution = compileSqlResolution(options);
    return { resolution, selects: admitSqlAst(ast, resolution) };
  } catch (error) {
    if (error instanceof SqlAdmissionError) return error.diagnostic;
    throw error;
  }
}

/** Admit the complete candidate, then return at most one immutable syntax rewrite. */
export function rewritePostgresSqlOnce(
  ast: PostgresAstNode,
  options?: PostgresSqlSimplificationOptions
): PostgresSqlSimplificationResult {
  maxSteps(options);
  const admitted = prepare(ast, options);
  if ('code' in admitted) return { ast, steps: [], retained: admitted };
  const next = rewriteAdmittedSql(admitted.selects);
  return next === undefined
    ? { ast, steps: [] }
    : { ast: next.ast, steps: [{ rule: next.rule, path: sqlPath(next.path) }] };
}

/** Compile source evidence once and rebind each changed candidate once, not once per rule. */
export function simplifyPostgresSqlAst(
  ast: PostgresAstNode,
  options?: PostgresSqlSimplificationOptions
): PostgresSqlSimplificationResult {
  const limit = maxSteps(options);
  const admitted = prepare(ast, options);
  if ('code' in admitted) return { ast, steps: [], retained: admitted };
  const steps: PostgresSqlSimplificationStep[] = [];
  let current = ast;
  let selects = admitted.selects;
  for (;;) {
    const next = rewriteAdmittedSql(selects);
    if (next === undefined) return { ast: current, steps };
    if (steps.length === limit)
      throw new RangeError('SQL simplification exceeded maxSteps before reaching a fixed point.');
    current = next.ast;
    steps.push({ rule: next.rule, path: sqlPath(next.path) });
    try {
      selects = admitSqlAst(current, admitted.resolution);
    } catch (error) {
      throw new Error('SQL presentation rule violated its admitted syntax invariant.', {
        cause: error,
      });
    }
  }
}
