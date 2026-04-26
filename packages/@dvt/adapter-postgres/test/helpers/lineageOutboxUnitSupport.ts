import { PostgresLineageOutboxStore } from '../../src/PostgresLineageOutboxStore.js';
import type { EventEnvelope } from '../../src/types.js';

export interface RecordedQuery {
  sql: string;
  params?: readonly unknown[];
}

export class RecordingClient {
  readonly queries: RecordedQuery[] = [];
  private readonly rowsByQuery: unknown[][] = [];

  enqueueRows(rows: unknown[]): void {
    this.rowsByQuery.push(rows);
  }

  async query<T = unknown>(
    sql: string,
    params?: readonly unknown[]
  ): Promise<{ rows: T[]; rowCount?: number | null }> {
    if (sql.includes("set_config('dvt.")) {
      return { rows: [] };
    }
    this.queries.push({ sql, params });
    const rows = this.rowsByQuery.shift() ?? [];
    return { rows: rows as T[] };
  }
}

export const NOW = '2026-03-28T00:00:00.000Z';

export function createRecordingLineageOutboxStore(
  client: RecordingClient,
  options?: { claimTimeoutMs?: number }
): PostgresLineageOutboxStore {
  return new PostgresLineageOutboxStore(
    'dvt',
    () => NOW,
    options?.claimTimeoutMs ?? 60_000,
    withRecordingClient(client) as never,
    withRecordingClient(client) as never
  );
}

export function makePayload(eventId: string): EventEnvelope {
  return {
    eventId,
    eventType: 'StepStarted',
    runId: 'run-1',
    emittedAt: NOW,
    tenantId: 'tenant-a',
    projectId: 'project-a',
    environmentId: 'dev',
    planId: 'plan-a',
    planVersion: '1.0.0',
    engineAttemptId: 1,
    logicalAttemptId: 1,
    stepId: 'step-a',
    idempotencyKey: `ik-${eventId}`,
    payloadVersion: 1,
    payload: { compiledCodeRef: { storageUri: 's3://bucket/a.sql', sha256: 'x'.repeat(64) } },
    runSeq: 1,
    persistedAt: NOW,
  };
}

function withRecordingClient(client: RecordingClient) {
  return async <T>(fn: (pgClient: RecordingClient) => Promise<T>): Promise<T> => fn(client);
}
