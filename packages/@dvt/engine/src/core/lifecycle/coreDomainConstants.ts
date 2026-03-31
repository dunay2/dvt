import type { EventType, SignalRequest } from '@dvt/contracts';

export const CORE_TIMEOUT_MS = {
  adapterCall: 30_000,
} as const;

export const CORE_ERROR_MESSAGE = {
  timeout: (operation: string, timeoutMs: number) => `${operation} timed out after ${timeoutMs}ms`,
} as const;

export const CORE_OPERATION = {
  cancelRun: 'cancelRun',
  getRunStatus: 'getRunStatus',
  enrichRunStatus: 'enrichRunStatus',
  signal: 'signal',
} as const;

export const CORE_SPAN = {
  cancelRun: 'engine.cancelRun',
  getRunStatus: 'engine.getRunStatus',
  enrichRunStatus: 'engine.enrichRunStatus',
  signal: 'engine.signal',
} as const;

export const CORE_TIMEOUT_OPERATION = {
  adapterCancelRun: 'adapter.cancelRun',
  adapterGetRunStatus: 'adapter.getRunStatus',
  adapterSignal: 'adapter.signal',
} as const;

export const CORE_METRIC = {
  cancelRequestedTotal: 'dvt.run.cancel_requested_total',
  cancelDurationMs: 'dvt.run.cancel.duration_ms',
  statusDurationMs: 'dvt.run.status.duration_ms',
} as const;

export const CORE_LOG_MESSAGE = {
  cancellingRun: 'Cancelling run',
} as const;

export const RUN_EVENT_CONSTANTS = {
  payloadVersion: 1,
  engineAttemptId: 1,
} as const;

export const TRACEABLE_ADAPTERS = ['temporal', 'conductor'] as const;

export type TraceableAdapter = (typeof TRACEABLE_ADAPTERS)[number];

export const SIGNAL_TO_EVENT_TYPE: Partial<Record<SignalRequest['type'], EventType>> = {
  PAUSE: 'RunPaused',
  RESUME: 'RunResumed',
};

export const NOT_IMPLEMENTED_SIGNAL_TYPES: ReadonlySet<SignalRequest['type']> = new Set([
  'RETRY_STEP',
  'RETRY_RUN',
]);
