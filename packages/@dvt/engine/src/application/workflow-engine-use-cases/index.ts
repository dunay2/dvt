/**
 * @ownedConcern Publish the WorkflowEngine facade use-case component API from one local barrel.
 * @baseline ADR-0003: Execution Model
 * @decision Keep the facade use-case export surface local to the component boundary.
 * @consequence Engine consumers import named use cases without widening the component API.
 * @version 1.0.0
 */
export {
  WorkflowStartRunUseCase,
  type WorkflowStartRunUseCaseDeps,
} from './WorkflowStartRunUseCase.js';
export {
  WorkflowRecoverRunUseCase,
  type WorkflowRecoverRunUseCaseDeps,
} from './WorkflowRecoverRunUseCase.js';
export {
  WorkflowCancelRunUseCase,
  type WorkflowCancelRunUseCaseDeps,
} from './WorkflowCancelRunUseCase.js';
export {
  WorkflowRunStatusUseCase,
  type WorkflowRunStatusUseCaseDeps,
} from './WorkflowRunStatusUseCase.js';
export {
  WorkflowSignalRunUseCase,
  type WorkflowSignalRunUseCaseDeps,
} from './WorkflowSignalRunUseCase.js';
export {
  buildWorkflowEngineUseCases,
  type WorkflowEngineUseCaseDeps,
} from './buildWorkflowEngineUseCases.js';
export type {
  IWorkflowCancelRunUseCase,
  IWorkflowRecoverRunUseCase,
  IWorkflowRunStatusUseCase,
  IWorkflowSignalRunUseCase,
  IWorkflowStartRunUseCase,
  WorkflowEngineUseCases,
} from './types.js';
