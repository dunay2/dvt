/**
 * @ownedConcern Adapt canonical status facade reads to the engine read-model query service.
 * @baseline ADR-0015: getRunStatus Read Model Separation
 * @decision Delegate facade status reads to the run-status query service.
 * @consequence Status reads stay separated from command-side lifecycle mutation.
 * @version 1.0.0
 */
import type { CanonicalRunStatus, EngineRunRef } from '@dvt/contracts';

import type { IRunStatusQueryService } from '../../domain/IRunStatusQueryService.js';

import type { IWorkflowRunStatusUseCase } from './types.js';

export interface WorkflowRunStatusUseCaseDeps {
  runStatusQueryService: IRunStatusQueryService;
}

export class WorkflowRunStatusUseCase implements IWorkflowRunStatusUseCase {
  constructor(private readonly deps: WorkflowRunStatusUseCaseDeps) {}

  getRunStatus(engineRunRef: EngineRunRef): Promise<CanonicalRunStatus> {
    return this.deps.runStatusQueryService.getStatus(engineRunRef);
  }
}
