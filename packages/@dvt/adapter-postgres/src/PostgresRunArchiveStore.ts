import { randomUUID } from 'node:crypto';

import {
  buildArchiveUnitKey,
  calculateDeleteAfterIso,
  deriveTenantBucket,
  parseArchiveUnitKey,
  type ArchiveBatchDroppedRecord,
  type ArchiveBatchExportedRecord,
  type ArchiveBatchFailureRecord,
  type ArchiveBatchRecord,
  type ArchiveBatchVerifiedRecord,
  type ArchiveUnitTerminalSnapshotCandidate,
  type ArchivedTerminalSnapshot,
  type DeleteEligibleArchiveUnit,
  type EligibleArchiveUnit,
  type IRunArchiveDeleteStore,
  type IRunArchiveRestoreStore,
  type IRunArchiveStore,
  type PendingArchiveVerification,
  type RestoreLogRecord,
  type RunArchiveDeletionPolicy,
  type RunEventRetentionPolicy,
  type TerminalSnapshotPinResult,
  type TerminalSnapshotPinStore,
} from '@dvt/state-store';
import type { PoolClient } from 'pg';

import { quoteIdentifier } from './sqlUtils.js';
import type { EventEnvelope, RunId, WorkflowSnapshot } from './types.js';

interface EligibleRunRow {
  tenant_id: string;
  persisted_at_day: string;
  run_id: string;
  row_count: number | string;
  min_run_seq: number | string;
  max_run_seq: number | string;
  snapshot_status: string | null;
}

interface ArchiveUnitRow {
  archive_unit_key: string;
  tenant_bucket: string;
  tenant_ids: unknown;
  row_count: number | string;
  min_run_seq: number | string | null;
  max_run_seq: number | string | null;
  object_key: string | null;
  checksum_sha256: string | null;
  exported_at: Date | string | null;
  state: string;
}

interface EventPayloadRow {
  payload: EventEnvelope;
}

interface TerminalSnapshotCandidateRow {
  tenant_id: string;
  run_id: string;
  snapshot: WorkflowSnapshot;
}

interface PendingVerificationRow {
  batch_id: string;
  archive_unit_key: string;
  tenant_bucket: string;
  tenant_ids: unknown;
  row_count: number | string;
  min_run_seq: number | string | null;
  max_run_seq: number | string | null;
  object_key: string | null;
  checksum_sha256: string | null;
  exported_at: Date | string | null;
}

const TERMINAL_SNAPSHOT_STATUSES = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);
const BLOCKED_ELIGIBLE_STATES = new Set([
  'EXPORTED',
  'VERIFY_FAILED',
  'VERIFIED',
  'DELETE_ELIGIBLE',
  'DROPPED_FROM_HOT',
]);

