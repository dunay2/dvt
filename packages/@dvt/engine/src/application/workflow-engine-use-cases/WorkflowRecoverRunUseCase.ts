/**
 * @ownedConcern Adapt normalized recover-run facade input to the recovery application service.
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0049: Retry-Run As Separate Recovery Use Case
 * @decision Delegate recover-run facade input to the recovery application service.
 * @consequence Recovery remains a separate use case instead of a synthetic canonical signal.
 * @version 1.0.0
 */
import type { EngineRunRef, PlanRef, RunContext } from '@dvt/contracts';

import type { IRunRecoveryService } from '../../domain/IRunRecoveryService.js';

import type { IWorkflowRecoverRunUseCase } from './types.js';

export interface WorkflowRecoverRunUseCaseDeps {
  runRecoveryService: IRunRecoveryService;
}

export class WorkflowRecoverRunUseCase implements IWorkflowRecoverRunUseCase {
  constructor(private readonly deps: WorkflowRecoverRunUseCaseDeps) {}

  recoverRun(sourceRunId: string, planRef: PlanRef, context: RunContext): Promise<EngineRunRef> {
    return this.deps.runRecoveryService.recoverRun({ sourceRunId, planRef, context });
  }
}
