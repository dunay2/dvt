import { validateExecutionPlan } from '../contracts/validation/withValidation';

import type { IWorkflowEngineAdapter } from './IWorkflowEngineAdapter.v1';

export class ValidatingAdapter implements IWorkflowEngineAdapter {
  private readonly inner: IWorkflowEngineAdapter;

  constructor(inner: IWorkflowEngineAdapter) {
    this.inner = inner;
  }

  async createRun(...args: Parameters<IWorkflowEngineAdapter['createRun']>): Promise<ReturnType<IWorkflowEngineAdapter['createRun']>> {
    const [tenantId, planId, planData] = args;
    const validatedPlan = validateExecutionPlan(planData);
    return this.inner.createRun(tenantId, planId, validatedPlan);
  }

  // Delegate all other methods
  startRun(...args: Parameters<IWorkflowEngineAdapter['startRun']>): ReturnType<IWorkflowEngineAdapter['startRun']> {
    return this.inner.startRun(...args);
  }
  executeStep(...args: Parameters<IWorkflowEngineAdapter['executeStep']>): ReturnType<IWorkflowEngineAdapter['executeStep']> {
    return this.inner.executeStep(...args);
  }
  executeStepBatch(...args: Parameters<IWorkflowEngineAdapter['executeStepBatch']>): ReturnType<IWorkflowEngineAdapter['executeStepBatch']> {
    return this.inner.executeStepBatch(...args);
  }
  pauseRun(...args: Parameters<IWorkflowEngineAdapter['pauseRun']>): ReturnType<IWorkflowEngineAdapter['pauseRun']> {
    return this.inner.pauseRun(...args);
  }
  resumeRun(...args: Parameters<IWorkflowEngineAdapter['resumeRun']>): ReturnType<IWorkflowEngineAdapter['resumeRun']> {
    return this.inner.resumeRun(...args);
  }
  terminateRun(...args: Parameters<IWorkflowEngineAdapter['terminateRun']>): ReturnType<IWorkflowEngineAdapter['terminateRun']> {
    return this.inner.terminateRun(...args);
  }
  getRunState(...args: Parameters<IWorkflowEngineAdapter['getRunState']>): ReturnType<IWorkflowEngineAdapter['getRunState']> {
    return this.inner.getRunState(...args);
  }
  getRunStateWithHistory(...args: Parameters<IWorkflowEngineAdapter['getRunStateWithHistory']>): ReturnType<IWorkflowEngineAdapter['getRunStateWithHistory']> {
    return this.inner.getRunStateWithHistory(...args);
  }
  replayRun(...args: Parameters<IWorkflowEngineAdapter['replayRun']>): ReturnType<IWorkflowEngineAdapter['replayRun']> {
    return this.inner.replayRun(...args);
  }
  archiveRun(...args: Parameters<IWorkflowEngineAdapter['archiveRun']>): ReturnType<IWorkflowEngineAdapter['archiveRun']> {
    return this.inner.archiveRun(...args);
  }
  health(...args: Parameters<IWorkflowEngineAdapter['health']>): ReturnType<IWorkflowEngineAdapter['health']> {
    return this.inner.health(...args);
  }
  close(...args: Parameters<IWorkflowEngineAdapter['close']>): ReturnType<IWorkflowEngineAdapter['close']> {
    return this.inner.close(...args);
  }
}

export function createValidatingAdapter(adapter: IWorkflowEngineAdapter): IWorkflowEngineAdapter {
  return new ValidatingAdapter(adapter);
}
