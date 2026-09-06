/**
 * @file packages/@dvt/traceability-service/src/lineage/runtime/lineageWorkerTick.ts
 * @baseline ADR-0067: Canonical Artifact Authority and Compiled-Code Hard Cut
 * @baseline ADR-0033: Outbox Worker Sharding And Fencing Model
 * @decision Coordinate one lineage worker tick without owning lifecycle mechanics
 * @consequence Tick processing, dead-letter recovery, lag reporting, and summary logging can evolve without bloating the public runtime facade
 * @version 0.1.0
 */
import type { ILineageOutboxStore, ILineageSink, ILineageStepEventMapper } from '../contracts.js';
import type { LineageTickResult, LineageWorkerRuntimeLogger } from '../LineageWorkerRuntime.js';

import {
  collectLineageDeadLetterCount,
  maybeAlertLineageDeadLetterBacklog,
  runLineageDeadLetterAutoReplay,
} from './lineageWorkerDeadLetterSupport.js';
import { processLineageOutboxRecord } from './lineageWorkerRecordProcessor.js';

export interface LineageWorkerTickOutcome {
  result: LineageTickResult;
  deadLetterCount: number | null;
}

export interface RunLineageWorkerTickArgs {
  autoReplayBatchSize: number;
  autoReplayEnabled: boolean;
  batchSize: number;
  deadLetterAlertThreshold: number;
  deadLetterTenantId: string | null;
  logger: LineageWorkerRuntimeLogger;
  mapper: ILineageStepEventMapper;
  onDeadLetterCountObserved?: (count: number | null) => void;
  onLagObserved?: (lag: number) => void;
  sink: ILineageSink;
  store: ILineageOutboxStore;
}

export async function runLineageWorkerTick(
  args: RunLineageWorkerTickArgs
): Promise<LineageWorkerTickOutcome> {
  const { batchSize, logger, mapper, sink, store } = args;
  const pending = await store.listPending(batchSize);
  const lag = store.countPending === undefined ? pending.length : await store.countPending();
  args.onLagObserved?.(lag);
  let processed = 0;
  let deadLettered = 0;

  for (const record of pending) {
    const result = await processLineageOutboxRecord({
      record,
      store,
      sink,
      mapper,
      logger,
    });
    if (result === 'delivered') processed++;
    if (result === 'dead_lettered') deadLettered++;
  }

  const deadLetterCount = await collectLineageDeadLetterCount({
    deadLetterTenantId: args.deadLetterTenantId,
    logger,
    store,
  });
  args.onDeadLetterCountObserved?.(deadLetterCount);
  await runLineageDeadLetterAutoReplay({
    autoReplayBatchSize: args.autoReplayBatchSize,
    autoReplayEnabled: args.autoReplayEnabled,
    deadLetterCount,
    deadLetterTenantId: args.deadLetterTenantId,
    logger,
    store,
  });
  maybeAlertLineageDeadLetterBacklog({
    deadLetterAlertThreshold: args.deadLetterAlertThreshold,
    deadLetterCount,
    deadLetterTenantId: args.deadLetterTenantId,
    logger,
  });

  logger.info(
    {
      lag,
      deadLetterLag: deadLetterCount,
      deadLetterLagKnown: deadLetterCount !== null,
      processed,
      deadLettered,
      batchSize,
    },
    'lineage worker tick'
  );

  return {
    deadLetterCount,
    result: { processed, deadLettered, lag },
  };
}
