/**
 * @file packages/@dvt/engine/src/core/WorkflowEngine.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @decision WorkflowEngine is an application-facing facade that delegates
 *   startRun to StartRunApplicationService, canonical status reads to RunStatusQueryService,
 *   and control operations to WorkflowEngineCoreService.
 * @consequence Runtime orchestration responsibilities are split into focused collaborators.
 */
import { parsePlanRef, parseRecoverRunCommand, parseRunContext } from '@dvt/contracts';
import type {
  CanonicalRunStatus,
  EngineRunRef,
  PlanRef,
  ResolvedRunContext,
  RunContext,
  RunStatus,
  SignalRequest,
} from '@dvt/contracts';
import type { IObservability } from '@dvt/observability';

import type { IProviderAdapter } from '../adapters/IProviderAdapter.js';
import { StartRunAdmissionGuard } from '../application/StartRunAdmissionGuard.js';
import {
  AdapterNotRegisteredError,
  RecoverySourceNotTerminalError,
  RunMetadataNotFoundError,
} from '../contracts/errors.js';
import type { IWorkflowEngine } from '../contracts/IWorkflowEngine.v1.js';
import type { IRunControlService } from '../domain/IRunControlService.js';
import type { IRunStatusQueryService } from '../domain/IRunStatusQueryService.js';
import type { IRunExecutionContextResolver } from '../ports/IRunExecutionContextResolver.js';
import type {
  IPlanFetcher,
  IRunStateStoreRead,
  IRunStateStoreWrite,
} from '../ports/IRunStateStore.js';
import { PlanIntegrityValidator } from '../security/planIntegrity.js';
import type { IRunAccessPolicy } from '../security/RunAccessPolicy.js';
import { toErrorMessage } from '../utils/errorUtils.js';

import { buildTraceContext } from './lifecycle/coreRuntime.js';
import type { StartRunTraceContext } from './lifecycle/StartRunTraceContext.js';
import { SnapshotProjector, snapshotToStatus } from './SnapshotProjector.js';

export interface IStartRunApplicationService {
  startRun(
    planRef: PlanRef,
    resolvedContext: ResolvedRunContext,
    traceContext: StartRunTraceContext
  ): Promise<EngineRunRef>;
}

export interface WorkflowEngineDeps {
  stateStoreRead: IRunStateStoreRead;
  stateStoreWrite: IRunStateStoreWrite;
  projector: SnapshotProjector;
  policy: IRunAccessPolicy;
  runExecutionContextResolver?: IRunExecutionContextResolver;
  planFetcher: IPlanFetcher;
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  requiredProviders?: EngineRunRef['provider'][];
  observability: IObservability;
  startRunApplicationService: IStartRunApplicationService;
  runControlService: IRunControlService;
  runStatusQueryService: IRunStatusQueryService;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded';
  components: Array<{
    name: string;
    status: 'up' | 'down';
    error?: string;
  }>;
}

interface HealthCheckable {
  ping?: () => Promise<void>;
}

export class WorkflowEngine implements IWorkflowEngine {
  private readonly observability: IObservability;
  private readonly startRunApplicationService: IStartRunApplicationService;
  private readonly runControlService: IRunControlService;
  private readonly runStatusQueryService: IRunStatusQueryService;

