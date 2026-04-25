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
import { CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION } from '@dvt/contracts';
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

import { PostgresSchemaManager } from './PostgresSchemaManager.js';
import { InvalidRunSequenceValueError } from './runEventStoreErrors.js';
import { quoteIdentifier } from './sqlUtils.js';
import type { EventEnvelope, RunId, WorkflowSnapshot } from './types.js';

// ---------------------------------------------------------------------------
// Row shapes (internal)
// ---------------------------------------------------------------------------

interface SnapshotRow {
  snapshot: WorkflowSnapshot;
}

interface SnapshotWithSeqRow extends SnapshotRow {
  last_run_seq: number | string | null;
}

interface SnapshotReadRow extends SnapshotRow {
  last_run_seq: number | string | null;
  latest_run_seq: number | string | null;
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
  max_seq: number | string | bigint;
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
    const read = await this.withClient(async (client) => {
      await PostgresSchemaManager.setTenantContext(client, tenantId);
      const result = await client.query<SnapshotReadRow>(
        `
          SELECT
            s.snapshot,
            s.last_run_seq,
            le.run_seq AS latest_run_seq
          FROM ${quoteIdentifier(this.schema)}.run_metadata m
          LEFT JOIN ${quoteIdentifier(this.schema)}.run_snapshots s
            ON s.run_id = m.run_id
            AND s.tenant_id = m.tenant_id
          LEFT JOIN LATERAL (
            SELECT e.run_seq
            FROM ${quoteIdentifier(this.schema)}.run_events e
            WHERE e.run_id = m.run_id
              AND e.tenant_id = m.tenant_id
            ORDER BY e.run_seq DESC
            LIMIT 1
          ) le ON TRUE
          WHERE m.tenant_id = $1
            AND m.run_id = $2
          LIMIT 1
        `,
        [tenantId, runId]
      );
      const row = result.rows[0];
      if (!row?.snapshot) {
        return null;
      }
      const snapshot = row.snapshot;

      const persistedLastRunSeq =
        row.last_run_seq === null ? 0 : parsePersistedRunSequence(row.last_run_seq, runId);
      const latestRunSeq =
        row.latest_run_seq === null
          ? persistedLastRunSeq
          : parsePersistedRunSequence(row.latest_run_seq, runId);

      const tailEvents =
        latestRunSeq > persistedLastRunSeq
          ? await this.listEventsAfterSeqWithClient(client, tenantId, runId, persistedLastRunSeq)
          : [];

      return { snapshot, tailEvents };
    });
    if (read === null) {
      return null;
    }
    if (read.snapshot.schemaVersion !== CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION) {
      // Schema-version mismatch means the stored read model shape is stale.
      // Rebuild from canonical event history before serving.
      return this.rebuildSnapshot(tenantId, runId);
    }
    if (read.tailEvents.length === 0) {
      return read.snapshot;
    }

