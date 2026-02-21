import type { EngineRunRef, RunStatus, RunStatusSnapshot } from '@dvt/contracts';

import type { TemporalAdapterConfig } from './config.js';

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
  workflowId: string;
  runId: string;
  config: TemporalAdapterConfig;
  taskQueue?: string;
}): Extract<EngineRunRef, { provider: 'temporal' }> {
  return {
    provider: 'temporal',
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

export function toRunStatusSnapshot(args: {
  runId: string;
  runtimeStatus: TemporalRuntimeStatus;
  message?: string;
}): RunStatusSnapshot {
  return {
    runId: args.runId,
    status: mapTemporalStatusToRunStatus(args.runtimeStatus),
    message: args.message,
  };
}
