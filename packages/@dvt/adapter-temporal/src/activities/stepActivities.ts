/**
 * Compatibility barrel for Temporal step-activity seams.
 * @ownedConcern Publish the Temporal activity public surface without owning plugin step kinds.
 * Concrete responsibilities live in focused modules under this folder.
 */

export type { Activities } from './activityFactory.js';
export { createActivities } from './activityFactory.js';
export {
  createDefaultStepActivityRegistry,
  DEFAULT_STEP_ACTIVITY_REGISTRY,
  DEFAULT_STEP_EXECUTORS,
  StepActivityDispatcher,
} from './stepActivityDispatcher.js';
export type {
  ActivityDeps,
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
