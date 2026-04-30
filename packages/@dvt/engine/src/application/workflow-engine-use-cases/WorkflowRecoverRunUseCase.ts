/**
 * @ownedConcern Adapt normalized recover-run facade input to the recovery application service.
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
