import type { IWorkflowEngine } from '../ports/IWorkflowEngine.js';

import { WorkflowEngine, type WorkflowEngineDeps } from './WorkflowEngine.js';

export type WorkflowEngineBuilder = (deps: WorkflowEngineDeps) => IWorkflowEngine;

export function buildWorkflowEngineFacade(deps: WorkflowEngineDeps): IWorkflowEngine {
  return new WorkflowEngine(deps);
}
