import {
  createNoopArchiveLifecycleTelemetry,
  toArchiveFailureMessage,
  type ArchiveLifecycleTelemetry,
  type IArchiveLeaseStore,
  type IRunArchiveDeleteStore,
  type RunArchiveDeletionPolicy,
} from './archiveRuntime.js';

export interface RunArchiveDeleterOptions {
  readonly store: IRunArchiveDeleteStore;
  readonly leaseStore: IArchiveLeaseStore;
  readonly telemetry?: ArchiveLifecycleTelemetry;
  readonly nowIso?: () => string;
}

export class RunArchiveDeleter {
  private readonly telemetry: ArchiveLifecycleTelemetry;
  private readonly nowIso: () => string;

  constructor(private readonly options: RunArchiveDeleterOptions) {
    this.telemetry = options.telemetry ?? createNoopArchiveLifecycleTelemetry();
    this.nowIso = options.nowIso ?? (() => new Date().toISOString());
  }

  /**
   * Phase 1 — find VERIFIED units past their grace period and transition them
   * to DELETE_ELIGIBLE. Safe to run concurrently; no lease required.
   */
  async markDeleteEligibleUnits(
    policy: RunArchiveDeletionPolicy
  ): Promise<readonly { archiveUnitKey: string; deleteAfterIso: string }[]> {
    validateDeletionPolicy(policy);
    const units = await this.options.store.markDeleteEligibleUnits(policy, this.nowIso());

    for (const unit of units) {
      this.telemetry.metrics.addCounter('dvt.archive.units_delete_eligible_total', 1);
      this.telemetry.logger.info(
        {
          archiveUnitKey: unit.archiveUnitKey,
          deleteAfterIso: unit.deleteAfterIso,
          rowCount: unit.rowCount,
        },
        'archive unit marked delete-eligible'
      );
    }

    return units.map((u) => ({
      archiveUnitKey: u.archiveUnitKey,
      deleteAfterIso: u.deleteAfterIso,
    }));
  }

  /**
   * Phase 2 — acquire a coordinator lease then drop hot data for each
   * DELETE_ELIGIBLE unit whose `delete_after` has passed. The lease is
   * re-asserted before each destructive DELETE so two workers can never race.
   */
  async dropEligibleUnits(
    policy: RunArchiveDeletionPolicy
  ): Promise<readonly { archiveUnitKey: string; dropped: boolean; rowsDeleted?: number }[]> {
    validateDeletionPolicy(policy);

    const lease = await this.options.leaseStore.tryAcquire(
      policy.workerId,
      policy.leaseTimeoutSeconds,
      this.nowIso()
    );

    if (!lease) {
      this.telemetry.logger.info(
        { workerId: policy.workerId },
        'archive deleter lease not acquired — another worker is active'
      );
      return [];
    }

    this.telemetry.logger.info(
      { workerId: lease.workerId, leaseToken: lease.leaseToken, expiresAt: lease.expiresAt },
      'archive deleter lease acquired'
    );

    const results: Array<{ archiveUnitKey: string; dropped: boolean; rowsDeleted?: number }> = [];

    try {
      const units = await this.options.store.listDueForDrop(policy, this.nowIso());

      for (const unit of units) {
        const startedAtMs = Date.now();

        try {
          // Assert lease is still held before each destructive operation
          await this.options.leaseStore.assertLeaseHeld(lease, this.nowIso());

          const batchId = `drop-${unit.archiveUnitKey}-${this.nowIso()}`;
          const droppedAtIso = this.nowIso();
          const { rowsDeleted } = await this.options.store.dropHotArchiveUnit(
            unit.archiveUnitKey,
            droppedAtIso
          );

          await this.options.store.markArchiveBatchDropped({
            batchId,
            archiveUnitKey: unit.archiveUnitKey,
            rowsDeleted,
            droppedAtIso,
          });

          this.telemetry.metrics.addCounter('dvt.archive.units_dropped_total', 1);
          this.telemetry.metrics.recordHistogram(
            'dvt.archive.drop_duration_ms',
            Date.now() - startedAtMs
          );
          this.telemetry.logger.info(
            { archiveUnitKey: unit.archiveUnitKey, rowsDeleted },
            'archive unit hot data dropped'
          );

          results.push({ archiveUnitKey: unit.archiveUnitKey, dropped: true, rowsDeleted });
        } catch (error) {
          this.telemetry.metrics.addCounter('dvt.archive.drop_failures_total', 1);
          this.telemetry.logger.error(
            {
              archiveUnitKey: unit.archiveUnitKey,
              err: error instanceof Error ? error.message : String(error),
            },
            'archive unit drop failed'
          );

          results.push({ archiveUnitKey: unit.archiveUnitKey, dropped: false });

          // If the lease was lost, abort remaining drops
          if (isLeaseLostError(error)) {
            break;
          }
        }
      }
    } finally {
      try {
        await this.options.leaseStore.release(lease);
      } catch {
        // best-effort release
      }
    }

    return results;
  }
}

function validateDeletionPolicy(policy: RunArchiveDeletionPolicy): void {
  if (!Number.isInteger(policy.deletionGraceDays) || policy.deletionGraceDays < 0) {
    throw new Error('ARCHIVE_DELETION_GRACE_DAYS_INVALID');
  }
  if (!Number.isInteger(policy.maxUnitsPerRun) || policy.maxUnitsPerRun <= 0) {
    throw new Error('ARCHIVE_MAX_UNITS_PER_RUN_INVALID');
  }
  if (!Number.isInteger(policy.leaseTimeoutSeconds) || policy.leaseTimeoutSeconds <= 0) {
    throw new Error('ARCHIVE_LEASE_TIMEOUT_INVALID');
  }
  if (!policy.workerId.trim()) {
    throw new Error('ARCHIVE_WORKER_ID_REQUIRED');
  }
}

function isLeaseLostError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('ARCHIVE_LEASE_LOST');
}

export { toArchiveFailureMessage };
