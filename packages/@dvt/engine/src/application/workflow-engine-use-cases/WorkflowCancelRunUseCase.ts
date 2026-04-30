/**
 * @ownedConcern Adapt cancellation facade commands to the run-control service boundary.
 */
import type { EngineRunRef } from '@dvt/contracts';

import type { IRunControlService } from '../../domain/IRunControlService.js';

import type { IWorkflowCancelRunUseCase } from './types.js';

export interface WorkflowCancelRunUseCaseDeps {
  runControlService: IRunControlService;
}

export class WorkflowCancelRunUseCase implements IWorkflowCancelRunUseCase {
  constructor(private readonly deps: WorkflowCancelRunUseCaseDeps) {}

  cancelRun(engineRunRef: EngineRunRef): Promise<void> {
    return this.deps.runControlService.cancel(engineRunRef);
  }
}
