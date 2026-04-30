/**
 * @ownedConcern Compose WorkflowEngine facade use-case implementations from internal engine services.
 */
import type { IObservability } from '@dvt/observability';

import type { IRunControlService } from '../../domain/IRunControlService.js';
import type { IRunRecoveryService } from '../../domain/IRunRecoveryService.js';
import type { IRunStatusQueryService } from '../../domain/IRunStatusQueryService.js';
import type { IStartRunApplicationService } from '../IStartRunApplicationService.js';

import type { WorkflowEngineUseCases } from './types.js';
import { WorkflowCancelRunUseCase } from './WorkflowCancelRunUseCase.js';
import { WorkflowRecoverRunUseCase } from './WorkflowRecoverRunUseCase.js';
import { WorkflowRunStatusUseCase } from './WorkflowRunStatusUseCase.js';
import { WorkflowSignalRunUseCase } from './WorkflowSignalRunUseCase.js';
import { WorkflowStartRunUseCase } from './WorkflowStartRunUseCase.js';

export interface WorkflowEngineUseCaseDeps {
  observability: IObservability;
  startRunApplicationService: IStartRunApplicationService;
  runRecoveryService: IRunRecoveryService;
  runControlService: IRunControlService;
  runStatusQueryService: IRunStatusQueryService;
}

export function buildWorkflowEngineUseCases(
  deps: WorkflowEngineUseCaseDeps
): WorkflowEngineUseCases {
  return {
    startRunUseCase: new WorkflowStartRunUseCase({
      observability: deps.observability,
      startRunApplicationService: deps.startRunApplicationService,
    }),
    recoverRunUseCase: new WorkflowRecoverRunUseCase({
      runRecoveryService: deps.runRecoveryService,
    }),
    cancelRunUseCase: new WorkflowCancelRunUseCase({
      runControlService: deps.runControlService,
    }),
    runStatusUseCase: new WorkflowRunStatusUseCase({
      runStatusQueryService: deps.runStatusQueryService,
    }),
    signalRunUseCase: new WorkflowSignalRunUseCase({
      runControlService: deps.runControlService,
    }),
  };
}
