import type { OutboxRetentionMetricsSnapshot } from './model.js';

interface RunEventRetentionTelemetryOptions {
  nowMs?: () => number;
  purgeConfigured?: boolean;
  retentionConfigured?: boolean;
  filesystemArchiveStorageConfigured?: boolean;
}

export class RunEventRetentionTelemetry {
  private readonly nowMs: () => number;
  private readonly purgeConfigured: boolean;
  private readonly retentionConfigured: boolean;
  private readonly filesystemArchiveStorageConfigured: boolean;

  private retentionCyclesTotal = 0;
  private retentionCycleFailuresTotal = 0;
  private retentionArchivedUnitsTotal = 0;
  private retentionLastCycleDurationMs = 0;
  private retentionLastSuccessAtMs: number | null = null;
  private retentionLastFailureAtMs: number | null = null;

  constructor(options: RunEventRetentionTelemetryOptions = {}) {
    this.nowMs = options.nowMs ?? (() => Date.now());
    this.purgeConfigured = options.purgeConfigured ?? false;
    this.retentionConfigured = options.retentionConfigured ?? false;
    this.filesystemArchiveStorageConfigured = options.filesystemArchiveStorageConfigured ?? false;
  }

  onCycleSucceeded(details: { durationMs: number; archivedUnits: number }): void {
    this.retentionCyclesTotal += 1;
    this.retentionArchivedUnitsTotal += details.archivedUnits;
    this.retentionLastCycleDurationMs = Math.max(0, details.durationMs);
    this.retentionLastSuccessAtMs = this.nowMs();
  }

  onCycleFailed(details: { durationMs: number; error: unknown }): void {
    this.retentionCyclesTotal += 1;
    this.retentionCycleFailuresTotal += 1;
    this.retentionLastCycleDurationMs = Math.max(0, details.durationMs);
    this.retentionLastFailureAtMs = this.nowMs();
    void details.error;
  }

  getMetricsSnapshot(): OutboxRetentionMetricsSnapshot {
    return {
      purgeConfigured: this.purgeConfigured,
      retentionConfigured: this.retentionConfigured,
      filesystemArchiveStorageConfigured: this.filesystemArchiveStorageConfigured,
      retentionCyclesTotal: this.retentionCyclesTotal,
      retentionCycleFailuresTotal: this.retentionCycleFailuresTotal,
      retentionArchivedUnitsTotal: this.retentionArchivedUnitsTotal,
      retentionLastCycleDurationMs: this.retentionLastCycleDurationMs,
      retentionLastSuccessAtMs: this.retentionLastSuccessAtMs,
      retentionLastFailureAtMs: this.retentionLastFailureAtMs,
    };
  }
}
