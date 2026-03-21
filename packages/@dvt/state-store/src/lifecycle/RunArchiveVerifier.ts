import {
  createNoopArchiveLifecycleTelemetry,
  toArchiveFailureMessage,
  type ArchiveLifecycleTelemetry,
  type IRunArchiveExporter,
  type IRunArchiveStore,
} from './archiveRuntime.js';

export interface RunArchiveVerifierOptions {
  readonly store: IRunArchiveStore;
  readonly exporter: IRunArchiveExporter;
  readonly telemetry?: ArchiveLifecycleTelemetry;
  readonly nowIso?: () => string;
}

export class RunArchiveVerifier {
  private readonly telemetry: ArchiveLifecycleTelemetry;
  private readonly nowIso: () => string;

  constructor(private readonly options: RunArchiveVerifierOptions) {
    this.telemetry = options.telemetry ?? createNoopArchiveLifecycleTelemetry();
    this.nowIso = options.nowIso ?? (() => new Date().toISOString());
  }

  async verifyExportedArchiveUnits(
    limit = 100
  ): Promise<readonly { archiveUnitKey: string; batchId: string; verified: boolean }[]> {
    const units = await this.options.store.listArchiveUnitsPendingVerification(limit);
    const results: Array<{ archiveUnitKey: string; batchId: string; verified: boolean }> = [];

    for (const unit of units) {
      try {
        await this.options.exporter.verifyArchiveUnit({
          archiveUnitKey: unit.archiveUnitKey,
          tenantBucket: unit.tenantBucket,
          expectedRowCount: unit.rowCount,
          expectedChecksumSha256: unit.checksumSha256,
          objectKey: unit.objectKey,
        });

        const verifiedAtIso = this.nowIso();
        await this.options.store.markArchiveBatchVerified({
          batchId: unit.batchId,
          archiveUnitKey: unit.archiveUnitKey,
          verifiedAtIso,
        });

        this.telemetry.metrics.addCounter('dvt.archive.units_verified_total', 1);
        this.telemetry.logger.info(
          {
            archiveUnitKey: unit.archiveUnitKey,
            batchId: unit.batchId,
          },
          'archive unit verified'
        );
        results.push({
          archiveUnitKey: unit.archiveUnitKey,
          batchId: unit.batchId,
          verified: true,
        });
      } catch (error) {
        await this.options.store.markArchiveBatchVerifyFailed({
          batchId: unit.batchId,
          archiveUnitKey: unit.archiveUnitKey,
          failedAtIso: this.nowIso(),
          error: toArchiveFailureMessage(error),
        });
        this.telemetry.metrics.addCounter('dvt.archive.verify_failures_total', 1);
        this.telemetry.logger.error(
          {
            archiveUnitKey: unit.archiveUnitKey,
            batchId: unit.batchId,
            err: error instanceof Error ? error.message : String(error),
          },
          'archive unit verification failed'
        );
        results.push({
          archiveUnitKey: unit.archiveUnitKey,
          batchId: unit.batchId,
          verified: false,
        });
      }
    }

    return results;
  }
}
