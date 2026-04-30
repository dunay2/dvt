/**
 * @ownedConcern Adapt normalized start-run facade input to resolved context, tracing, and start application service execution.
 */
import type { EngineRunRef, PlanRef, ResolvedRunContext, RunContext } from '@dvt/contracts';
import type { IObservability } from '@dvt/observability';

import { buildTraceContext } from '../../core/lifecycle/coreRuntime.js';
import { toErrorMessage } from '../../utils/errorUtils.js';
import type { IStartRunApplicationService } from '../IStartRunApplicationService.js';

import type { IWorkflowStartRunUseCase } from './types.js';

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

function resolveInitialRunContext(ctx: RunContext): ResolvedRunContext {
  return {
    ...ctx,
    logicalAttemptId: 1,
    originRunId: ctx.runId,
  };
}
