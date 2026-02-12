import { validateExecutionPlan } from '../contracts/validation/withValidation';

import type { IWorkflowEngineAdapter } from './IWorkflowEngineAdapter.v1';

export class ValidatingAdapter implements IWorkflowEngineAdapter {
  private readonly inner: IWorkflowEngineAdapter;

  constructor(inner: IWorkflowEngineAdapter) {
    this.inner = inner;
  }

  async createRun(...args: Parameters<IWorkflowEngineAdapter['createRun']>) {
    const [tenantId, planId, planData] = args;
    const validatedPlan = validateExecutionPlan(planData);
    return this.inner.createRun(tenantId, planId, validatedPlan);
  }

  // Delegate all other methods
  startRun(...args: Parameters<IWorkflowEngineAdapter['startRun']>) {
    return this.inner.startRun(...args);
  }
  executeStep(...args: Parameters<IWorkflowEngineAdapter['executeStep']>) {
    return this.inner.executeStep(...args);
  }
  executeStepBatch(...args: Parameters<IWorkflowEngineAdapter['executeStepBatch']>) {
    return this.inner.executeStepBatch(...args);
  }
  pauseRun(...args: Parameters<IWorkflowEngineAdapter['pauseRun']>) {
    return this.inner.pauseRun(...args);
  }
  resumeRun(...args: Parameters<IWorkflowEngineAdapter['resumeRun']>) {
    return this.inner.resumeRun(...args);
  }
  terminateRun(...args: Parameters<IWorkflowEngineAdapter['terminateRun']>) {
    return this.inner.terminateRun(...args);
  }
  getRunState(...args: Parameters<IWorkflowEngineAdapter['getRunState']>) {
    return this.inner.getRunState(...args);
  }
  getRunStateWithHistory(...args: Parameters<IWorkflowEngineAdapter['getRunStateWithHistory']>) {
    return this.inner.getRunStateWithHistory(...args);
  }
  replayRun(...args: Parameters<IWorkflowEngineAdapter['replayRun']>) {
    return this.inner.replayRun(...args);
  }
  archiveRun(...args: Parameters<IWorkflowEngineAdapter['archiveRun']>) {
    return this.inner.archiveRun(...args);
  }
  health(...args: Parameters<IWorkflowEngineAdapter['health']>) {
    return this.inner.health(...args);
  }
  close(...args: Parameters<IWorkflowEngineAdapter['close']>) {
    return this.inner.close(...args);
  }
}

export function createValidatingAdapter(adapter: IWorkflowEngineAdapter): IWorkflowEngineAdapter {
  return new ValidatingAdapter(adapter);
}