export class PostgresRunArchiveStore
  implements IRunArchiveStore, IRunArchiveDeleteStore, IRunArchiveRestoreStore
{
  constructor(
    private readonly schema: string,
    private readonly withTransaction: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>,
    private readonly withClient: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>,
    private readonly snapshotStore: TerminalSnapshotPinStore
  ) {}

  async listEligibleArchiveUnits(
    policy: RunEventRetentionPolicy,
    nowIso: string
  ): Promise<readonly EligibleArchiveUnit[]> {
    validateRetentionPolicy(policy);
    const cutoffIso = computeCutoffIso(nowIso, policy.hotRetentionDays);

    return this.withTransaction(async (client) => {
      const runRows = await client.query<EligibleRunRow>(
        `
          SELECT
            e.tenant_id,
            to_char(timezone('UTC', e.persisted_at)::date, 'YYYY-MM-DD') AS persisted_at_day,
            e.run_id,
            COUNT(*) AS row_count,
            MIN(e.run_seq) AS min_run_seq,
            MAX(e.run_seq) AS max_run_seq,
            s.snapshot_status
          FROM ${quoteIdentifier(this.schema)}.run_events e
          LEFT JOIN ${quoteIdentifier(this.schema)}.run_snapshots s ON s.run_id = e.run_id
          WHERE e.persisted_at < $1::timestamptz
          GROUP BY
            e.tenant_id,
            to_char(timezone('UTC', e.persisted_at)::date, 'YYYY-MM-DD'),
            e.run_id,
            s.snapshot_status
          ORDER BY persisted_at_day ASC, e.tenant_id ASC, e.run_id ASC
        `,
        [cutoffIso]
      );

      const candidatesByKey = new Map<
        string,
        {
          tenantBucket: string;
          tenantIds: Set<string>;
          rowCount: number;
          minRunSeq: number;
          maxRunSeq: number;
          hasNonTerminalRun: boolean;
        }
      >();

      for (const row of runRows.rows) {
        const tenantBucket = deriveTenantBucket(row.tenant_id, policy.archiveBucketCount);
        const archiveUnitKey = buildArchiveUnitKey({
          tenantBucket,
          persistedAtDay: row.persisted_at_day,
        });
        const candidate = ensureCandidate(candidatesByKey, archiveUnitKey, tenantBucket);

        candidate.tenantIds.add(row.tenant_id);
        candidate.rowCount += Number(row.row_count);
        candidate.minRunSeq = Math.min(candidate.minRunSeq, Number(row.min_run_seq));
        candidate.maxRunSeq = Math.max(candidate.maxRunSeq, Number(row.max_run_seq));

        if (!isTerminalSnapshotStatus(row.snapshot_status)) {
          candidate.hasNonTerminalRun = true;
        }
      }

      const candidateKeys = [...candidatesByKey.keys()];
      if (candidateKeys.length === 0) {
        return [];
      }

      const existingRows = await client.query<ArchiveUnitRow>(
        `
          SELECT archive_unit_key, tenant_bucket, tenant_ids, row_count, min_run_seq, max_run_seq, object_key, checksum_sha256, exported_at, state
          FROM ${quoteIdentifier(this.schema)}.run_event_archive_units
          WHERE archive_unit_key = ANY($1::text[])
        `,
        [candidateKeys]
      );
      const existingByKey = new Map(existingRows.rows.map((row) => [row.archive_unit_key, row]));

      const eligible: EligibleArchiveUnit[] = [];
      for (const [archiveUnitKey, candidate] of candidatesByKey) {
        const existing = existingByKey.get(archiveUnitKey);
        if (candidate.hasNonTerminalRun) {
          continue;
        }
        if (existing && BLOCKED_ELIGIBLE_STATES.has(existing.state)) {
          continue;
        }

        await client.query(
          `
            INSERT INTO ${quoteIdentifier(this.schema)}.run_event_archive_units (
              archive_unit_key,
              tenant_bucket,
              persisted_at_day,
              state,
              tenant_ids,
              tenant_count,
              row_count,
              min_run_seq,
              max_run_seq,
              updated_at
            )
            VALUES (
              $1,
              $2,
              $3::date,
              'ELIGIBLE',
              $4::jsonb,
              $5,
              $6,
              $7,
              $8,
              $9::timestamptz
            )
            ON CONFLICT (archive_unit_key) DO UPDATE SET
              tenant_bucket = EXCLUDED.tenant_bucket,
              persisted_at_day = EXCLUDED.persisted_at_day,
              state = 'ELIGIBLE',
              tenant_ids = EXCLUDED.tenant_ids,
              tenant_count = EXCLUDED.tenant_count,
              row_count = EXCLUDED.row_count,
              min_run_seq = EXCLUDED.min_run_seq,
              max_run_seq = EXCLUDED.max_run_seq,
              updated_at = EXCLUDED.updated_at
          `,
          [
            archiveUnitKey,
            candidate.tenantBucket,
            candidateDayFromKey(archiveUnitKey),
            JSON.stringify([...candidate.tenantIds].sort()),
            candidate.tenantIds.size,
            candidate.rowCount,
            candidate.minRunSeq,
            candidate.maxRunSeq,
            nowIso,
          ]
        );

        eligible.push({
          archiveUnitKey,
          tenantBucket: candidate.tenantBucket,
          tenantIds: [...candidate.tenantIds].sort(),
          rowCount: candidate.rowCount,
          minRunSeq: candidate.minRunSeq,
          maxRunSeq: candidate.maxRunSeq,
          state: 'ELIGIBLE',
        });
      }

      return eligible;
    });
  }

  async startArchiveBatch(
    archiveUnitKey: string,
    startedAtIso: string
  ): Promise<ArchiveBatchRecord> {
    return this.withTransaction(async (client) => {
      await requireArchiveUnit(client, this.schema, archiveUnitKey);
      const batchId = randomUUID();
      await client.query(
        `
          INSERT INTO ${quoteIdentifier(this.schema)}.run_event_archive_batches (
            batch_id,
            archive_unit_key,
            started_at,
            status
          )
          VALUES ($1, $2, $3::timestamptz, 'STARTED')
        `,
        [batchId, archiveUnitKey, startedAtIso]
      );

      return {
        batchId,
        archiveUnitKey,
        startedAt: startedAtIso,
        status: 'STARTED',
      };
    });
  }

  async loadArchiveUnitEvents(archiveUnitKey: string): Promise<readonly EventEnvelope[]> {
    return this.withClient(async (client) => {
      const unit = await requireArchiveUnit(client, this.schema, archiveUnitKey);
      const tenantIds = parseTenantIds(unit.tenant_ids);
      const result = await client.query<EventPayloadRow>(
        `
          SELECT e.payload
          FROM ${quoteIdentifier(this.schema)}.run_events e
          WHERE to_char(timezone('UTC', e.persisted_at)::date, 'YYYY-MM-DD') = $1
            AND e.tenant_id = ANY($2::text[])
          ORDER BY e.tenant_id ASC, e.run_id ASC, e.run_seq ASC
        `,
        [candidateDayFromKey(archiveUnitKey), tenantIds]
      );
      return result.rows.map((row) => row.payload);
    });
  }

  async listTerminalSnapshotsForArchiveUnit(
    archiveUnitKey: string
  ): Promise<readonly ArchiveUnitTerminalSnapshotCandidate[]> {
    return this.withClient(async (client) => {
      const unit = await requireArchiveUnit(client, this.schema, archiveUnitKey);
      const tenantIds = parseTenantIds(unit.tenant_ids);
      const result = await client.query<TerminalSnapshotCandidateRow>(
        `
          SELECT DISTINCT
            e.tenant_id,
            e.run_id,
            s.snapshot
          FROM ${quoteIdentifier(this.schema)}.run_events e
          INNER JOIN ${quoteIdentifier(this.schema)}.run_snapshots s ON s.run_id = e.run_id
          WHERE to_char(timezone('UTC', e.persisted_at)::date, 'YYYY-MM-DD') = $1
            AND e.tenant_id = ANY($2::text[])
            AND s.snapshot_status IN ('COMPLETED', 'FAILED', 'CANCELLED')
          ORDER BY e.tenant_id ASC, e.run_id ASC
        `,
        [candidateDayFromKey(archiveUnitKey), tenantIds]
      );

      return result.rows.map((row) => ({
        tenantId: row.tenant_id,
        runId: row.run_id as RunId,
        snapshot: row.snapshot,
      }));
    });
  }

  async pinTerminalSnapshot(
    snapshot: ArchivedTerminalSnapshot
  ): Promise<TerminalSnapshotPinResult> {
    return this.snapshotStore.pinTerminalSnapshot(snapshot);
  }

  async getPinnedTerminalSnapshot(
    tenantId: string,
    runId: RunId
  ): Promise<ArchivedTerminalSnapshot | null> {
    return this.snapshotStore.getPinnedTerminalSnapshot(tenantId, runId);
  }

  async markArchiveBatchExported(record: ArchiveBatchExportedRecord): Promise<void> {
    return this.withTransaction(async (client) => {
      await requireArchiveBatch(client, this.schema, record.batchId, record.archiveUnitKey);

      await client.query(
        `
          UPDATE ${quoteIdentifier(this.schema)}.run_event_archive_units
          SET
            tenant_bucket = $2,
            tenant_ids = $3::jsonb,
            tenant_count = $4,
            row_count = $5,
            min_run_seq = $6,
            max_run_seq = $7,
            object_key = $8,
            checksum_sha256 = $9,
            exported_at = $10::timestamptz,
            state = 'EXPORTED',
            updated_at = $10::timestamptz
          WHERE archive_unit_key = $1
        `,
        [
          record.archiveUnitKey,
          record.tenantBucket,
          JSON.stringify(record.tenantIds),
          record.tenantIds.length,
          record.rowCount,
          record.minRunSeq,
          record.maxRunSeq,
          record.objectKey,
          record.checksumSha256,
          record.exportedAtIso,
        ]
      );

      await client.query(
        `
          UPDATE ${quoteIdentifier(this.schema)}.run_event_archive_batches
          SET
            status = 'EXPORTED',
            completed_at = $3::timestamptz,
            row_count = $4,
            checksum_sha256 = $5,
            error = NULL
          WHERE batch_id = $1 AND archive_unit_key = $2
        `,
        [
          record.batchId,
          record.archiveUnitKey,
          record.exportedAtIso,
          record.rowCount,
          record.checksumSha256,
        ]
      );
    });
  }

  async markArchiveBatchFailed(record: ArchiveBatchFailureRecord): Promise<void> {
    return this.withTransaction(async (client) => {
      await requireArchiveBatch(client, this.schema, record.batchId, record.archiveUnitKey);

      await client.query(
        `
          UPDATE ${quoteIdentifier(this.schema)}.run_event_archive_units
          SET
            state = 'ELIGIBLE',
            updated_at = $2::timestamptz
          WHERE archive_unit_key = $1
        `,
        [record.archiveUnitKey, record.failedAtIso]
      );

      await client.query(
        `
          UPDATE ${quoteIdentifier(this.schema)}.run_event_archive_batches
          SET
            status = 'FAILED',
            completed_at = $3::timestamptz,
            error = $4
          WHERE batch_id = $1 AND archive_unit_key = $2
        `,
        [record.batchId, record.archiveUnitKey, record.failedAtIso, record.error]
      );
    });
  }

  async listArchiveUnitsPendingVerification(
    limit = 100
  ): Promise<readonly PendingArchiveVerification[]> {
    return this.withClient(async (client) => {
      const result = await client.query<PendingVerificationRow>(
        `
          SELECT DISTINCT ON (u.archive_unit_key)
            b.batch_id,
            u.archive_unit_key,
            u.tenant_bucket,
            u.tenant_ids,
            u.row_count,
            u.min_run_seq,
            u.max_run_seq,
            u.object_key,
            u.checksum_sha256,
            u.exported_at
          FROM ${quoteIdentifier(this.schema)}.run_event_archive_units u
          INNER JOIN ${quoteIdentifier(this.schema)}.run_event_archive_batches b
            ON b.archive_unit_key = u.archive_unit_key
          WHERE u.state IN ('EXPORTED', 'VERIFY_FAILED')
            AND b.status IN ('EXPORTED', 'VERIFY_FAILED')
          ORDER BY u.archive_unit_key ASC, b.started_at DESC
          LIMIT $1
        `,
        [Math.max(1, limit)]
      );

      return result.rows.map((row) => {
        if (!row.object_key || !row.checksum_sha256 || !row.exported_at) {
          throw new Error(`ARCHIVE_PENDING_VERIFICATION_INVALID: ${row.archive_unit_key}`);
        }

        return {
          batchId: row.batch_id,
          archiveUnitKey: row.archive_unit_key,
          tenantBucket: row.tenant_bucket,
          tenantIds: parseTenantIds(row.tenant_ids),
          rowCount: Number(row.row_count),
          minRunSeq: Number(row.min_run_seq ?? 0),
          maxRunSeq: Number(row.max_run_seq ?? 0),
          objectKey: row.object_key,
          checksumSha256: row.checksum_sha256,
          exportedAtIso: new Date(row.exported_at).toISOString(),
        };
      });
    });
  }

  async markArchiveBatchVerified(record: ArchiveBatchVerifiedRecord): Promise<void> {
    return this.withTransaction(async (client) => {
      await requireArchiveBatch(client, this.schema, record.batchId, record.archiveUnitKey);

      await client.query(
        `
          UPDATE ${quoteIdentifier(this.schema)}.run_event_archive_units
          SET
            state = 'VERIFIED',
            verified_at = $2::timestamptz,
            updated_at = $2::timestamptz
          WHERE archive_unit_key = $1
        `,
        [record.archiveUnitKey, record.verifiedAtIso]
      );

      await client.query(
        `
          UPDATE ${quoteIdentifier(this.schema)}.run_event_archive_batches
          SET
            status = 'VERIFIED',
            completed_at = $3::timestamptz,
            error = NULL
          WHERE batch_id = $1 AND archive_unit_key = $2
        `,
        [record.batchId, record.archiveUnitKey, record.verifiedAtIso]
      );
    });
  }

  async markArchiveBatchVerifyFailed(record: ArchiveBatchFailureRecord): Promise<void> {
    return this.withTransaction(async (client) => {
      await requireArchiveBatch(client, this.schema, record.batchId, record.archiveUnitKey);

      await client.query(
        `
          UPDATE ${quoteIdentifier(this.schema)}.run_event_archive_units
          SET
            state = 'VERIFY_FAILED',
            updated_at = $2::timestamptz
          WHERE archive_unit_key = $1
        `,
        [record.archiveUnitKey, record.failedAtIso]
      );

      await client.query(
        `
          UPDATE ${quoteIdentifier(this.schema)}.run_event_archive_batches
          SET
            status = 'VERIFY_FAILED',
            completed_at = $3::timestamptz,
            error = $4
          WHERE batch_id = $1 AND archive_unit_key = $2
        `,
        [record.batchId, record.archiveUnitKey, record.failedAtIso, record.error]
      );
    });
  }

  // ---------------------------------------------------------------------------
  // IRunArchiveDeleteStore
  // ---------------------------------------------------------------------------

  async markDeleteEligibleUnits(
    policy: RunArchiveDeletionPolicy,
    nowIso: string
  ): Promise<readonly DeleteEligibleArchiveUnit[]> {
    return this.withTransaction(async (client) => {
      const result = await client.query<{
        archive_unit_key: string;
        tenant_bucket: string;
        tenant_ids: unknown;
        row_count: number | string;
        object_key: string;
        verified_at: Date | string;
      }>(
        `
          UPDATE ${quoteIdentifier(this.schema)}.run_event_archive_units
          SET
            state      = 'DELETE_ELIGIBLE',
            delete_after = verified_at + ($1 || ' days')::interval,
            updated_at = $2::timestamptz
          WHERE state = 'VERIFIED'
          RETURNING archive_unit_key, tenant_bucket, tenant_ids, row_count, object_key, verified_at
        `,
        [policy.deletionGraceDays, nowIso]
      );

      return result.rows.map((row) => {
        const verifiedAtIso = new Date(row.verified_at).toISOString();
        return {
          archiveUnitKey: row.archive_unit_key,
          tenantBucket: row.tenant_bucket,
          tenantIds: parseTenantIds(row.tenant_ids),
          rowCount: Number(row.row_count),
          objectKey: row.object_key ?? '',
          verifiedAtIso,
          deleteAfterIso: calculateDeleteAfterIso({
            verifiedAtIso,
            deletionGraceDays: policy.deletionGraceDays,
          }),
          state: 'DELETE_ELIGIBLE' as const,
        };
      });
    });
  }

  async listDueForDrop(
    policy: RunArchiveDeletionPolicy,
    nowIso: string
  ): Promise<readonly DeleteEligibleArchiveUnit[]> {
    return this.withClient(async (client) => {
      const result = await client.query<{
        archive_unit_key: string;
        tenant_bucket: string;
        tenant_ids: unknown;
        row_count: number | string;
        object_key: string | null;
        verified_at: Date | string | null;
        delete_after: Date | string | null;
      }>(
        `
          SELECT archive_unit_key, tenant_bucket, tenant_ids, row_count, object_key, verified_at, delete_after
          FROM ${quoteIdentifier(this.schema)}.run_event_archive_units
          WHERE state = 'DELETE_ELIGIBLE'
            AND delete_after IS NOT NULL
            AND delete_after <= $1::timestamptz
          ORDER BY delete_after ASC
          LIMIT $2
        `,
        [nowIso, Math.max(1, policy.maxUnitsPerRun)]
      );

      return result.rows.map((row) => ({
        archiveUnitKey: row.archive_unit_key,
        tenantBucket: row.tenant_bucket,
        tenantIds: parseTenantIds(row.tenant_ids),
        rowCount: Number(row.row_count),
        objectKey: row.object_key ?? '',
        verifiedAtIso: row.verified_at ? new Date(row.verified_at).toISOString() : '',
        deleteAfterIso: row.delete_after ? new Date(row.delete_after).toISOString() : '',
        state: 'DELETE_ELIGIBLE' as const,
      }));
    });
  }

  async dropHotArchiveUnit(
    archiveUnitKey: string,
    droppedAtIso: string
  ): Promise<{ rowsDeleted: number }> {
    return this.withTransaction(async (client) => {
      const unit = await requireArchiveUnit(client, this.schema, archiveUnitKey);
      if (unit.state !== 'DELETE_ELIGIBLE') {
        throw new Error(
          `ARCHIVE_UNIT_NOT_DELETE_ELIGIBLE: ${archiveUnitKey} is in state ${unit.state}`
        );
      }

      const tenantIds = parseTenantIds(unit.tenant_ids);
      const persistedAtDay = candidateDayFromKey(archiveUnitKey);

      const deleteResult = await client.query(
        `
          DELETE FROM ${quoteIdentifier(this.schema)}.run_events
          WHERE to_char(timezone('UTC', persisted_at)::date, 'YYYY-MM-DD') = $1
            AND tenant_id = ANY($2::text[])
        `,
        [persistedAtDay, tenantIds]
      );

      await client.query(
        `
          UPDATE ${quoteIdentifier(this.schema)}.run_event_archive_units
          SET
            state      = 'DROPPED_FROM_HOT',
            updated_at = $2::timestamptz
          WHERE archive_unit_key = $1
        `,
        [archiveUnitKey, droppedAtIso]
      );

      return { rowsDeleted: deleteResult.rowCount ?? 0 };
    });
  }

  async markArchiveBatchDropped(record: ArchiveBatchDroppedRecord): Promise<void> {
    return this.withTransaction(async (client) => {
      const batchId = record.batchId;
      const existing = await client.query<{ batch_id: string }>(
        `
          SELECT batch_id FROM ${quoteIdentifier(this.schema)}.run_event_archive_batches
          WHERE batch_id = $1 AND archive_unit_key = $2
          LIMIT 1
        `,
        [batchId, record.archiveUnitKey]
      );

      if (existing.rows[0]) {
        // Update existing batch row if it was created earlier
        await client.query(
          `
            UPDATE ${quoteIdentifier(this.schema)}.run_event_archive_batches
            SET
              status       = 'DROPPED',
              completed_at = $3::timestamptz,
              row_count    = $4
            WHERE batch_id = $1 AND archive_unit_key = $2
          `,
          [batchId, record.archiveUnitKey, record.droppedAtIso, record.rowsDeleted]
        );
      } else {
        // Insert a synthetic batch record for drop-only batches
        await client.query(
          `
            INSERT INTO ${quoteIdentifier(this.schema)}.run_event_archive_batches
              (batch_id, archive_unit_key, started_at, completed_at, status, row_count)
            VALUES ($1, $2, $3::timestamptz, $3::timestamptz, 'DROPPED', $4)
          `,
          [batchId, record.archiveUnitKey, record.droppedAtIso, record.rowsDeleted]
        );
      }
    });
  }

  // ---------------------------------------------------------------------------
  // IRunArchiveRestoreStore
  // ---------------------------------------------------------------------------

  async startRestoreLog(input: Omit<RestoreLogRecord, 'status'>): Promise<RestoreLogRecord> {
    return this.withTransaction(async (client) => {
      await client.query(
        `
          INSERT INTO ${quoteIdentifier(this.schema)}.run_event_archive_restore_log
            (restore_id, archive_unit_key, run_id, target_schema, requester_id, reason, status, started_at)
          VALUES ($1, $2, $3, $4, $5, $6, 'STARTED', $7::timestamptz)
        `,
        [
          input.restoreId,
          input.archiveUnitKey ?? null,
          input.runId ?? null,
          input.targetSchema,
          input.requesterId,
          input.reason,
          input.startedAt,
        ]
      );

      return { ...input, status: 'STARTED' as const };
    });
  }

  async markRestoreCompleted(
    restoreId: string,
    rowsRestored: number,
    completedAtIso: string
  ): Promise<void> {
    return this.withTransaction(async (client) => {
      await client.query(
        `
          UPDATE ${quoteIdentifier(this.schema)}.run_event_archive_restore_log
          SET
            status        = 'COMPLETED',
            rows_restored = $2,
            completed_at  = $3::timestamptz
          WHERE restore_id = $1
        `,
        [restoreId, rowsRestored, completedAtIso]
      );
    });
  }

  async markRestoreFailed(restoreId: string, error: string, failedAtIso: string): Promise<void> {
    return this.withTransaction(async (client) => {
      await client.query(
        `
          UPDATE ${quoteIdentifier(this.schema)}.run_event_archive_restore_log
          SET
            status       = 'FAILED',
            error        = $2,
            completed_at = $3::timestamptz
          WHERE restore_id = $1
        `,
        [restoreId, error, failedAtIso]
      );
    });
  }

  async writeRestoredEvents(
    events: readonly EventEnvelope[],
    targetSchema: string
  ): Promise<number> {
    if (events.length === 0) {
      return 0;
    }
    return this.withTransaction(async (client) => {
      // Ensure the target schema's run_events table exists.
      // In production the target schema is a temporary schema pre-created by ops.
      // We use a simple row-by-row insert here; bulk copy is a future optimisation.
      let inserted = 0;
      for (const event of events) {
        await client.query(
          `
            INSERT INTO ${quoteIdentifier(targetSchema)}.run_events
              (event_id, event_type, run_id, tenant_id, project_id, environment_id,
               plan_id, plan_version, engine_attempt_id, logical_attempt_id,
               idempotency_key, run_seq, emitted_at, persisted_at, payload)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::timestamptz,$14::timestamptz,$15::jsonb)
            ON CONFLICT (idempotency_key) DO NOTHING
          `,
          [
            event.eventId,
            event.eventType,
            event.runId,
            event.tenantId,
            event.projectId,
            event.environmentId,
            event.planId,
            event.planVersion,
            event.engineAttemptId,
            event.logicalAttemptId,
            event.idempotencyKey,
            event.runSeq,
            event.emittedAt,
            event.persistedAt,
            JSON.stringify(event),
          ]
        );
        inserted++;
      }
      return inserted;
    });
  }

  async getExportedBatchForUnit(
    archiveUnitKey: string
  ): Promise<{ batchId: string; objectKey: string; tenantBucket: string } | null> {
    return this.withClient(async (client) => {
      const result = await client.query<{
        batch_id: string;
        object_key: string;
        tenant_bucket: string;
      }>(
        `
          SELECT b.batch_id, u.object_key, u.tenant_bucket
          FROM ${quoteIdentifier(this.schema)}.run_event_archive_batches b
          INNER JOIN ${quoteIdentifier(this.schema)}.run_event_archive_units u
            ON u.archive_unit_key = b.archive_unit_key
          WHERE b.archive_unit_key = $1
            AND b.status = 'EXPORTED'
            AND u.object_key IS NOT NULL
          ORDER BY b.started_at DESC
          LIMIT 1
        `,
        [archiveUnitKey]
      );

      const row = result.rows[0];
      if (!row || !row.object_key) {
        return null;
      }
      return {
        batchId: row.batch_id,
        objectKey: row.object_key,
        tenantBucket: row.tenant_bucket,
      };
    });
  }
}

