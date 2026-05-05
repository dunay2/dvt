/**
 * @ownedConcern Adapt canonical signal facade commands to the run-control service boundary.
 * @baseline ADR-0008: Signal Idempotency Key Derivation
 * @baseline ADR-0047: Runtime-Owned Realized Lifecycle For Signal-Driven Transitions
 * @decision Route signal facade commands through the canonical run-control service.
 * @consequence Signal handling keeps runtime lifecycle authority below the facade.
 * @version 1.0.0
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
