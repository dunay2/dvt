/**
 * @file packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Run snapshot persistence extracted from PostgresStateStoreAdapter
 * @consequence Single-responsibility class for run_snapshots table operations
 * @version 1.0.0
 * @date 2026-03-15
 */
import type { PoolClient } from 'pg';
import { quoteIdentifier } from './sqlUtils.js';
import type {
  EventEnvelope,
  RunId,
  WorkflowSnapshot,
} from './types.js';

// ---------------------------------------------------------------------------
// Row shapes (internal)
// ---------------------------------------------------------------------------

interface SnapshotRow {
  snapshot: WorkflowSnapshot;
}

interface EventPayloadRow {
  payload: EventEnvelope;
}

interface MaxSeqRow {
  max_seq: number | string;
}

// ---------------------------------------------------------------------------
// PostgresRunSnapshotStore
// ---------------------------------------------------------------------------

export class PostgresRunSnapshotStore {
  constructor(
    private readonly schema: string,
    private readonly now: () => string,
    private readonly withTransaction: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>,
    private readonly withClient: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>
  ) {}

  async getSnapshot(tenantId: string, runId: RunId): Promise<WorkflowSnapshot | null> {
    const result = await this.withClient((client) =>
      client.query<SnapshotRow>(
        `
          SELECT s.snapshot
          FROM ${quoteIdentifier(this.schema)}.run_snapshots s
          INNER JOIN ${quoteIdentifier(this.schema)}.run_metadata m ON m.run_id = s.run_id
          WHERE m.tenant_id = $1 AND s.run_id = $2
        `,
        [tenantId, runId]
      )
    );
    return result.rows[0]?.snapshot ?? null;
  }

  /**
   * ADR-0004 §2.2 — Full event replay from runSeq=1, overwrites the materialized snapshot.
   * ADR-0031 — Tenant isolation verified before replay; throws RUN_NOT_FOUND on mismatch.
   */
  async rebuildSnapshot(tenantId: string, runId: RunId): Promise<WorkflowSnapshot> {
    return this.withTransaction(async (client) => {
      // ADR-0031: verify tenant ownership before any read or write.
      const metaResult = await client.query<{ run_id: string }>(
        `
          SELECT run_id
          FROM ${quoteIdentifier(this.schema)}.run_metadata
          WHERE tenant_id = $1 AND run_id = $2
          LIMIT 1
        `,
        [tenantId, runId]
      );
      if (!metaResult.rows[0]) {
        throw new Error(`RUN_NOT_FOUND: ${runId}`);
      }

      // Acquire per-run advisory lock to prevent concurrent snapshot mutations.
      await this.acquireRunLock(client, runId);

      // ADR-0004 §2.2: replay MUST use runSeq ASC.
      const eventsResult = await client.query<EventPayloadRow>(
        `
          SELECT payload
          FROM ${quoteIdentifier(this.schema)}.run_events
          WHERE run_id = $1
          ORDER BY run_seq ASC
        `,
        [runId]
      );

      const snap: WorkflowSnapshot = {
        runId,
        status: 'PENDING',
        paused: false,
        cancelling: false,
        gatewayDecisions: {},
        steps: {},
      };
      for (const row of eventsResult.rows) {
        applySnapshotEvent(snap, row.payload);
      }

      const seqResult = await client.query<MaxSeqRow>(
        `SELECT COALESCE(MAX(run_seq), 0) AS max_seq FROM ${quoteIdentifier(this.schema)}.run_events WHERE run_id = $1`,
        [runId]
      );
      const lastSeq = Number(seqResult.rows[0]?.max_seq ?? 0);

      // Pass lastSeq directly; 0 is valid when the run has no events (degenerate case).
      // persistWithClient only rejects null, not 0.
      await this.persistWithClient(client, runId, snap, lastSeq);
      return snap;
    });
  }

  async updateWithClient(
    client: PoolClient,
    runId: RunId,
    appended: EventEnvelope[],
    baseRunSeq: number,
    lastAppendedRunSeq: number | null
  ): Promise<void> {
    if (appended.length === 0) {
      return;
    }

    const snap = await this.getOrCreateSnapshotWithClient(client, runId, baseRunSeq);
    for (const e of appended) {
      applySnapshotEvent(snap, e);
    }
    await this.persistWithClient(client, runId, snap, lastAppendedRunSeq);
  }

