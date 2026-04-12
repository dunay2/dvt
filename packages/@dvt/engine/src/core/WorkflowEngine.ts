/**
 * @file packages/@dvt/engine/src/core/WorkflowEngine.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @decision WorkflowEngine is an application-facing facade that delegates
 *   startRun, recoverRun, canonical status reads, and control operations
 *   to focused collaborators.
 * @consequence Runtime orchestration responsibilities are split into focused collaborators.
 */
import { parsePlanRef, parseRecoverRunCommand, parseRunContext } from '@dvt/contracts';
import type {
  CanonicalRunStatus,
  EngineRunRef,
  PlanRef,
  ResolvedRunContext,
  RunContext,
  SignalRequest,
} from '@dvt/contracts';
import type { IObservability } from '@dvt/observability';

import type { IProviderAdapter } from '../adapters/IProviderAdapter.js';
import type { IStartRunApplicationService } from '../application/IStartRunApplicationService.js';
import { AdapterNotRegisteredError } from '../contracts/errors.js';
import type { IWorkflowEngine } from '../contracts/IWorkflowEngine.v1.js';
import type { IRunControlService } from '../domain/IRunControlService.js';
import type { IRunRecoveryService } from '../domain/IRunRecoveryService.js';
import type { IRunStatusQueryService } from '../domain/IRunStatusQueryService.js';
import { toErrorMessage } from '../utils/errorUtils.js';

import { buildTraceContext } from './lifecycle/coreRuntime.js';

export interface WorkflowEngineDeps {
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  requiredProviders?: EngineRunRef['provider'][];
  observability: IObservability;
  startRunApplicationService: IStartRunApplicationService;
  runRecoveryService: IRunRecoveryService;
  runControlService: IRunControlService;
  runStatusQueryService: IRunStatusQueryService;
}

export class WorkflowEngine implements IWorkflowEngine {
  private readonly observability: IObservability;
  private readonly startRunApplicationService: IStartRunApplicationService;
  private readonly runRecoveryService: IRunRecoveryService;
  private readonly runControlService: IRunControlService;
  private readonly runStatusQueryService: IRunStatusQueryService;

  constructor(private readonly deps: WorkflowEngineDeps) {
    this.validateDependencies();
    this.observability = deps.observability;
    this.startRunApplicationService = deps.startRunApplicationService;
    this.runRecoveryService = deps.runRecoveryService;
    this.runControlService = deps.runControlService;
    this.runStatusQueryService = deps.runStatusQueryService;
  }

  async startRun(planRef: PlanRef, context: RunContext): Promise<EngineRunRef> {
    const validatedPlanRef = normalizePlanRef(parsePlanRef(planRef));
    const validatedContext = normalizeRunContext(parseRunContext(context));
    const resolvedContext = resolveInitialRunContext(validatedContext);
    const traceContext = buildTraceContext(resolvedContext, validatedPlanRef.planId);

    return this.observability.withContext(traceContext, () =>
      this.observability.traces.withSpan(
        'engine.startRun',
        {
          context: traceContext,
          attributes: {
            provider: resolvedContext.targetAdapter,
            planUri: validatedPlanRef.uri,
          },
        },
        async (span) => {
          try {
            const runRef = await this.startRunApplicationService.startRun(
              validatedPlanRef,
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

  async recoverRun(
    sourceRunId: string,
    planRef: PlanRef,
    context: RunContext
  ): Promise<EngineRunRef> {
    const validated = parseRecoverRunCommand({
      sourceRunId,
      planRef,
      context,
    });
    const validatedPlanRef = normalizePlanRef(validated.planRef);
    const validatedContext = normalizeRunContext(validated.context);
    return this.runRecoveryService.recoverRun(
      validated.sourceRunId,
      validatedPlanRef,
      validatedContext
    );
  }

  async cancelRun(engineRunRef: EngineRunRef): Promise<void> {
    await this.runControlService.cancel(engineRunRef);
  }

  async getRunStatus(engineRunRef: EngineRunRef): Promise<CanonicalRunStatus> {
    return this.runStatusQueryService.getStatus(engineRunRef);
  }

  async signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void> {
    await this.runControlService.signal(engineRunRef, request);
  }

  private validateDependencies(): void {
    const requiredDeps: Array<[name: string, value: unknown]> = [
      ['adapters', this.deps.adapters],
      ['observability', this.deps.observability],
      ['startRunApplicationService', this.deps.startRunApplicationService],
      ['runRecoveryService', this.deps.runRecoveryService],
      ['runControlService', this.deps.runControlService],
      ['runStatusQueryService', this.deps.runStatusQueryService],
    ];

    for (const [name, value] of requiredDeps) {
      if (!value) throw new Error(`${name} is required`);
    }
    this.assertRequiredProvidersRegistered(this.deps.requiredProviders ?? []);
  }

  private assertRequiredProvidersRegistered(requiredProviders: EngineRunRef['provider'][]): void {
    for (const provider of requiredProviders) {
      if (this.deps.adapters.has(provider) === false) throw new AdapterNotRegisteredError(provider);
    }
  }
}

function normalizePlanRef(input: ReturnType<typeof parsePlanRef>): PlanRef {
  const planRef: PlanRef = {
    uri: input.uri,
    sha256: input.sha256,
    schemaVersion: input.schemaVersion,
    planId: input.planId,
    planVersion: input.planVersion,
  };
  if (input.sizeBytes !== undefined) planRef.sizeBytes = input.sizeBytes;
  if (input.expiresAt !== undefined) planRef.expiresAt = input.expiresAt;
  return planRef;
}

function normalizeRunContext(input: ReturnType<typeof parseRunContext>): RunContext {
  const out: RunContext = {
    tenantId: input.tenantId,
    projectId: input.projectId,
    environmentId: input.environmentId,
    runId: input.runId,
    targetAdapter: input.targetAdapter,
  };
  if (input.runExecutionContextRef !== undefined) {
    out.runExecutionContextRef = input.runExecutionContextRef;
  }
  return out;
}

function resolveInitialRunContext(ctx: RunContext): ResolvedRunContext {
  return {
    ...ctx,
    logicalAttemptId: 1,
    originRunId: ctx.runId,
  };
}
