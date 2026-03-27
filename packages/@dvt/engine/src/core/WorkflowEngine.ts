/**
 * @file packages/@dvt/engine/src/core/WorkflowEngine.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @decision WorkflowEngine is an application-facing facade that delegates
 *   startRun to StartRunCoordinator and lifecycle operations to WorkflowEngineCoreService.
 * @consequence Runtime orchestration responsibilities are split into focused collaborators.
 */
import { parsePlanRef, parseRunContext } from '@dvt/contracts';
import type {
  EngineRunRef,
  PlanRef,
  ResolvedRunContext,
  RunContext,
  RunStatusSnapshot,
  SignalRequest,
} from '@dvt/contracts';
import type { IObservability } from '@dvt/observability';

import type { IProviderAdapter } from '../adapters/IProviderAdapter.js';
import { StartRunAdmissionGuard } from '../application/StartRunAdmissionGuard.js';
import { StartRunCoordinator } from '../application/StartRunCoordinator.js';
import { AdapterNotRegisteredError } from '../contracts/errors.js';
import type { IWorkflowEngine } from '../contracts/IWorkflowEngine.v1_1_1.js';
import type { IWorkflowEngineCore } from '../domain/IWorkflowEngineCore.js';
import type { IRunStateStoreRead, IRunStateStoreWrite } from '../ports/IRunStateStore.js';
import type { IStartRunIntentStore } from '../ports/IStartRunIntentStore.js';
import type { IRunAccessPolicy } from '../security/RunAccessPolicy.js';
import type { IClock } from '../utils/clock.js';
import { toErrorMessage } from '../utils/errorUtils.js';

import { IdempotencyKeyBuilder } from './idempotency.js';
import { SnapshotProjector } from './SnapshotProjector.js';
import { WorkflowEngineCoreService } from './WorkflowEngineCoreService.js';

export interface WorkflowEngineDeps {
  stateStoreRead: IRunStateStoreRead;
  stateStoreWrite: IRunStateStoreWrite;
  projector: SnapshotProjector;
  idempotency: IdempotencyKeyBuilder;
  clock: IClock;
  policy: IRunAccessPolicy;
  intentStore: IStartRunIntentStore;
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  requiredProviders?: EngineRunRef['provider'][];
  observability: IObservability;
  timeouts?: {
    adapterCallMs?: number;
    outboxEnqueueMs?: number;
  };
  observabilityFallbackThrottleMs?: number;
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
  private readonly startRunCoordinator: StartRunCoordinator;
  private readonly core: IWorkflowEngineCore;

  constructor(private readonly deps: WorkflowEngineDeps) {
    this.validateDependencies();
    this.observability = deps.observability;

    const startRunAdmissionGuard = new StartRunAdmissionGuard({
      policy: deps.policy,
      stateStoreRead: deps.stateStoreRead,
      adapters: deps.adapters,
    });
    this.startRunCoordinator = new StartRunCoordinator({
      policy: deps.policy,
      guard: startRunAdmissionGuard,
      stateStoreRead: deps.stateStoreRead,
      stateStoreWrite: deps.stateStoreWrite,
      idempotency: deps.idempotency,
      clock: deps.clock,
      intentStore: deps.intentStore,
      observability: deps.observability,
      ...(deps.timeouts ? { timeouts: deps.timeouts } : {}),
      ...(deps.observabilityFallbackThrottleMs === undefined
        ? {}
        : { observabilityFallbackThrottleMs: deps.observabilityFallbackThrottleMs }),
    });
    this.core = new WorkflowEngineCoreService({
      stateStoreRead: deps.stateStoreRead,
      stateStoreWrite: deps.stateStoreWrite,
      projector: deps.projector,
      idempotency: deps.idempotency,
      policy: deps.policy,
      adapters: deps.adapters,
      observability: deps.observability,
      ...(deps.timeouts ? { timeouts: deps.timeouts } : {}),
      clock: deps.clock,
    });
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
            const runRef = await this.startRunCoordinator.execute(
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
    await this.core.cancel(engineRunRef);
  }

  async getRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot> {
    return this.core.getStatus(engineRunRef);
  }

  async enrichRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot> {
    return this.core.enrichStatus(engineRunRef);
  }

  async signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void> {
    await this.core.signal(engineRunRef, request);
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
      ['idempotency', this.deps.idempotency],
      ['clock', this.deps.clock],
      ['policy', this.deps.policy],
      ['intentStore', this.deps.intentStore],
      ['adapters', this.deps.adapters],
      ['observability', this.deps.observability],
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

function buildTraceContext(
  input: Pick<RunContext, 'tenantId' | 'projectId' | 'environmentId' | 'runId'> & {
    targetAdapter?: EngineRunRef['provider'];
    provider?: EngineRunRef['provider'];
  },
  planId?: string
): {
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
  planId?: string;
  adapter?: 'temporal' | 'conductor' | 'local';
} {
  const raw = input.targetAdapter ?? input.provider;
  const adapter: 'temporal' | 'conductor' | undefined =
    raw === 'temporal' || raw === 'conductor' ? raw : undefined;
  return {
    tenantId: input.tenantId,
    projectId: input.projectId,
    environmentId: input.environmentId,
    runId: input.runId,
    ...(planId ? { planId } : {}),
    ...(adapter ? { adapter } : {}),
  };
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
  if (input.requiresCapabilities !== undefined) {
    planRef.requiresCapabilities = input.requiresCapabilities;
  }
  return planRef;
}

function normalizeRunContext(input: ReturnType<typeof parseRunContext>): RunContext {
  return {
    tenantId: input.tenantId,
    projectId: input.projectId,
    environmentId: input.environmentId,
    runId: input.runId,
    targetAdapter: input.targetAdapter,
  };
}

function resolveInitialRunContext(ctx: RunContext): ResolvedRunContext {
  return {
    ...ctx,
    logicalAttemptId: 1,
    originRunId: ctx.runId,
  };
}
