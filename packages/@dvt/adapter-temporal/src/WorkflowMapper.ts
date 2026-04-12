/**
 * @file packages/@dvt/adapter-temporal/src/WorkflowMapper.ts
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0001: Temporal Integration Test Policy (Build Preconditions + Lifecycle Discipline)
 * @decision Section 3 — Temporal runtime identifiers/status are mapped into canonical engine run references
 * @consequence Provider-specific runtime state stays aligned with normalized run status contracts
 * @version 1.0.0
 * @date 2026-02-21
 */
import { asNonBlankString } from '@dvt/contracts';
import type { EngineRunRef, ProviderRunStatusView, RunStatus } from '@dvt/contracts';

import type { TemporalAdapterConfig } from './config.js';

type TemporalRuntimeStatus =
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'TERMINATED'
  | 'TIMED_OUT'
  | 'CONTINUED_AS_NEW';

export function toTemporalWorkflowId(runId: string): string {
  if (!runId.trim()) {
    throw new Error('WORKFLOW_ID_INVALID: runId is required');
  }
  return runId;
}

export function toTemporalTaskQueue(tenantId: string, cfg: TemporalAdapterConfig): string {
  if (!tenantId.trim()) return cfg.taskQueue;
  return `${cfg.taskQueue}-${tenantId}`;
}

export function toTemporalRunRef(args: {
  tenantId: string;
  workflowId: string;
  runId: string;
  config: TemporalAdapterConfig;
  taskQueue?: string;
}): Extract<EngineRunRef, { provider: 'temporal' }> {
  return {
    provider: 'temporal',
    tenantId: asNonBlankString(args.tenantId),
    namespace: asNonBlankString(args.config.namespace),
    workflowId: asNonBlankString(args.workflowId),
    runId: asNonBlankString(args.runId),
    ...(args.taskQueue === undefined ? {} : { taskQueue: asNonBlankString(args.taskQueue) }),
  };
}

export function mapTemporalStatusToRunStatus(status: TemporalRuntimeStatus): RunStatus {
  switch (status) {
    case 'RUNNING':
      return 'RUNNING';
    case 'PAUSED':
      return 'PAUSED';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'FAILED':
    case 'TIMED_OUT':
      return 'FAILED';
    case 'CANCELLED':
    case 'TERMINATED':
      return 'CANCELLED';
    case 'CONTINUED_AS_NEW':
      return 'RUNNING';
    default: {
      const _never: never = status;
      throw new Error(`TEMPORAL_STATUS_UNKNOWN: ${String(_never)}`);
    }
  }
}

export function toProviderRunStatusView(args: {
  runtimeStatus: string;
  message?: string;
}): ProviderRunStatusView {
  return {
    provider: 'temporal',
    providerStatus: args.runtimeStatus,
    message: args.message,
  };
}

/**
 * Extracts the Temporal-native runtime status from a `handle.describe()` result.
 *
 * The Temporal SDK returns `{ status: { name: string } }` from
 * `WorkflowHandle.describe()`. This function validates the shape and maps it
 * to the adapter's provider-diagnostic status token.
 *
 * Known Temporal statuses remain covered by `TemporalRuntimeStatus` for
 * canonical mapping code paths. Unknown future provider tokens are preserved
 * verbatim here so enrichment stays diagnostic instead of failing closed.
 */
export function extractRuntimeStatusFromDescribe(describeResult: unknown): string {
  const result = describeResult as { status?: { name?: string } } | null | undefined;
  const statusName = result?.status?.name;
  if (typeof statusName !== 'string' || !statusName.trim()) {
    throw new Error('TEMPORAL_DESCRIBE_MISSING_STATUS: describe() result has no status.name');
  }
  return statusName;
}