    const freshSnapshot = cloneWorkflowSnapshot(read.snapshot);
    for (const event of read.tailEvents) {
      applyRunEvent(freshSnapshot, event);
    }
    return freshSnapshot;
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
      await PostgresSchemaManager.setTenantContext(client, record.tenantId);
      await this.requireRunOwnership(client, record.tenantId, record.runId);
      const upsertResult = await client.query(
        `
          INSERT INTO ${quoteIdentifier(this.schema)}.run_snapshots AS run_snapshots (
            run_id,
            tenant_id,
            snapshot,
            last_run_seq,
            updated_at,
            archive_unit_key,
            event_checksum_sha256,
            archived_at
          )
          VALUES ($1, $2, $3::jsonb, $4, $5::timestamptz, $6, $7, $8::timestamptz)
          ON CONFLICT (run_id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
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
          record.tenantId,
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
          INNER JOIN ${quoteIdentifier(this.schema)}.run_metadata m
            ON m.run_id = s.run_id
            AND m.tenant_id = s.tenant_id
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
    const result = await this.withClient(async (client) => {
      await PostgresSchemaManager.setTenantContext(client, tenantId);
      return client.query<PinnedSnapshotRow>(
        `
          SELECT
            s.snapshot,
            s.last_run_seq,
            s.archive_unit_key,
            s.event_checksum_sha256,
            s.archived_at
          FROM ${quoteIdentifier(this.schema)}.run_snapshots s
          INNER JOIN ${quoteIdentifier(this.schema)}.run_metadata m
            ON m.run_id = s.run_id
            AND m.tenant_id = s.tenant_id
          WHERE m.tenant_id = $1
            AND s.run_id = $2
            AND s.archive_unit_key IS NOT NULL
        `,
        [tenantId, runId]
      );
    });

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
   * ADR-0004 section 2.2 - Event replay preserves runSeq ordering while allowing
   * incremental catch-up from the latest persisted snapshot checkpoint.
   * ADR-0031 - Tenant isolation is verified before replay; mismatches raise RunNotFoundError.
   */
  async rebuildSnapshot(tenantId: string, runId: RunId): Promise<WorkflowSnapshot> {
    return this.withTransaction(async (client) => {
      await PostgresSchemaManager.setTenantContext(client, tenantId);
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

      const maxSeqResult = await client.query<MaxSeqRow>(
        `
          SELECT COALESCE(MAX(run_seq), 0) AS max_seq
          FROM ${quoteIdentifier(this.schema)}.run_events
          WHERE tenant_id = $1
            AND run_id = $2
        `,
        [tenantId, runId]
      );
      const maxRunSeq = parsePersistedRunSequence(maxSeqResult.rows[0]?.max_seq ?? 0, runId);

      const checkpoint = await client.query<SnapshotWithSeqRow>(
        `
          SELECT snapshot, last_run_seq
          FROM ${quoteIdentifier(this.schema)}.run_snapshots
          WHERE tenant_id = $1
            AND run_id = $2
          LIMIT 1
        `,
        [tenantId, runId]
      );
      const persisted = checkpoint.rows[0];
      const canUseIncrementalCheckpoint =
        persisted?.snapshot !== undefined &&
        persisted.snapshot.schemaVersion === CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION &&
        persisted.last_run_seq !== null &&
        persisted.last_run_seq !== undefined &&
        parsePersistedRunSequence(persisted.last_run_seq, runId) <= maxRunSeq;

      const replayFromRunSeq = canUseIncrementalCheckpoint
        ? parsePersistedRunSequence(persisted.last_run_seq, runId)
        : 0;
      const snapshot = canUseIncrementalCheckpoint
        ? cloneWorkflowSnapshot(persisted.snapshot)
        : this.createEmptySnapshot(runId);

      // ADR-0004 section 2.2: replay MUST use runSeq ASC.
      const eventsResult = await client.query<EventPayloadRow>(
        `
          SELECT payload
          FROM ${quoteIdentifier(this.schema)}.run_events
          WHERE tenant_id = $1
            AND run_id = $2
            AND run_seq > $3
          ORDER BY run_seq ASC
        `,
        [tenantId, runId, replayFromRunSeq]
      );
      for (const row of eventsResult.rows) {
        applyRunEvent(snapshot, row.payload);
      }

      const lastSeq = eventsResult.rows.at(-1)?.payload.runSeq ?? replayFromRunSeq;

      // Pass lastSeq directly; 0 is valid when the run has no events (degenerate case).
      // persistWithClient only rejects null, not 0.
      await this.persistWithClient(client, tenantId, runId, snapshot, lastSeq);
      return snapshot;
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

    const tenantId = deriveTenantIdFromAppendedEvents(appended);
    const snap = await this.getOrCreateSnapshotWithClient(client, tenantId, runId, baseRunSeq);
    for (const e of appended) {
      applyRunEvent(snap, e);
    }
    await this.persistWithClient(client, tenantId, runId, snap, lastAppendedRunSeq);
  }

  /**
   * Validates appended events against the current run lifecycle state inside the
   * same transaction used by append. This preserves transition guards even when
   * snapshot persistence is decoupled to background workers.
   */
  async validateAppendedTransitionsWithClient(
    client: PoolClient,
    tenantId: string,
    runId: RunId,
    baseRunSeq: number,
    appended: EventEnvelope[]
  ): Promise<void> {
    if (appended.length === 0) {
      return;
    }

    const validationSnapshot = await this.buildValidationSnapshotWithClient(
      client,
      tenantId,
      runId,
      baseRunSeq
    );

    for (const event of appended) {
      applyRunEvent(validationSnapshot, event);
    }
  }

  async persistWithClient(
    client: PoolClient,
    tenantId: string,
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
          tenant_id,
          snapshot,
          last_run_seq,
          updated_at
        )
        VALUES ($1, $2, $3::jsonb, $4, $5::timestamptz)
        ON CONFLICT (run_id) DO UPDATE SET
          tenant_id = EXCLUDED.tenant_id,
          snapshot = EXCLUDED.snapshot,
          last_run_seq = EXCLUDED.last_run_seq,
          updated_at = EXCLUDED.updated_at
        WHERE run_snapshots.last_run_seq <= EXCLUDED.last_run_seq
      `,
      [runId, tenantId, JSON.stringify(snap), lastSeq, this.now()]
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
    tenantId: string,
    runId: RunId,
    baseRunSeq: number
  ): Promise<WorkflowSnapshot> {
    if (baseRunSeq > 0) {
      const currentSnap = await client.query<SnapshotRow>(
        `
          SELECT snapshot
          FROM ${quoteIdentifier(this.schema)}.run_snapshots
          WHERE tenant_id = $1 AND run_id = $2
        `,
        [tenantId, runId]
      );
      if (currentSnap.rows[0]?.snapshot) {
        return currentSnap.rows[0].snapshot;
      }
    }

    return {
      schemaVersion: CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION,
      runId,
      status: 'PENDING',
      paused: false,
      cancelling: false,
      gatewayDecisions: {},
      steps: {},
    };
  }

