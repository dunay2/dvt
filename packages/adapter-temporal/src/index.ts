export type { TemporalAdapterConfig } from './config.js';
export { loadTemporalAdapterConfig, validateTemporalAdapterConfig } from './config.js';

export type { TemporalClientHandle } from './TemporalClient.js';
export { TemporalClientManager } from './TemporalClient.js';

export type { TemporalAdapterDeps } from './TemporalAdapter.js';
export { TemporalAdapter } from './TemporalAdapter.js';

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
