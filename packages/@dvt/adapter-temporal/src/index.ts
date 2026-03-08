/**
 * @file packages/@dvt/adapter-temporal/src/index.ts
 * @baseline ADR-0001: Temporal Integration Test Policy (Build Preconditions + Lifecycle Discipline)
 * @baseline ADR-0003: Execution Model
 * @decision Section 3 — Expose a stable adapter boundary for client/worker/workflow mapping components
 * @consequence Temporal adapter capabilities are consumed through a deterministic public module surface
 * @version 1.0.0
 * @date 2026-02-21
 */

export { ADAPTER_SUPPORTED_SCHEMA } from './versioning.js';
export type { TemporalAdapterConfig } from './config.js';
export { loadTemporalAdapterConfig, validateTemporalAdapterConfig } from './config.js';

export type { TemporalClientHandle } from './TemporalClient.js';
export { TemporalClientManager } from './TemporalClient.js';

export type { TemporalAdapterDeps } from './TemporalAdapter.js';
export { TemporalAdapter } from './TemporalAdapter.js';
export type { ObservedTemporalAdapterDeps } from './ObservedTemporalAdapter.js';
export { ObservedTemporalAdapter } from './ObservedTemporalAdapter.js';

export {
  mapTemporalStatusToRunStatus,
  toRunStatusSnapshot,
  toTemporalRunRef,
  toTemporalTaskQueue,
  toTemporalWorkflowId,
} from './WorkflowMapper.js';

// PR-2: WorkerHost
export type { TemporalWorkerHostConfig } from './TemporalWorkerHost.js';
export { TemporalWorkerHost } from './TemporalWorkerHost.js';

// PR-2: Activities
export type {
  ActivityDeps,
  Activities,
  EmitEventInput,
  StepInput,
  StepResult,
} from './activities/stepActivities.js';
export { createActivities } from './activities/stepActivities.js';

// PR-2: Workflow types (workflow function itself is loaded by Worker bundler)
export type {
  RunPlanWorkflowInput,
  RunPlanWorkflowResult,
  WorkflowState,
} from './workflows/RunPlanWorkflow.js';
