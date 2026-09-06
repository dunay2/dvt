/**
 * @file packages/@dvt/traceability-service/src/lineage/LineageWorkerRuntime.ts
 * @baseline ADR-0067: Canonical Artifact Authority and Compiled-Code Hard Cut
 * @baseline ADR-0033: Outbox Worker Sharding And Fencing Model
 * @decision Run lineage outbox polling, delivery, dead-letter, and replay loops outside domain outbox authority
 * @consequence OpenLineage publication can be retried and monitored without blocking DVT run lifecycle events
 * @version 0.1.0
 */
import type { ILineageOutboxStore, ILineageSink, ILineageStepEventMapper } from './contracts.js';
import { LineageWorkerLoopController } from './runtime/LineageWorkerLoopController.js';
import { resolveLineageWorkerRuntimeOptions } from './runtime/lineageWorkerRuntimeConfig.js';
import { runLineageWorkerTick } from './runtime/lineageWorkerTick.js';

export interface LineageWorkerRuntimeLogger {
  info(data: Record<string, unknown>, msg?: string): void;
  warn?(data: Record<string, unknown>, msg?: string): void;
  error(data: Record<string, unknown>, msg?: string): void;
}

export interface LineageWorkerRuntimeOptions {
  batchSize?: number;
  pollIntervalMs?: number;
  errorBackoffMs?: number;
  deadLetterTenantId?: string;
  deadLetterAlertThreshold?: number;
  autoReplayEnabled?: boolean;
  autoReplayBatchSize?: number;
}

export interface LineageTickResult {
  processed: number;
  deadLettered: number;
  lag: number;
}

export class LineageWorkerRuntime {
  private readonly batchSize: number;
  private readonly pollIntervalMs: number;
  private readonly errorBackoffMs: number;
  private readonly deadLetterTenantId: string | null;
  private readonly deadLetterAlertThreshold: number;
  private readonly autoReplayEnabled: boolean;
  private readonly autoReplayBatchSize: number;
  private readonly loopController: LineageWorkerLoopController;
  private _lagCount = 0;
  private _deadLetterCount: number | null = null;

  constructor(
    private readonly store: ILineageOutboxStore,
    private readonly sink: ILineageSink,
    private readonly mapper: ILineageStepEventMapper,
    private readonly logger: LineageWorkerRuntimeLogger,
    options: LineageWorkerRuntimeOptions = {}
  ) {
    const resolvedOptions = resolveLineageWorkerRuntimeOptions(this.store, options);

    this.batchSize = resolvedOptions.batchSize;
    this.pollIntervalMs = resolvedOptions.pollIntervalMs;
    this.errorBackoffMs = resolvedOptions.errorBackoffMs;
    this.deadLetterTenantId = resolvedOptions.deadLetterTenantId;
    this.deadLetterAlertThreshold = resolvedOptions.deadLetterAlertThreshold;
    this.autoReplayEnabled = resolvedOptions.autoReplayEnabled;
    this.autoReplayBatchSize = resolvedOptions.autoReplayBatchSize;
    this.loopController = new LineageWorkerLoopController({
      batchSize: this.batchSize,
      pollIntervalMs: this.pollIntervalMs,
      errorBackoffMs: this.errorBackoffMs,
      logger: this.logger,
      runTick: () => this.runOnce(),
    });
  }

  get lagCount(): number {
    return this._lagCount;
  }

  get deadLetterCount(): number | null {
    return this._deadLetterCount;
  }

  start(signal?: globalThis.AbortSignal): Promise<void> {
    return this.loopController.start(signal);
  }

  async stop(): Promise<void> {
    await this.loopController.stop();
  }

  async runOnce(): Promise<LineageTickResult> {
    const outcome = await runLineageWorkerTick({
      autoReplayBatchSize: this.autoReplayBatchSize,
      autoReplayEnabled: this.autoReplayEnabled,
      batchSize: this.batchSize,
      deadLetterAlertThreshold: this.deadLetterAlertThreshold,
      deadLetterTenantId: this.deadLetterTenantId,
      logger: this.logger,
      mapper: this.mapper,
      onDeadLetterCountObserved: (count) => {
        this._deadLetterCount = count;
      },
      onLagObserved: (lag) => {
        this._lagCount = lag;
      },
      sink: this.sink,
      store: this.store,
    });

    this._lagCount = outcome.result.lag;
    this._deadLetterCount = outcome.deadLetterCount;
    return outcome.result;
  }
}
