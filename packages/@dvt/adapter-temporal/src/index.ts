/**
 * @file packages/@dvt/adapter-temporal/src/index.ts
 * @ownedConcern Publish the Temporal adapter and worker plugin public module surface
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
  extractRuntimeStatusFromDescribe,
  mapTemporalStatusToRunStatus,
  toProviderRunStatusView,
  toTemporalRunRef,
  toTemporalTaskQueue,
  toTemporalWorkflowId,
} from './WorkflowMapper.js';

// PR-2: WorkerHost
export type { TemporalWorkerHostConfig } from './TemporalWorkerHost.js';
export { TemporalWorkerHost } from './TemporalWorkerHost.js';
export type {
  TemporalActivityTimeoutConfig,
  TemporalWorkerConcurrencyConfig,
} from './TemporalPolicyMapper.js';
export { TemporalPolicyMapper } from './TemporalPolicyMapper.js';

// PR-2: Activities
export type {
  ActivityDeps,
  Activities,
  EmitEventInput,
  StepActivity,
  StepActivityRegistry,
  StepExecutor,
  StepInput,
  StepResult,
} from './activities/stepActivities.js';
export {
  createActivities,
  createDefaultStepActivityRegistry,
  DEFAULT_STEP_ACTIVITY_REGISTRY,
  StepActivityDispatcher,
  UnsupportedStepKindError,
} from './activities/stepActivities.js';
export type { TemporalStepPluginProfile } from './plugins/TemporalStepPluginProfile.js';
export { composeTemporalStepPluginRegistries } from './plugins/TemporalStepPluginProfile.js';
export type {
  DbtPluginExecutionInput,
  DbtPluginRunner,
  DbtStepActivityDeps,
} from './plugins/dbt/dbtPluginTypes.js';
export { DbtStepActivity, createDbtStepActivityRegistry } from './plugins/dbt/DbtStepActivity.js';
export {
  DBT_PLUGIN_ID,
  TEMPORAL_DBT_PLUGIN_STEP_KINDS,
  resolveDbtCliSubcommand,
  type DbtCliSubcommand,
  type TemporalDbtPluginStepKind,
} from './plugins/dbt/dbtPluginManifest.js';
export { DbtCliPluginRunner, assertDbtCliAvailable } from './plugins/dbt/DbtCliPluginRunner.js';
export type { RunStateCommandCircuitSnapshot } from './RunStateCommandPortCircuitBreaker.js';
export { CircuitBreakingRunStateCommandPort } from './RunStateCommandPortCircuitBreaker.js';

// PR-2: Workflow types (workflow function itself is loaded by Worker bundler)
export type { RunPlanWorkflowInput, RunPlanWorkflowResult } from './workflows/RunPlanWorkflow.js';
