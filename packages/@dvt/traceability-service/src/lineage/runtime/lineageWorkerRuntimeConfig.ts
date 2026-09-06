/**
 * @file packages/@dvt/traceability-service/src/lineage/runtime/lineageWorkerRuntimeConfig.ts
 * @baseline ADR-0067: Canonical Artifact Authority and Compiled-Code Hard Cut
 * @baseline ADR-0033: Outbox Worker Sharding And Fencing Model
 * @decision Normalize lineage worker runtime options before polling, replay, or dead-letter processing starts
 * @consequence Worker behavior is bounded and explicit across local and CI runtime configurations
 * @version 0.1.0
 */
import type { ILineageOutboxStore } from '../contracts.js';
import type { LineageWorkerRuntimeOptions } from '../LineageWorkerRuntime.js';

const DEFAULT_OPTIONS = {
  batchSize: 50,
  pollIntervalMs: 5000,
  errorBackoffMs: 10000,
  deadLetterAlertThreshold: 0,
  autoReplayEnabled: false,
  autoReplayBatchSize: 25,
} as const;

export interface ResolvedLineageWorkerRuntimeOptions {
  batchSize: number;
  pollIntervalMs: number;
  errorBackoffMs: number;
  deadLetterTenantId: string | null;
  deadLetterAlertThreshold: number;
  autoReplayEnabled: boolean;
  autoReplayBatchSize: number;
}

export function resolveLineageWorkerRuntimeOptions(
  store: ILineageOutboxStore,
  options: LineageWorkerRuntimeOptions = {}
): ResolvedLineageWorkerRuntimeOptions {
  const resolved = {
    batchSize: options.batchSize ?? DEFAULT_OPTIONS.batchSize,
    pollIntervalMs: options.pollIntervalMs ?? DEFAULT_OPTIONS.pollIntervalMs,
    errorBackoffMs: options.errorBackoffMs ?? DEFAULT_OPTIONS.errorBackoffMs,
    deadLetterTenantId: normalizeOptionalScopeValue(options.deadLetterTenantId),
    deadLetterAlertThreshold: normalizeNonNegativeInteger(
      options.deadLetterAlertThreshold ?? DEFAULT_OPTIONS.deadLetterAlertThreshold,
      'deadLetterAlertThreshold'
    ),
    autoReplayEnabled: options.autoReplayEnabled ?? DEFAULT_OPTIONS.autoReplayEnabled,
    autoReplayBatchSize: normalizePositiveInteger(
      options.autoReplayBatchSize ?? DEFAULT_OPTIONS.autoReplayBatchSize,
      'autoReplayBatchSize'
    ),
  };

  if (resolved.autoReplayEnabled && resolved.deadLetterTenantId === null) {
    throw new Error('INVALID_LINEAGE_RUNTIME_CONFIG: deadLetterTenantId is required');
  }
  if (resolved.deadLetterAlertThreshold > 0 && resolved.deadLetterTenantId === null) {
    throw new Error(
      'INVALID_LINEAGE_RUNTIME_CONFIG: deadLetterTenantId is required for dead-letter alerts'
    );
  }
  if (resolved.deadLetterTenantId !== null && store.countDeadLetter === undefined) {
    throw new Error(
      'INVALID_LINEAGE_RUNTIME_CONFIG: store.countDeadLetter is required for dead-letter scope'
    );
  }
  if (resolved.autoReplayEnabled && store.replayDeadLetters === undefined) {
    throw new Error(
      'INVALID_LINEAGE_RUNTIME_CONFIG: store.replayDeadLetters is required for auto replay'
    );
  }

  return resolved;
}

function normalizeOptionalScopeValue(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function normalizePositiveInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`INVALID_LINEAGE_RUNTIME_CONFIG: ${fieldName}`);
  }
  return value;
}

function normalizeNonNegativeInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`INVALID_LINEAGE_RUNTIME_CONFIG: ${fieldName}`);
  }
  return value;
}
