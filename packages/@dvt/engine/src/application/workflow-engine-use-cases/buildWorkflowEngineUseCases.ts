/**
 * @ownedConcern Compose WorkflowEngine facade use-case implementations from internal engine services.
 * @baseline ADR-0003: Execution Model
 * @decision Compose facade use cases through explicit dependencies instead of a multi-reason facade module.
 * @consequence WorkflowEngine delegates behavior without owning every command and query path directly.
 * @version 1.0.0
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
  assertWorkflowEngineUseCaseDeps(deps);

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

function assertWorkflowEngineUseCaseDeps(deps: WorkflowEngineUseCaseDeps): void {
  const requiredDeps: Array<[name: keyof WorkflowEngineUseCaseDeps, value: unknown]> = [
    ['observability', deps.observability],
    ['startRunApplicationService', deps.startRunApplicationService],
    ['runRecoveryService', deps.runRecoveryService],
    ['runControlService', deps.runControlService],
    ['runStatusQueryService', deps.runStatusQueryService],
  ];

  for (const [name, value] of requiredDeps) {
    if (value === undefined || value === null) {
      throw new Error(`${name} is required`);
    }
  }
}
