/**
 * @ownedConcern Adapt cancellation facade commands to the run-control service boundary.
 * @baseline ADR-0007: Run Cancellation Semantics And Event Ownership
 * @baseline ADR-0047: Runtime-Owned Realized Lifecycle For Signal-Driven Transitions
 * @decision Route facade cancellation requests through the canonical run-control service.
 * @consequence Cancellation stays event-owned instead of becoming facade-local behavior.
 * @version 1.0.0
 */
import type { EngineRunRef } from '@dvt/contracts';

import type { IRunCommandService } from '../../domain/IRunCommandService.js';

import type { IWorkflowCancelRunUseCase } from './types.js';

export interface WorkflowCancelRunUseCaseDeps {
  runCommandService: IRunCommandService;
}

export class WorkflowCancelRunUseCase implements IWorkflowCancelRunUseCase {
  constructor(private readonly deps: WorkflowCancelRunUseCaseDeps) {}

  cancelRun(engineRunRef: EngineRunRef): Promise<void> {
    return this.deps.runCommandService.cancel(engineRunRef);
  }
}
