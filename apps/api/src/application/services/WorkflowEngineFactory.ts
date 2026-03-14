import { WorkflowEngine, type WorkflowEngineDeps } from '@dvt/engine';

export type WorkflowEngineConstructor = new (deps: WorkflowEngineDeps) => WorkflowEngine;

export function createWorkflowEngine(
  deps: WorkflowEngineDeps,
  EngineCtor: WorkflowEngineConstructor = WorkflowEngine
): WorkflowEngine {
  return new EngineCtor(deps);
}
