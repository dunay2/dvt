/**
 * Owned concern: compose outbox runtime, delivery, and retention telemetry for scraping.
 */
import type { OutboxRecord } from '@dvt/contracts';
import type {
  OutboxFailureDisposition,
  OutboxTickResult,
  OutboxWorkerObserver,
} from '@dvt/delivery';

import type {
  OutboxWorkerRuntimeHooks,
  OutboxWorkerRuntimeLogger,
} from '../runtime/OutboxWorkerRuntime.js';
import type { RunEventRetentionRuntimeHooks } from '../runtime/RunEventRetentionRuntime.js';

import type { HealthSnapshot } from './monitor/model.js';
import { OutboxDeliveryTelemetry } from './monitor/OutboxDeliveryTelemetry.js';
import { OutboxRuntimeHealthTracker } from './monitor/OutboxRuntimeHealthTracker.js';
import { renderOutboxWorkerMetrics } from './monitor/renderOutboxWorkerMetrics.js';
import { RunEventRetentionTelemetry } from './monitor/RunEventRetentionTelemetry.js';

export type { HealthSnapshot, OutboxRuntimeState } from './monitor/model.js';

interface OutboxWorkerMonitorOptions {
  serviceName: string;
  logger: OutboxWorkerRuntimeLogger;
  nowMs?: () => number;
  readyStaleAfterMs?: number;
}

export class OutboxWorkerMonitor
  implements OutboxWorkerObserver, OutboxWorkerRuntimeHooks, RunEventRetentionRuntimeHooks
{
  private readonly runtimeHealth: OutboxRuntimeHealthTracker;
  private readonly deliveryTelemetry: OutboxDeliveryTelemetry;
  private readonly retentionTelemetry: RunEventRetentionTelemetry;

  constructor(options: OutboxWorkerMonitorOptions) {
    const nowMs = options.nowMs ?? (() => Date.now());
    this.runtimeHealth = new OutboxRuntimeHealthTracker({
      serviceName: options.serviceName,
      logger: options.logger,
      nowMs,
      ...(options.readyStaleAfterMs === undefined
        ? {}
        : { readyStaleAfterMs: options.readyStaleAfterMs }),
    });
    this.deliveryTelemetry = new OutboxDeliveryTelemetry({
      logger: options.logger,
      nowMs,
    });
    this.retentionTelemetry = new RunEventRetentionTelemetry({ nowMs });
  }

  onStarted(): void {
    this.runtimeHealth.onStarted();
  }

  onOwnershipAcquired(): void {
    this.runtimeHealth.onOwnershipAcquired();
  }

  onOwnershipLost(error?: unknown): void {
    this.runtimeHealth.onOwnershipLost(error);
  }

  onTick(result: OutboxTickResult): void {
    this.deliveryTelemetry.onTick(result);
    this.runtimeHealth.onTick(result, this.deliveryTelemetry.consumePendingFailure());
  }

  onError(error: unknown): void {
    this.runtimeHealth.onRuntimeError(error);
  }

  onStopped(): void {
    this.deliveryTelemetry.clearClaims();
    this.runtimeHealth.onStopped();
  }

  onStopping(): void {
    this.runtimeHealth.onStopping();
  }

  enterPassiveMode(): void {
    this.runtimeHealth.enterPassiveMode();
  }

  onBatchClaimed(records: readonly OutboxRecord[]): void {
    this.deliveryTelemetry.onBatchClaimed(records);
  }

  onRecordDelivered(record: OutboxRecord): void {
    this.deliveryTelemetry.onRecordDelivered(record);
  }

  onRecordFailed(record: OutboxRecord, error: string, disposition: OutboxFailureDisposition): void {
    this.deliveryTelemetry.onRecordFailed(record, error, disposition);
  }

  onRunEventRetentionCycleSucceeded(details: { durationMs: number; archivedUnits: number }): void {
    this.retentionTelemetry.onCycleSucceeded(details);
  }

  onRunEventRetentionCycleFailed(details: { durationMs: number; error: unknown }): void {
    this.retentionTelemetry.onCycleFailed(details);
  }

  getHealthSnapshot(): HealthSnapshot {
    return this.runtimeHealth.getHealthSnapshot();
  }

  renderMetrics(): string {
    return renderOutboxWorkerMetrics({
      runtime: this.runtimeHealth.getMetricsSnapshot(),
      delivery: this.deliveryTelemetry.getMetricsSnapshot(),
      retention: this.retentionTelemetry.getMetricsSnapshot(),
    });
  }
}
