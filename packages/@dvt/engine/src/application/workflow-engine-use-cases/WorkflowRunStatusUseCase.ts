/**
 * @ownedConcern Adapt canonical status facade reads to the engine read-model query service.
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
