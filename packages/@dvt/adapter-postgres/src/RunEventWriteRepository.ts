/**
 * @file packages/@dvt/adapter-postgres/src/RunEventWriteRepository.ts
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0034: Bounded Context Boundaries and Communication Rules
 * @decision Define a local write/read repository port for run events
 * @consequence Adapter orchestration depends on a port, not a concrete Postgres class
 * @version 1.0.0
 * @date 2026-03-26
 */
import type { PoolClient } from 'pg';

import type { EventEnvelope, EventInput, ListEventsOptions, RunId } from './types.js';

export interface AppendWithClientResult {
  appended: EventEnvelope[];
  deduped: EventEnvelope[];
  lastAppendedRunSeq: number | null;
  baseRunSeq: number;
}

export interface RunEventWriteRepository {
  appendWithClient(
    client: PoolClient,
    runId: RunId,
    envelopes: EventInput[]
  ): Promise<AppendWithClientResult>;

  listEvents(
    tenantId: string,
    runId: string,
    options?: ListEventsOptions
  ): Promise<EventEnvelope[]>;
}