function validateRetentionPolicy(policy: RunEventRetentionPolicy): void {
  if (!Number.isInteger(policy.hotRetentionDays) || policy.hotRetentionDays <= 0) {
    throw new Error('ARCHIVE_HOT_RETENTION_DAYS_INVALID');
  }
  if (!Number.isInteger(policy.archiveBucketCount) || policy.archiveBucketCount <= 0) {
    throw new Error('ARCHIVE_BUCKET_COUNT_INVALID');
  }
}

function computeCutoffIso(nowIso: string, hotRetentionDays: number): string {
  const now = new Date(nowIso);
  if (Number.isNaN(now.getTime())) {
    throw new Error('ARCHIVE_NOW_INVALID');
  }
  return new Date(now.getTime() - hotRetentionDays * 24 * 60 * 60 * 1000).toISOString();
}

function ensureCandidate(
  candidatesByKey: Map<
    string,
    {
      tenantBucket: string;
      tenantIds: Set<string>;
      rowCount: number;
      minRunSeq: number;
      maxRunSeq: number;
      hasNonTerminalRun: boolean;
    }
  >,
  archiveUnitKey: string,
  tenantBucket: string
): {
  tenantBucket: string;
  tenantIds: Set<string>;
  rowCount: number;
  minRunSeq: number;
  maxRunSeq: number;
  hasNonTerminalRun: boolean;
} {
  const existing = candidatesByKey.get(archiveUnitKey);
  if (existing) {
    return existing;
  }
  const created = {
    tenantBucket,
    tenantIds: new Set<string>(),
    rowCount: 0,
    minRunSeq: Number.POSITIVE_INFINITY,
    maxRunSeq: Number.NEGATIVE_INFINITY,
    hasNonTerminalRun: false,
  };
  candidatesByKey.set(archiveUnitKey, created);
  return created;
}

