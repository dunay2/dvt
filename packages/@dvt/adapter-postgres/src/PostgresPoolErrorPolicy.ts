/**
 * @file packages/@dvt/adapter-postgres/src/PostgresPoolErrorPolicy.ts
 * @baseline ADR-0003: Execution Model
 * @decision Every production PostgreSQL pool observes idle-client failures without terminating its host process
 * @consequence Runtime supervisors can recover database connectivity while failures remain visible to operators
 * @version 1.0.0
 * @date 2026-08-03
 */
import { Pool, type PoolConfig } from 'pg';

export interface PostgresPoolFailure {
  readonly code?: string;
  readonly message: string;
}

export type PostgresPoolFailureReporter = (failure: PostgresPoolFailure) => void;

export function createObservedPostgresPool(
  config: PoolConfig,
  reportFailure: PostgresPoolFailureReporter = reportPostgresPoolFailure
): Pool {
  const pool = new Pool(config);
  pool.on('error', (error) => {
    const code = readPostgresErrorCode(error);
    reportFailure({
      ...(code ? { code } : {}),
      message: error.message,
    });
  });
  return pool;
}

function readPostgresErrorCode(error: Error): string | undefined {
  if (!('code' in error)) return undefined;
  const code = error.code;
  return typeof code === 'string' && code.length > 0 ? code : undefined;
}

function reportPostgresPoolFailure(failure: PostgresPoolFailure): void {
  const code = failure.code ? ` code=${failure.code}` : '';
  console.error(`[postgres.pool] idle client error${code} message=${failure.message}`);
}
