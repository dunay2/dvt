/**
 * @file packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @baseline ADR-0037: Run Event Lifecycle Archival, Verification, and Restore Model
 * @decision Run snapshot persistence extracted from PostgresStateStoreAdapter
 * @decision Terminal archive pinning metadata lives on run_snapshots as warm derived state
 * @consequence Single-responsibility class for run_snapshots table operations
 * @version 1.0.0
 * @date 2026-03-15
 */
import { RunNotFoundError } from '@dvt/engine';
import { applyRunEvent } from '@dvt/run-domain';
import {
  buildArchivedTerminalSnapshot,
  type ArchivedTerminalSnapshot,
  type TerminalRunStatus,
  type TerminalSnapshotPinResult,
  type TerminalSnapshotPinStore,
} from '@dvt/state-store';
import type { PoolClient } from 'pg';

import { quoteIdentifier } from './sqlUtils.js';
import type { EventEnvelope, RunId, WorkflowSnapshot } from './types.js';

// ---------------------------------------------------------------------------
// Row shapes (internal)
// ---------------------------------------------------------------------------

interface SnapshotRow {
  snapshot: WorkflowSnapshot;
}

interface PinnedSnapshotRow extends SnapshotRow {
  last_run_seq: number | string;
  archive_unit_key: string | null;
  event_checksum_sha256: string | null;
  archived_at: Date | string | null;
}

interface SnapshotSeqRow {
  last_run_seq: number | string;
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

export class PostgresRunSnapshotStore implements TerminalSnapshotPinStore {
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

  async pinTerminalSnapshot(
    snapshot: ArchivedTerminalSnapshot
  ): Promise<TerminalSnapshotPinResult> {
    const record = buildArchivedTerminalSnapshot({
      tenantId: snapshot.tenantId,
      archiveUnitKey: snapshot.archiveUnitKey,
      archivedAtIso: snapshot.archivedAt,
      pinned: snapshot,
    });

    return this.withTransaction(async (client) => {
      await this.requireRunOwnership(client, record.tenantId, record.runId);
      const upsertResult = await client.query(
        `
          INSERT INTO ${quoteIdentifier(this.schema)}.run_snapshots AS run_snapshots (
            run_id,
            snapshot,
            last_run_seq,
            updated_at,
            archive_unit_key,
            event_checksum_sha256,
            archived_at
          )
          VALUES ($1, $2::jsonb, $3, $4::timestamptz, $5, $6, $7::timestamptz)
          ON CONFLICT (run_id) DO UPDATE SET
            snapshot = EXCLUDED.snapshot,
            last_run_seq = EXCLUDED.last_run_seq,
            updated_at = EXCLUDED.updated_at,
            archive_unit_key = EXCLUDED.archive_unit_key,
            event_checksum_sha256 = EXCLUDED.event_checksum_sha256,
            archived_at = EXCLUDED.archived_at
          WHERE run_snapshots.last_run_seq <= EXCLUDED.last_run_seq
        `,
        [
          record.runId,
          JSON.stringify(record.snapshot),
          record.lastRunSeq,
          this.now(),
          record.archiveUnitKey,
          record.eventChecksumSha256,
          record.archivedAt,
        ]
      );

      if ((upsertResult.rowCount ?? 0) > 0) {
        return {
          outcome: 'APPLIED',
          tenantId: record.tenantId,
          runId: record.runId,
          archiveUnitKey: record.archiveUnitKey,
          incomingLastRunSeq: record.lastRunSeq,
          storedLastRunSeq: record.lastRunSeq,
        };
      }

      const currentResult = await client.query<SnapshotSeqRow>(
        `
          SELECT s.last_run_seq
          FROM ${quoteIdentifier(this.schema)}.run_snapshots s
          INNER JOIN ${quoteIdentifier(this.schema)}.run_metadata m ON m.run_id = s.run_id
          WHERE m.tenant_id = $1 AND s.run_id = $2
          LIMIT 1
        `,
        [record.tenantId, record.runId]
      );
      const currentRow = currentResult.rows[0];
      if (!currentRow) {
        throw new Error(`ARCHIVE_TERMINAL_SNAPSHOT_PIN_DISCARDED_WITHOUT_ROW: ${record.runId}`);
      }

      return {
        outcome: 'DISCARDED_STALE_SEQUENCE',
        tenantId: record.tenantId,
        runId: record.runId,
        archiveUnitKey: record.archiveUnitKey,
        incomingLastRunSeq: record.lastRunSeq,
        storedLastRunSeq: Number(currentRow.last_run_seq),
      };
    });
  }

  async getPinnedTerminalSnapshot(
    tenantId: string,
    runId: RunId
  ): Promise<ArchivedTerminalSnapshot | null> {
    const result = await this.withClient((client) =>
      client.query<PinnedSnapshotRow>(
        `
          SELECT
            s.snapshot,
            s.last_run_seq,
            s.archive_unit_key,
            s.event_checksum_sha256,
            s.archived_at
          FROM ${quoteIdentifier(this.schema)}.run_snapshots s
          INNER JOIN ${quoteIdentifier(this.schema)}.run_metadata m ON m.run_id = s.run_id
          WHERE m.tenant_id = $1
            AND s.run_id = $2
            AND s.archive_unit_key IS NOT NULL
        `,
        [tenantId, runId]
      )
    );

    const row = result.rows[0];
    if (
      row?.archive_unit_key == null ||
      row.event_checksum_sha256 === null ||
      row.archived_at === null
    ) {
      return null;
    }

    const status = row.snapshot.status;
    if (!isTerminalRunStatus(status)) {
      throw new Error('ARCHIVE_TERMINAL_SNAPSHOT_STATUS_INVALID');
    }

    return buildArchivedTerminalSnapshot({
      tenantId,
      archiveUnitKey: row.archive_unit_key,
      archivedAtIso: new Date(row.archived_at).toISOString(),
      pinned: {
        runId,
        status,
        lastRunSeq: Number(row.last_run_seq),
        eventChecksumSha256: row.event_checksum_sha256,
        snapshot: row.snapshot,
      },
    });
  }

  /**
   * ADR-0004 section 2.2 - Full event replay from runSeq=1 overwrites the materialized snapshot.
   * ADR-0031 - Tenant isolation is verified before replay; mismatches raise RunNotFoundError.
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
        throw new RunNotFoundError(runId);
      }

      // Acquire per-run advisory lock to prevent concurrent snapshot mutations.
      await this.acquireRunLock(client, runId);

      // ADR-0004 section 2.2: replay MUST use runSeq ASC.
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
        applyRunEvent(snap, row.payload);
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
      applyRunEvent(snap, e);
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
        INSERT INTO ${quoteIdentifier(this.schema)}.run_snapshots AS run_snapshots (
          run_id,
          snapshot,
          last_run_seq,
          updated_at
        )
        VALUES ($1, $2::jsonb, $3, $4::timestamptz)
        ON CONFLICT (run_id) DO UPDATE SET
          snapshot = EXCLUDED.snapshot,
          last_run_seq = EXCLUDED.last_run_seq,
          updated_at = EXCLUDED.updated_at
        WHERE run_snapshots.last_run_seq <= EXCLUDED.last_run_seq
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

  private async requireRunOwnership(
    client: PoolClient,
    tenantId: string,
    runId: string
  ): Promise<void> {
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
      throw new RunNotFoundError(runId);
    }
  }
}

function isTerminalRunStatus(status: string): status is TerminalRunStatus {
  return status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED';
}
