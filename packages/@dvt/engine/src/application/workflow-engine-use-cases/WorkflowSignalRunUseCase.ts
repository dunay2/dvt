/**
 * @ownedConcern Adapt canonical signal facade commands to the run-control service boundary.
 */
import type { EngineRunRef, SignalRequest } from '@dvt/contracts';

import type { IRunControlService } from '../../domain/IRunControlService.js';

import type { IWorkflowSignalRunUseCase } from './types.js';

export interface WorkflowSignalRunUseCaseDeps {
  runControlService: IRunControlService;
}

export class WorkflowSignalRunUseCase implements IWorkflowSignalRunUseCase {
  constructor(private readonly deps: WorkflowSignalRunUseCaseDeps) {}

  signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void> {
    return this.deps.runControlService.signal(engineRunRef, request);
  }
}
