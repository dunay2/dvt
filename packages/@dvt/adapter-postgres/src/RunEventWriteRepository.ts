/**
 * @file packages/@dvt/adapter-postgres/src/RunEventWriteRepository.ts
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0034: Bounded Context Boundaries and Communication Rules
 * @decision Define local write/read repository ports for run events
 * @consequence Adapter orchestration depends on ports, not concrete Postgres classes
 * @version 1.0.0
 * @date 2026-03-26
 */
import type { PoolClient } from 'pg';

import type { EventEnvelope, EventInput, ListEventsOptions, RunId } from './types.js';

export interface SqlCommandExecutor {
  query<T = unknown>(
    text: string,
    params?: readonly unknown[]
  ): Promise<{ rows: T[]; rowCount?: number | null }>;
}

export interface RunEventAppendResult {
  appended: EventEnvelope[];
  deduped: EventEnvelope[];
  lastAppendedRunSeq: number | null;
  baseRunSeq: number;
}

export interface RunEventRepositoryDeps {
  schema: string;
  now: () => string;
  withClient: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>;
}

export interface RunEventWriteRepository {
  append(
    executor: SqlCommandExecutor,
    tenantId: string,
    runId: RunId,
    envelopes: EventInput[]
  ): Promise<RunEventAppendResult>;
}

export interface RunEventReadRepository {
  listEvents(
    tenantId: string,
    runId: string,
    options?: ListEventsOptions
  ): Promise<EventEnvelope[]>;
}
