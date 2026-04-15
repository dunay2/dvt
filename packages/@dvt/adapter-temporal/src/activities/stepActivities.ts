/**
 * Compatibility barrel for Temporal step-activity seams.
 * Concrete responsibilities live in focused modules under this folder.
 */

export type { Activities } from './activityFactory.js';
export { createActivities } from './activityFactory.js';
export { DbtStepActivity } from './dbtStepActivity.js';
export {
  createDefaultStepActivityRegistry,
  DEFAULT_STEP_ACTIVITY_REGISTRY,
  DEFAULT_STEP_EXECUTORS,
  StepActivityDispatcher,
} from './stepActivityDispatcher.js';
export type {
  ActivityDeps,
  DbtPluginExecutionInput,
  DbtPluginRunner,
  EmitEventInput,
  EventEmitterDeps,
  RunBootstrapperDeps,
  StepActivity,
  StepActivityRegistry,
  StepDefinition,
  StepExecutionContext,
  StepExecutionIdentity,
  StepExecutor,
  StepInput,
  StepResult,
} from './activityTypes.js';
export { UnsupportedStepKindError } from './activityTypes.js';
