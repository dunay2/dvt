/**
 * @file packages/@dvt/adapter-temporal/src/WorkflowMapper.ts
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0001: Temporal Integration Test Policy (Build Preconditions + Lifecycle Discipline)
 * @decision Section 3 — Temporal runtime identifiers/status are mapped into canonical engine run references
 * @consequence Provider-specific runtime state stays aligned with normalized run status contracts
 * @version 1.0.0
 * @date 2026-02-21
 */
import type { EngineRunRef, ProviderRunStatusView, RunStatus } from '@dvt/contracts';

import type { TemporalAdapterConfig } from './config.js';
import type { WorkflowState } from './workflows/RunPlanWorkflow.js';

type TemporalRuntimeStatus =
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'TERMINATED'
  | 'TIMED_OUT';

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
    tenantId: args.tenantId,
    namespace: args.config.namespace,
    workflowId: args.workflowId,
    runId: args.runId,
    taskQueue: args.taskQueue,
  };
}

export function mapTemporalStatusToRunStatus(status: TemporalRuntimeStatus): RunStatus {
  switch (status) {
    case 'RUNNING':
      return 'RUNNING';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'FAILED':
    case 'TIMED_OUT':
      return 'FAILED';
    case 'CANCELLED':
    case 'TERMINATED':
      return 'CANCELLED';
    default: {
      const _never: never = status;
      throw new Error(`TEMPORAL_STATUS_UNKNOWN: ${String(_never)}`);
    }
  }
}

export function toProviderRunStatusView(args: {
  runtimeStatus: TemporalRuntimeStatus;
  message?: string;
}): ProviderRunStatusView {
  return {
    provider: 'temporal',
    providerStatus: args.runtimeStatus,
    providerSubstatus: mapTemporalStatusToRunStatus(args.runtimeStatus),
    message: args.message,
  };
}

export function toProviderRunStatusViewFromWorkflowState(args: {
  state: WorkflowState;
}): ProviderRunStatusView {
  const message =
    args.state.status === 'CANCELLED' && args.state.cancelReason
      ? args.state.cancelReason
      : undefined;
  const providerSubstatus =
    args.state.cancelRequested && args.state.status === 'RUNNING'
      ? 'CANCELLING'
      : args.state.paused && args.state.status === 'RUNNING'
        ? 'PAUSED'
        : undefined;

  return {
    provider: 'temporal',
    providerStatus: args.state.status,
    ...(providerSubstatus === undefined ? {} : { providerSubstatus }),
    ...(message === undefined ? {} : { message }),
  };
}
