import { buildArchivedTerminalSnapshot, buildPinnedTerminalSnapshot } from './archiveArtifacts.js';
import {
  buildArchivedSnapshotsForUnit,
  createNoopArchiveLifecycleTelemetry,
  toArchiveFailureMessage,
  type ArchiveLifecycleTelemetry,
  type IRunArchiveExporter,
  type IRunArchiveStore,
  type RunEventRetentionPolicy,
} from './archiveRuntime.js';

export interface RunArchiveCoordinatorOptions {
  readonly store: IRunArchiveStore;
  readonly exporter: IRunArchiveExporter;
  readonly telemetry?: ArchiveLifecycleTelemetry;
  readonly nowIso?: () => string;
}

export class RunArchiveCoordinator {
  private readonly telemetry: ArchiveLifecycleTelemetry;
  private readonly nowIso: () => string;

  constructor(private readonly options: RunArchiveCoordinatorOptions) {
    this.telemetry = options.telemetry ?? createNoopArchiveLifecycleTelemetry();
    this.nowIso = options.nowIso ?? (() => new Date().toISOString());
  }

  async archiveEligibleHotData(
    policy: RunEventRetentionPolicy
  ): Promise<readonly { archiveUnitKey: string; batchId: string; exported: boolean }[]> {
    const units = await this.options.store.listEligibleArchiveUnits(policy, this.nowIso());
    const results: Array<{ archiveUnitKey: string; batchId: string; exported: boolean }> = [];

    for (const unit of units) {
      this.telemetry.metrics.addCounter('dvt.archive.units_eligible_total', 1);
      this.telemetry.logger.info(
        {
          archiveUnitKey: unit.archiveUnitKey,
          tenantBucket: unit.tenantBucket,
          tenantCount: unit.tenantIds.length,
          rowCount: unit.rowCount,
        },
        'archive unit eligible'
      );

      const batch = await this.options.store.startArchiveBatch(unit.archiveUnitKey, this.nowIso());
      const startedAtMs = Date.now();

      try {
        const exportedAtIso = this.nowIso();
        const events = await this.options.store.loadArchiveUnitEvents(unit.archiveUnitKey);
        const exportResult = await this.options.exporter.exportArchiveUnit({
          archiveUnitKey: unit.archiveUnitKey,
          tenantBucket: unit.tenantBucket,
          exportedAtIso,
          events,
        });

        if (policy.pinTerminalSnapshots) {
          const snapshots = await this.options.store.listTerminalSnapshotsForArchiveUnit(
            unit.archiveUnitKey
          );
          const archivedSnapshots = buildArchivedSnapshotsForUnit({
            archiveUnitKey: unit.archiveUnitKey,
            archivedAtIso: exportResult.exportedAtIso,
            snapshotCandidates: snapshots,
            events,
            buildPinnedTerminalSnapshot,
            buildArchivedTerminalSnapshot,
          });

          for (const snapshot of archivedSnapshots) {
            const pinResult = await this.options.store.pinTerminalSnapshot(snapshot);
            if (pinResult.outcome === 'DISCARDED_STALE_SEQUENCE') {
              this.telemetry.metrics.addCounter('dvt.archive.terminal_snapshot_discarded_total', 1);
              this.telemetry.logger.warn?.(
                {
                  archiveUnitKey: pinResult.archiveUnitKey,
                  runId: pinResult.runId,
                  tenantId: pinResult.tenantId,
                  incomingLastRunSeq: pinResult.incomingLastRunSeq,
                  storedLastRunSeq: pinResult.storedLastRunSeq,
                },
                'archive terminal snapshot discarded'
              );
            }
          }
        }

        await this.options.store.markArchiveBatchExported({
          batchId: batch.batchId,
          archiveUnitKey: unit.archiveUnitKey,
          tenantBucket: exportResult.tenantBucket,
          tenantIds: exportResult.tenantIds,
          rowCount: exportResult.rowCount,
          minRunSeq: exportResult.minRunSeq,
          maxRunSeq: exportResult.maxRunSeq,
          objectKey: exportResult.objectKey,
          checksumSha256: exportResult.checksumSha256,
          exportedAtIso: exportResult.exportedAtIso,
        });

        this.telemetry.metrics.addCounter('dvt.archive.units_exported_total', 1);
        this.telemetry.metrics.recordHistogram(
          'dvt.archive.export_duration_ms',
          Date.now() - startedAtMs
        );
        this.telemetry.logger.info(
          {
            archiveUnitKey: unit.archiveUnitKey,
            batchId: batch.batchId,
            objectKey: exportResult.objectKey,
            rowCount: exportResult.rowCount,
          },
          'archive unit exported'
        );
        results.push({
          archiveUnitKey: unit.archiveUnitKey,
          batchId: batch.batchId,
          exported: true,
        });
      } catch (error) {
        await this.options.store.markArchiveBatchFailed({
          batchId: batch.batchId,
          archiveUnitKey: unit.archiveUnitKey,
          failedAtIso: this.nowIso(),
          error: toArchiveFailureMessage(error),
        });
        this.telemetry.metrics.addCounter('dvt.archive.export_failures_total', 1);
        this.telemetry.metrics.recordHistogram(
          'dvt.archive.export_duration_ms',
          Date.now() - startedAtMs
        );
        this.telemetry.logger.error(
          {
            archiveUnitKey: unit.archiveUnitKey,
            batchId: batch.batchId,
            err: error instanceof Error ? error.message : String(error),
          },
          'archive unit export failed'
        );
        results.push({
          archiveUnitKey: unit.archiveUnitKey,
          batchId: batch.batchId,
          exported: false,
        });
      }
    }

    return results;
  }
}