  async persistWithClient(
    client: PoolClient,
    runId: RunId,
    snap: WorkflowSnapshot,
    lastSeq: number | null
  ): Promise<void> {
    if (lastSeq === null) {
      throw new Error('lastAppendedRunSeq is required when persisting a non-empty snapshot update');
    }
    await client.query(
      `
        INSERT INTO ${quoteIdentifier(this.schema)}.run_snapshots (run_id, snapshot, last_run_seq, updated_at)
        VALUES ($1, $2::jsonb, $3, $4::timestamptz)
        ON CONFLICT (run_id) DO UPDATE SET
          snapshot = EXCLUDED.snapshot,
          last_run_seq = EXCLUDED.last_run_seq,
          updated_at = EXCLUDED.updated_at
      `,
      [runId, JSON.stringify(snap), lastSeq, this.now()]
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async acquireRunLock(client: PoolClient, runId: RunId): Promise<void> {
    // Use 64-bit MD5-derived lock key to avoid hashtext()'s 32-bit collision space.
    // Birthday bound is now ~2^32 rather than ~2^16 concurrent distinct runIds.
    await client.query(
      `SELECT pg_advisory_xact_lock(('x' || left(md5($1), 16))::bit(64)::bigint)`,
      [runId]
    );
  }

  private async getOrCreateSnapshotWithClient(
    client: PoolClient,
    runId: RunId,
    baseRunSeq: number
  ): Promise<WorkflowSnapshot> {
    if (baseRunSeq > 0) {
      const currentSnap = await client.query<SnapshotRow>(
        `SELECT snapshot FROM ${quoteIdentifier(this.schema)}.run_snapshots WHERE run_id = $1`,
        [runId]
      );
      if (currentSnap.rows[0]?.snapshot) {
        return currentSnap.rows[0].snapshot;
      }
    }

    return {
      runId,
      status: 'PENDING',
      paused: false,
      cancelling: false,
      gatewayDecisions: {},
      steps: {},
    };
  }
}

function applySnapshotEvent(snap: WorkflowSnapshot, event: EventEnvelope): void {
  switch (event.eventType) {
    case 'RunQueued':
      return;
    case 'RunStarted':
      snap.status = 'RUNNING';
      snap.startedAt = snap.startedAt ?? event.emittedAt;
      return;
    case 'RunPaused':
      snap.status = 'PAUSED';
      snap.paused = true;
      return;
    case 'RunResumed':
      snap.status = 'RUNNING';
      snap.paused = false;
      return;
    case 'RunCancelRequested':
      snap.cancelling = true;
      return;
    case 'RunCancelled':
      snap.status = 'CANCELLED';
      snap.cancelling = false;
      snap.completedAt = event.emittedAt;
      return;
    case 'RunCompleted':
      snap.status = 'COMPLETED';
      snap.completedAt = event.emittedAt;
      return;
    case 'RunFailed':
      snap.status = 'FAILED';
      snap.completedAt = event.emittedAt;
      return;
    case 'StepStarted': {
      const stepId = (event as EventEnvelope & { stepId: string }).stepId;
      const step = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
      step.status = 'RUNNING';
      step.startedAt = step.startedAt ?? event.emittedAt;
      step.attempts += 1;
      snap.steps[stepId] = step;
      return;
    }
    case 'StepCompleted': {
      const stepId = (event as EventEnvelope & { stepId: string }).stepId;
      const step = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
      step.status = 'COMPLETED';
      step.completedAt = event.emittedAt;
      snap.steps[stepId] = step;
      const decision = extractGatewayDecision(event);
      if (decision !== undefined) {
        snap.gatewayDecisions ??= {};
        snap.gatewayDecisions[stepId] = decision;
      }
      return;
    }
    case 'StepFailed': {
      const stepId = (event as EventEnvelope & { stepId: string }).stepId;
      const step = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
      step.status = 'FAILED';
      step.completedAt = event.emittedAt;
      snap.steps[stepId] = step;
      return;
    }
    case 'StepSkipped': {
      const stepId = (event as EventEnvelope & { stepId: string }).stepId;
      const step = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
      step.status = 'SKIPPED';
      step.completedAt = event.emittedAt;
      snap.steps[stepId] = step;
      return;
    }
    default:
      return;
  }
}

function extractGatewayDecision(event: EventEnvelope): boolean | undefined {
  if (typeof event.payload !== 'object' || event.payload === null) {
    return undefined;
  }
  const maybeDecision = (event.payload as Record<string, unknown>).gatewayDecision;
  return typeof maybeDecision === 'boolean' ? maybeDecision : undefined;
}