function isTerminalSnapshotStatus(value: string | null): boolean {
  return value !== null && TERMINAL_SNAPSHOT_STATUSES.has(value);
}

function candidateDayFromKey(archiveUnitKey: string): string {
  return parseArchiveUnitKey(archiveUnitKey).persistedAtDay.replaceAll('_', '-');
}

async function requireArchiveUnit(
  client: PoolClient,
  schema: string,
  archiveUnitKey: string
): Promise<ArchiveUnitRow> {
  const result = await client.query<ArchiveUnitRow>(
    `
      SELECT archive_unit_key, tenant_bucket, tenant_ids, row_count, min_run_seq, max_run_seq, object_key, checksum_sha256, exported_at, state
      FROM ${quoteIdentifier(schema)}.run_event_archive_units
      WHERE archive_unit_key = $1
      LIMIT 1
    `,
    [archiveUnitKey]
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error(`ARCHIVE_UNIT_NOT_FOUND: ${archiveUnitKey}`);
  }
  return row;
}

async function requireArchiveBatch(
  client: PoolClient,
  schema: string,
  batchId: string,
  archiveUnitKey: string
): Promise<void> {
  const result = await client.query<{ batch_id: string }>(
    `
      SELECT batch_id
      FROM ${quoteIdentifier(schema)}.run_event_archive_batches
      WHERE batch_id = $1 AND archive_unit_key = $2
      LIMIT 1
    `,
    [batchId, archiveUnitKey]
  );
  if (!result.rows[0]) {
    throw new Error(`ARCHIVE_BATCH_NOT_FOUND: ${batchId}`);
  }
}

function parseTenantIds(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    throw new Error('ARCHIVE_UNIT_TENANT_IDS_INVALID');
  }
  const tenantIds = value.filter(
    (item): item is string => typeof item === 'string' && item.length > 0
  );
  if (tenantIds.length !== value.length) {
    throw new Error('ARCHIVE_UNIT_TENANT_IDS_INVALID');
  }
  return tenantIds;
}
