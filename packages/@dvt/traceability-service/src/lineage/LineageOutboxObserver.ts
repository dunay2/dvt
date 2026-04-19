import type { OutboxRecord } from '@dvt/contracts';
import type { OutboxWorkerObserver } from '@dvt/delivery';

import type { ILineageOutboxStore } from './contracts.js';
import { toLineageErrorLike } from './errorSupport.js';
import { LINEAGE_LOG_MESSAGE } from './logMessages.js';

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
          err: toLineageErrorLike(err),
          runId: record.payload.runId,
          eventType: record.payload.eventType,
        },
        LINEAGE_LOG_MESSAGE.OUTBOX_ENQUEUE_FAILED_FAIL_OPEN
      );
    });
  }
}