  constructor(private readonly deps: WorkflowEngineDeps) {
    this.validateDependencies();
    this.observability = deps.observability;
    this.startRunApplicationService = deps.startRunApplicationService;
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
    const sourceMetadata = await this.resolveRecoverySourceMetadata(
      validatedContext.tenantId,
      validated.sourceRunId
    );
    await this.assertRecoverySourceTerminal(validatedContext.tenantId, validated.sourceRunId);
    await this.preflightRecoverRun(validatedPlanRef, validatedContext, sourceMetadata);
    const reservedAttempt = await this.reserveRetryAttempt(
      sourceMetadata,
      validatedContext.tenantId
    );
    const resolvedContext: ResolvedRunContext = {
      ...validatedContext,
      logicalAttemptId: reservedAttempt.logicalAttemptId,
      parentRunId: reservedAttempt.parentRunId,
      originRunId: reservedAttempt.originRunId,
    };
    const traceContext = buildTraceContext(resolvedContext, validatedPlanRef.planId);

    return this.observability.withContext(traceContext, () =>
      this.observability.traces.withSpan(
        'engine.recoverRun',
        {
          context: traceContext,
          attributes: {
            sourceRunId: validated.sourceRunId,
            logicalAttemptId: String(resolvedContext.logicalAttemptId),
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

  async cancelRun(engineRunRef: EngineRunRef): Promise<void> {
    await this.runControlService.cancel(engineRunRef);
  }

  async getRunStatus(engineRunRef: EngineRunRef): Promise<CanonicalRunStatus> {
    return this.runStatusQueryService.getStatus(engineRunRef);
  }

  async signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void> {
    await this.runControlService.signal(engineRunRef, request);
  }

  async healthCheck(): Promise<HealthStatus> {
    const checks: Array<{ name: string; target: HealthCheckable }> = [
      { name: 'stateStoreRead', target: this.deps.stateStoreRead as HealthCheckable },
      ...Array.from(this.deps.adapters.values()).map((adapter) => ({
        name: `adapter-${adapter.provider}`,
        target: adapter as IProviderAdapter & HealthCheckable,
      })),
    ];

    const components = await Promise.all(
      checks.map(async ({ name, target }) => {
        if (!target.ping) return { name, status: 'up' as const };
        try {
          await target.ping();
          return { name, status: 'up' as const };
        } catch (error) {
          return {
            name,
            status: 'down' as const,
            error: toErrorMessage(error),
          };
        }
      })
    );

    return {
      status: components.every((component) => component.status === 'up') ? 'healthy' : 'degraded',
      components,
    };
  }

  private validateDependencies(): void {
    const requiredDeps: Array<[name: string, value: unknown]> = [
      ['stateStoreRead', this.deps.stateStoreRead],
      ['stateStoreWrite', this.deps.stateStoreWrite],
      ['projector', this.deps.projector],
      ['policy', this.deps.policy],
      ['planFetcher', this.deps.planFetcher],
      ['adapters', this.deps.adapters],
      ['observability', this.deps.observability],
      ['startRunApplicationService', this.deps.startRunApplicationService],
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

  private async resolveRecoverySourceMetadata(
    tenantId: string,
    sourceRunId: string
  ): Promise<{
    runId: string;
    logicalAttemptId: number;
    originRunId?: string;
  }> {
    const sourceMetadata = await this.deps.stateStoreRead.getRunMetadataByRunId(
      tenantId,
      sourceRunId
    );
    if (sourceMetadata === null) {
      throw new RunMetadataNotFoundError(sourceRunId);
    }
    return sourceMetadata;
  }

  private async assertRecoverySourceTerminal(tenantId: string, sourceRunId: string): Promise<void> {
    const snapshot = await this.resolveRunStatusSnapshot(tenantId, sourceRunId);
    if (TERMINAL_RUN_STATUSES.has(snapshot.status)) {
      return;
    }

    throw new RecoverySourceNotTerminalError(sourceRunId, snapshot.status);
  }

  private async resolveRunStatusSnapshot(
    tenantId: string,
    runId: string
  ): Promise<CanonicalRunStatus> {
    const snapshot = await this.deps.stateStoreRead.getSnapshot(tenantId, runId);
    if (snapshot !== null) {
      return snapshotToStatus(snapshot);
    }

    const events = await this.deps.stateStoreRead.listEvents(tenantId, runId);
    return this.deps.projector.rebuild(runId, events);
  }

  private async preflightRecoverRun(
    planRef: PlanRef,
    context: RunContext,
    sourceMetadata: {
      runId: string;
      logicalAttemptId: number;
      originRunId?: string;
    }
  ): Promise<void> {
    const guard = new StartRunAdmissionGuard({
      policy: this.deps.policy,
      stateStoreRead: this.deps.stateStoreRead,
      adapters: this.deps.adapters,
      ...(this.deps.runExecutionContextResolver === undefined
        ? {}
        : { runExecutionContextResolver: this.deps.runExecutionContextResolver }),
    });
    const preflightContext: ResolvedRunContext = {
      ...context,
      logicalAttemptId: sourceMetadata.logicalAttemptId + 1,
      parentRunId: sourceMetadata.runId,
      originRunId: sourceMetadata.originRunId ?? sourceMetadata.runId,
    };

    await guard.assertStartRunAllowed(planRef, preflightContext);
    const adapter = guard.resolveAdapter(preflightContext);
    const verifiedArtifact = await new PlanIntegrityValidator().fetchAndValidate(
      planRef,
      this.deps.planFetcher
    );
    await guard.assertExecutionPolicyAllowed(
      planRef,
      verifiedArtifact.executionPolicy,
      preflightContext,
      adapter
    );
  }

  private async reserveRetryAttempt(
    sourceMetadata: {
      runId: string;
      logicalAttemptId: number;
      originRunId?: string;
    },
    tenantId: string
  ): Promise<{
    parentRunId: string;
    originRunId: string;
    logicalAttemptId: number;
  }> {
    if (this.deps.stateStoreWrite.reserveRetryAttempt === undefined) {
      throw new Error('stateStoreWrite.reserveRetryAttempt is required for recoverRun');
    }

    return this.deps.stateStoreWrite.reserveRetryAttempt(tenantId, sourceMetadata.runId);
  }
}

const TERMINAL_RUN_STATUSES = new Set<RunStatus>(['COMPLETED', 'FAILED', 'CANCELLED']);

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
