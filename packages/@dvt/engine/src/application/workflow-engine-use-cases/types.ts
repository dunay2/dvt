/**
 * @ownedConcern Declare facade-facing WorkflowEngine use-case ports and their composition shape.
 * @baseline ADR-0003: Execution Model
 * @decision Model facade operations as explicit command and query use-case ports.
 * @consequence The WorkflowEngine facade can delegate without hiding application-service boundaries.
 * @version 1.0.0
 */
import type {
  CanonicalRunStatus,
  EngineRunRef,
  PlanRef,
  RunContext,
  SignalRequest,
} from '@dvt/contracts';

export interface IWorkflowStartRunUseCase {
  startRun(planRef: PlanRef, context: RunContext): Promise<EngineRunRef>;
}

export interface IWorkflowRecoverRunUseCase {
  recoverRun(sourceRunId: string, planRef: PlanRef, context: RunContext): Promise<EngineRunRef>;
}

export interface IWorkflowCancelRunUseCase {
  cancelRun(engineRunRef: EngineRunRef): Promise<void>;
}

export interface IWorkflowRunStatusUseCase {
  getRunStatus(engineRunRef: EngineRunRef): Promise<CanonicalRunStatus>;
}

export interface IWorkflowSignalRunUseCase {
  signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void>;
}

export interface WorkflowEngineUseCases {
  startRunUseCase: IWorkflowStartRunUseCase;
  recoverRunUseCase: IWorkflowRecoverRunUseCase;
  cancelRunUseCase: IWorkflowCancelRunUseCase;
  runStatusUseCase: IWorkflowRunStatusUseCase;
  signalRunUseCase: IWorkflowSignalRunUseCase;
}