  private async buildValidationSnapshotWithClient(
    client: PoolClient,
    tenantId: string,
    runId: RunId,
    baseRunSeq: number
  ): Promise<WorkflowSnapshot> {
    const snapshotRow = await client.query<SnapshotWithSeqRow>(
      `
        SELECT snapshot, last_run_seq
        FROM ${quoteIdentifier(this.schema)}.run_snapshots
        WHERE tenant_id = $1
          AND run_id = $2
        LIMIT 1
      `,
      [tenantId, runId]
    );

    const persisted = snapshotRow.rows[0];
    const snapshot = persisted?.snapshot
      ? cloneWorkflowSnapshot(persisted.snapshot)
      : this.createEmptySnapshot(runId);
    const snapshotLastRunSeq =
      persisted?.last_run_seq === null || persisted?.last_run_seq === undefined
        ? 0
        : parsePersistedRunSequence(persisted.last_run_seq, runId);

    if (baseRunSeq <= snapshotLastRunSeq) {
      return snapshot;
    }

    const tailEvents = await this.listEventsBetweenSeqWithClient(
      client,
      tenantId,
      runId,
      snapshotLastRunSeq,
      baseRunSeq
    );
    for (const event of tailEvents) {
      applyRunEvent(snapshot, event);
    }
    return snapshot;
  }

  private createEmptySnapshot(runId: RunId): WorkflowSnapshot {
    return {
      schemaVersion: CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION,
      runId,
      status: 'PENDING',
      paused: false,
      cancelling: false,
      gatewayDecisions: {},
      steps: {},
    };
  }

  private async listEventsAfterSeqWithClient(
    client: PoolClient,
    tenantId: string,
    runId: RunId,
    afterSeq: number
  ): Promise<EventEnvelope[]> {
    const result = await client.query<EventPayloadRow>(
      `
        SELECT payload
        FROM ${quoteIdentifier(this.schema)}.run_events
        WHERE tenant_id = $1
          AND run_id = $2
          AND run_seq > $3
        ORDER BY run_seq ASC
      `,
      [tenantId, runId, afterSeq]
    );
    return result.rows.map((row) => row.payload);
  }

  private async listEventsBetweenSeqWithClient(
    client: PoolClient,
    tenantId: string,
    runId: RunId,
    afterSeq: number,
    toSeqInclusive: number
  ): Promise<EventEnvelope[]> {
    const result = await client.query<EventPayloadRow>(
      `
        SELECT payload
        FROM ${quoteIdentifier(this.schema)}.run_events
        WHERE tenant_id = $1
          AND run_id = $2
          AND run_seq > $3
          AND run_seq <= $4
        ORDER BY run_seq ASC
      `,
      [tenantId, runId, afterSeq, toSeqInclusive]
    );
    return result.rows.map((row) => row.payload);
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

function deriveTenantIdFromAppendedEvents(appended: readonly EventEnvelope[]): string {
  const tenantId = appended[0]?.tenantId;
  if (!tenantId) {
    throw new Error('SNAPSHOT_EVENT_TENANT_REQUIRED');
  }
  if (appended.some((event) => event.tenantId !== tenantId)) {
    throw new Error('SNAPSHOT_EVENT_TENANT_MISMATCH');
  }
  return tenantId;
}

function cloneWorkflowSnapshot(snapshot: WorkflowSnapshot): WorkflowSnapshot {
  const steps = Object.fromEntries(
    Object.entries(snapshot.steps).map(([stepId, step]) => [stepId, { ...step }])
  );

  return {
    ...snapshot,
    steps,
    gatewayDecisions: snapshot.gatewayDecisions ? { ...snapshot.gatewayDecisions } : {},
  };
}

const MAX_SAFE_RUN_SEQUENCE = BigInt(Number.MAX_SAFE_INTEGER);

function parsePersistedRunSequence(rawValue: unknown, runId: RunId): number {
  if (typeof rawValue === 'number') {
    if (!Number.isInteger(rawValue) || rawValue < 0 || rawValue > Number.MAX_SAFE_INTEGER) {
      throw new InvalidRunSequenceValueError(runId, rawValue);
    }
    return rawValue;
  }

  if (typeof rawValue === 'bigint') {
    return parsePersistedBigIntRunSequence(rawValue, runId);
  }

  if (typeof rawValue === 'string') {
    const normalized = rawValue.trim();
    if (normalized.length === 0) {
      throw new InvalidRunSequenceValueError(runId, rawValue);
    }
    try {
      return parsePersistedBigIntRunSequence(BigInt(normalized), runId);
    } catch {
      throw new InvalidRunSequenceValueError(runId, rawValue);
    }
  }

  throw new InvalidRunSequenceValueError(runId, rawValue);
}

function parsePersistedBigIntRunSequence(value: bigint, runId: RunId): number {
  if (value < 0n || value > MAX_SAFE_RUN_SEQUENCE) {
    throw new InvalidRunSequenceValueError(runId, value.toString());
  }
  return Number(value);
}
