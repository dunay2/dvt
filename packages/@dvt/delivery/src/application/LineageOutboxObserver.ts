import type { ILineageOutboxStore } from '@dvt/contracts';
import type { OutboxRecord, OutboxWorkerObserver } from '@dvt/contracts';

export interface LineageOutboxObserverLogger {
  warn?(data: Record<string, unknown>, msg?: string): void;
}

/**
 * OutboxWorkerObserver that enqueues StepStarted events to the lineage outbox
 * when the domain outbox delivers them.
 *
 * Fail-soft: enqueue failures are logged as warnings and do NOT block domain
 * delivery (fail-open per G10 design).
 */
export class LineageOutboxObserver implements OutboxWorkerObserver {
  constructor(
    private readonly lineageStore: ILineageOutboxStore,
    private readonly logger: LineageOutboxObserverLogger = {}
  ) {}

  async onRecordDelivered(record: OutboxRecord): Promise<void> {
    if (record.payload.eventType !== 'StepStarted') return;

    await this.lineageStore.enqueue(record.payload.runId, record.payload).catch((err: unknown) => {
      this.logger.warn?.(
        {
          err: toErrorLike(err),
          runId: record.payload.runId,
          eventType: record.payload.eventType,
        },
        'lineage outbox enqueue failed — lineage event skipped (fail-open)'
      );
    });
  }
}

function toErrorLike(error: unknown): { message: string; name: string } {
  if (error instanceof Error) {
    return { message: error.message, name: error.name };
  }
  return { message: String(error), name: 'UnknownError' };
}
