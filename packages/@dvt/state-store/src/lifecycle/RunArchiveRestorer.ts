import type { EventEnvelope } from '@dvt/contracts';

import {
  createNoopArchiveLifecycleTelemetry,
  toArchiveFailureMessage,
  type ArchiveLifecycleTelemetry,
  type ArchiveRestoreResult,
  type ArchiveRunRestoreRequest,
  type ArchiveUnitRestoreRequest,
  type IArchiveObjectStore,
  type IRunArchiveRestoreStore,
} from './archiveRuntime.js';

export interface RunArchiveRestorerOptions {
  readonly store: IRunArchiveRestoreStore;
  readonly objectStore: IArchiveObjectStore;
  readonly telemetry?: ArchiveLifecycleTelemetry;
  readonly nowIso?: () => string;
}

export class RunArchiveRestorer {
  private readonly telemetry: ArchiveLifecycleTelemetry;
  private readonly nowIso: () => string;

  constructor(private readonly options: RunArchiveRestorerOptions) {
    this.telemetry = options.telemetry ?? createNoopArchiveLifecycleTelemetry();
    this.nowIso = options.nowIso ?? (() => new Date().toISOString());
  }

  /**
   * Restore a single run's events from cold storage into `targetSchema`.
   * Reads the archive unit's NDJSON file and filters for the requested runId.
   */
  async restoreRun(request: ArchiveRunRestoreRequest): Promise<ArchiveRestoreResult> {
    await this.options.store.startRestoreLog({
      restoreId: request.restoreId,
      archiveUnitKey: request.archiveUnitKey,
      runId: request.runId,
      targetSchema: request.targetSchema,
      requesterId: request.requesterId,
      reason: request.reason,
      startedAt: request.startedAtIso,
    });

    this.telemetry.logger.info(
      {
        restoreId: request.restoreId,
        runId: request.runId,
        archiveUnitKey: request.archiveUnitKey,
        targetSchema: request.targetSchema,
        requesterId: request.requesterId,
      },
      'archive run restore started'
    );

    try {
      const allEvents = await readEventsFromObjectStore(
        this.options.objectStore,
        request.objectKey
      );
      const runEvents = allEvents.filter((e) => e.runId === request.runId);

      if (runEvents.length === 0) {
        throw new Error(`ARCHIVE_RESTORE_RUN_NOT_FOUND: ${request.runId}`);
      }

      const rowsRestored = await this.options.store.writeRestoredEvents(
        runEvents,
        request.targetSchema
      );
      const completedAtIso = this.nowIso();

      await this.options.store.markRestoreCompleted(
        request.restoreId,
        rowsRestored,
        completedAtIso
      );

      this.telemetry.metrics.addCounter('dvt.archive.restore_completed_total', 1);
      this.telemetry.logger.info(
        { restoreId: request.restoreId, runId: request.runId, rowsRestored },
        'archive run restore completed'
      );

      return {
        restoreId: request.restoreId,
        rowsRestored,
        targetSchema: request.targetSchema,
        completedAtIso,
      };
    } catch (error) {
      const failedAtIso = this.nowIso();
      await this.options.store.markRestoreFailed(
        request.restoreId,
        toArchiveFailureMessage(error),
        failedAtIso
      );
      this.telemetry.metrics.addCounter('dvt.archive.restore_failed_total', 1);
      this.telemetry.logger.error(
        {
          restoreId: request.restoreId,
          runId: request.runId,
          err: error instanceof Error ? error.message : String(error),
        },
        'archive run restore failed'
      );
      throw error;
    }
  }

  /**
   * Restore all events in an archive unit from cold storage into `targetSchema`.
   */
  async restoreArchiveUnit(request: ArchiveUnitRestoreRequest): Promise<ArchiveRestoreResult> {
    await this.options.store.startRestoreLog({
      restoreId: request.restoreId,
      archiveUnitKey: request.archiveUnitKey,
      runId: null,
      targetSchema: request.targetSchema,
      requesterId: request.requesterId,
      reason: request.reason,
      startedAt: request.startedAtIso,
    });

    this.telemetry.logger.info(
      {
        restoreId: request.restoreId,
        archiveUnitKey: request.archiveUnitKey,
        targetSchema: request.targetSchema,
        requesterId: request.requesterId,
      },
      'archive unit restore started'
    );

    try {
      const events = await readEventsFromObjectStore(this.options.objectStore, request.objectKey);

      if (events.length === 0) {
        throw new Error(`ARCHIVE_RESTORE_UNIT_EMPTY: ${request.archiveUnitKey}`);
      }

      const rowsRestored = await this.options.store.writeRestoredEvents(
        events,
        request.targetSchema
      );
      const completedAtIso = this.nowIso();

      await this.options.store.markRestoreCompleted(
        request.restoreId,
        rowsRestored,
        completedAtIso
      );

      this.telemetry.metrics.addCounter('dvt.archive.restore_completed_total', 1);
      this.telemetry.logger.info(
        { restoreId: request.restoreId, archiveUnitKey: request.archiveUnitKey, rowsRestored },
        'archive unit restore completed'
      );

      return {
        restoreId: request.restoreId,
        rowsRestored,
        targetSchema: request.targetSchema,
        completedAtIso,
      };
    } catch (error) {
      const failedAtIso = this.nowIso();
      await this.options.store.markRestoreFailed(
        request.restoreId,
        toArchiveFailureMessage(error),
        failedAtIso
      );
      this.telemetry.metrics.addCounter('dvt.archive.restore_failed_total', 1);
      this.telemetry.logger.error(
        {
          restoreId: request.restoreId,
          archiveUnitKey: request.archiveUnitKey,
          err: error instanceof Error ? error.message : String(error),
        },
        'archive unit restore failed'
      );
      throw error;
    }
  }
}

async function readEventsFromObjectStore(
  objectStore: IArchiveObjectStore,
  objectKey: string
): Promise<readonly EventEnvelope[]> {
  const buffer = await objectStore.readObject(objectKey);
  const lines = buffer
    .toString('utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error('ARCHIVE_EVENTS_REQUIRED');
  }

  return lines.map((line) => JSON.parse(line) as EventEnvelope);
}
