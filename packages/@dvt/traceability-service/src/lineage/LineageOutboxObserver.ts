/**
 * @file packages/@dvt/traceability-service/src/lineage/LineageOutboxObserver.ts
 * @baseline ADR-0004: Event Sourcing Strategy
 * @baseline ADR-0067: Canonical Artifact Authority and Compiled-Code Hard Cut
 * @baseline ADR-0033: Outbox Worker Sharding And Fencing Model
 * @decision Observe delivered StepStarted outbox records and enqueue lineage work fail-open
 * @consequence Domain delivery remains authoritative while traceability processing can lag or fail independently
 * @version 0.1.0
 */
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
