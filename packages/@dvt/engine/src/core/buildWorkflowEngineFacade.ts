import type { IWorkflowEngine } from '../contracts/IWorkflowEngine.v1.js';

import { WorkflowEngine, type WorkflowEngineDeps } from './WorkflowEngine.js';

export type WorkflowEngineBuilder = (deps: WorkflowEngineDeps) => IWorkflowEngine;

export function buildWorkflowEngineFacade(deps: WorkflowEngineDeps): IWorkflowEngine {
  return new WorkflowEngine(deps);
}
