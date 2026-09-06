/**
 * @file packages/@dvt/traceability-service/src/lineage/runtime/lineageWorkerRecordProcessor.ts
 * @baseline ADR-0067: Canonical Artifact Authority and Compiled-Code Hard Cut
 * @baseline ADR-0033: Outbox Worker Sharding And Fencing Model
 * @decision Process lineage outbox records through mapper, sink, delivered, failed, and dead-letter states
 * @consequence OpenLineage publication failures remain isolated from DVT event delivery and remain retryable
 * @version 0.1.0
 */
import type {
  ILineageOutboxStore,
  ILineageSink,
  ILineageStepEventMapper,
  LineageOutboxRecord,
} from '../contracts.js';
import { sanitizeLineageErrorForPersistence, toLineageErrorLike } from '../errorSupport.js';
import type { LineageWorkerRuntimeLogger } from '../LineageWorkerRuntime.js';

export type LineageRecordProcessingResult = 'delivered' | 'failed' | 'dead_lettered' | 'skipped';

export async function processLineageOutboxRecord(args: {
  record: LineageOutboxRecord;
  store: ILineageOutboxStore;
  sink: ILineageSink;
  mapper: ILineageStepEventMapper;
  logger: LineageWorkerRuntimeLogger;
}): Promise<LineageRecordProcessingResult> {
  const { logger, mapper, record, sink, store } = args;

  if (!mapper.supports(record.payload)) {
    await store.markDelivered([record.id]);
    return 'skipped';
  }

  try {
    const { jobFacets, warnings } = await mapper.map(record.payload);
    await sink.publish({
      runId: record.runId,
      eventType: record.eventType,
      jobFacets,
      warnings,
    });
    await store.markDelivered([record.id]);
    return 'delivered';
  } catch (err) {
    const error = sanitizeLineageErrorForPersistence(err);
    const disposition = await store.markFailed(record.id, error).catch((markErr: unknown) => {
      logger.error(
        { err: toLineageErrorLike(markErr), runId: record.runId, id: record.id },
        'lineage worker: markFailed write failed'
      );
      return 'not_found' as const;
    });

    if (disposition === 'dead_lettered') {
      logger.warn?.(
        {
          err: toLineageErrorLike(err),
          runId: record.runId,
          id: record.id,
          attempts: record.attempts + 1,
        },
        'lineage worker: max attempts reached, moved to dead letter'
      );
      return 'dead_lettered';
    }

    if (disposition === 'retry_scheduled') {
      logger.warn?.(
        {
          err: toLineageErrorLike(err),
          runId: record.runId,
          id: record.id,
          attempts: record.attempts + 1,
        },
        'lineage worker: publish failed, will retry'
      );
    } else {
      logger.warn?.(
        { err: toLineageErrorLike(err), runId: record.runId, id: record.id },
        'lineage worker: publish failed but record was not found during retry mark'
      );
    }

    return 'failed';
  }
}
