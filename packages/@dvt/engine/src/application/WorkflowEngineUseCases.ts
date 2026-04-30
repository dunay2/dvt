/**
 * @ownedConcern Adapt the public WorkflowEngine facade contract to explicit use-case services.
 */
import type {
  CanonicalRunStatus,
  EngineRunRef,
  PlanRef,
  ResolvedRunContext,
  RunContext,
  SignalRequest,
} from '@dvt/contracts';
import type { IObservability } from '@dvt/observability';

import { buildTraceContext } from '../core/lifecycle/coreRuntime.js';
import type { IRunControlService } from '../domain/IRunControlService.js';
import type { IRunRecoveryService } from '../domain/IRunRecoveryService.js';
import type { IRunStatusQueryService } from '../domain/IRunStatusQueryService.js';
import { toErrorMessage } from '../utils/errorUtils.js';

import type { IStartRunApplicationService } from './IStartRunApplicationService.js';

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

export interface WorkflowStartRunUseCaseDeps {
  observability: IObservability;
  startRunApplicationService: IStartRunApplicationService;
}

export class WorkflowStartRunUseCase implements IWorkflowStartRunUseCase {
  constructor(private readonly deps: WorkflowStartRunUseCaseDeps) {}

  async startRun(planRef: PlanRef, context: RunContext): Promise<EngineRunRef> {
    const resolvedContext = resolveInitialRunContext(context);
    const traceContext = buildTraceContext(resolvedContext, planRef.planId);

    return this.deps.observability.withContext(traceContext, () =>
      this.deps.observability.traces.withSpan(
        'engine.startRun',
        {
          context: traceContext,
          attributes: {
            provider: resolvedContext.targetAdapter,
            planUri: planRef.uri,
          },
        },
        async (span) => {
          try {
            const runRef = await this.deps.startRunApplicationService.startRun(
              planRef,
              resolvedContext,
              traceContext
            );
            span.setStatus('ok');
            return runRef;
          } catch (error) {
            span.recordException(error);
            span.setStatus('error', toErrorMessage(error));
            throw error;
          }
        }
      )
    );
  }
}

export interface WorkflowRecoverRunUseCaseDeps {
  runRecoveryService: IRunRecoveryService;
}

export class WorkflowRecoverRunUseCase implements IWorkflowRecoverRunUseCase {
  constructor(private readonly deps: WorkflowRecoverRunUseCaseDeps) {}

  recoverRun(sourceRunId: string, planRef: PlanRef, context: RunContext): Promise<EngineRunRef> {
    return this.deps.runRecoveryService.recoverRun({ sourceRunId, planRef, context });
  }
}

export interface WorkflowCancelRunUseCaseDeps {
  runControlService: IRunControlService;
}

export class WorkflowCancelRunUseCase implements IWorkflowCancelRunUseCase {
  constructor(private readonly deps: WorkflowCancelRunUseCaseDeps) {}

  cancelRun(engineRunRef: EngineRunRef): Promise<void> {
    return this.deps.runControlService.cancel(engineRunRef);
  }
}

export interface WorkflowRunStatusUseCaseDeps {
  runStatusQueryService: IRunStatusQueryService;
}

export class WorkflowRunStatusUseCase implements IWorkflowRunStatusUseCase {
  constructor(private readonly deps: WorkflowRunStatusUseCaseDeps) {}

  getRunStatus(engineRunRef: EngineRunRef): Promise<CanonicalRunStatus> {
    return this.deps.runStatusQueryService.getStatus(engineRunRef);
  }
}

export interface WorkflowSignalRunUseCaseDeps {
  runControlService: IRunControlService;
}

export class WorkflowSignalRunUseCase implements IWorkflowSignalRunUseCase {
  constructor(private readonly deps: WorkflowSignalRunUseCaseDeps) {}

  signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void> {
    return this.deps.runControlService.signal(engineRunRef, request);
  }
}

export interface WorkflowEngineUseCaseDeps {
  observability: IObservability;
  startRunApplicationService: IStartRunApplicationService;
  runRecoveryService: IRunRecoveryService;
  runControlService: IRunControlService;
  runStatusQueryService: IRunStatusQueryService;
}

export interface WorkflowEngineUseCases {
  startRunUseCase: IWorkflowStartRunUseCase;
  recoverRunUseCase: IWorkflowRecoverRunUseCase;
  cancelRunUseCase: IWorkflowCancelRunUseCase;
  runStatusUseCase: IWorkflowRunStatusUseCase;
  signalRunUseCase: IWorkflowSignalRunUseCase;
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

function resolveInitialRunContext(ctx: RunContext): ResolvedRunContext {
  return {
    ...ctx,
    logicalAttemptId: 1,
    originRunId: ctx.runId,
  };
}
