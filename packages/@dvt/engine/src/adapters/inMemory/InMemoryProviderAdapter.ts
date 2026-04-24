/**
 * Owned concern: provide an in-memory IProviderAdapter test double without
 * adding a synthetic provider to the runtime contract vocabulary.
 */
import {
  asNonBlankString,
  CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  CURRENT_EXECUTION_PLAN_VERSION,
  CURRENT_SIGNAL_SEMANTICS_VERSION,
  type CanonicalRunStatus,
  type EngineRunRef,
  type ExecutionPlan,
  type PlanRef,
  type ProviderRunStatusView,
  type ResolvedRunContext,
  type SignalRequest,
  type SignalSemanticsVersion,
} from '@dvt/contracts';

import { RunMetadataNotFoundError } from '../../contracts/errors.js';
import { IdempotencyKeyBuilder } from '../../core/idempotency.js';
import { buildRunEvents } from '../../core/lifecycle/coreRuntime.js';
import { SnapshotProjector } from '../../core/SnapshotProjector.js';
import type { IRunStateStoreRead, IRunStateStoreWrite } from '../../ports/IRunStateStore.js';
import type { IClock } from '../../utils/clock.js';
import type { IProviderAdapter } from '../IProviderAdapter.js';

export interface InMemoryProviderAdapterDeps {
  stateStore: IRunStateStoreRead;
  stateStoreWrite: IRunStateStoreWrite;
  clock: Pick<IClock, 'nowIsoUtc'>;
  projector: SnapshotProjector;
  provider?: EngineRunRef['provider'];
  namespace?: string;
  taskQueue?: string;
  conductorUrl?: string;
  workflowIdPrefix?: string;
  idempotency?: IdempotencyKeyBuilder;
  capabilities?: readonly string[];
}

const SUPPORTED_CONTRACT_VERSIONS = [CURRENT_EXECUTION_PLAN_CONTRACT_VERSION] as const;
const DEFAULT_PROVIDER_CAPABILITIES = [
  'basic-execution',
  'signal.pause.native',
  'workflow.fan.parallel',
] as const;

export class InMemoryProviderAdapter implements IProviderAdapter {
  public readonly provider: EngineRunRef['provider'];
  private readonly clock: Pick<IClock, 'nowIsoUtc'>;
  private readonly idempotency: IdempotencyKeyBuilder;
  private readonly capabilitiesValue: readonly string[];

  public constructor(private readonly deps: InMemoryProviderAdapterDeps) {
    this.provider = deps.provider ?? 'temporal';
    this.clock = deps.clock;
    this.idempotency = deps.idempotency ?? new IdempotencyKeyBuilder();
    this.capabilitiesValue = deps.capabilities ?? DEFAULT_PROVIDER_CAPABILITIES;
  }

  public estimateRunRef(ctx: ResolvedRunContext): EngineRunRef {
    return this.toRunRef(ctx);
  }

  public async startRun(
    plan: ExecutionPlan,
    planRef: PlanRef,
    ctx: ResolvedRunContext
  ): Promise<EngineRunRef> {
    const effectivePlan: ExecutionPlan = plan ?? {
      metadata: {
        planId: planRef.planId,
        planVersion: CURRENT_EXECUTION_PLAN_VERSION,
        schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
        contractVersion: CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
        inputHashSha256: planRef.sha256,
        createdAtIso: this.deps.clock?.nowIsoUtc() ?? '1970-01-01T00:00:00.000Z',
      },
      steps: [],
    };

    validatePlanMetadata(effectivePlan.metadata);
    for (const step of effectivePlan.steps) {
      validateStep(step);
    }

    return this.toRunRef(ctx);
  }

  public async cancelRun(runRef: EngineRunRef): Promise<void> {
    await this.appendCancelLifecycle(runRef);
  }

  public async getProviderStatusView(runRef: EngineRunRef): Promise<ProviderRunStatusView> {
    const events = await this.deps.stateStore.listEvents(runRef.tenantId, runRef.runId);
    const canonical = this.deps.projector.rebuild(runRef.runId, events);
    return toProviderStatusView(runRef.provider, canonical);
  }

  public async signal(runRef: EngineRunRef, request: SignalRequest): Promise<void> {
    const dispatch = mapCanonicalSignalToDispatch(request);
    switch (dispatch.kind) {
      case 'cancel':
        await this.appendCancelLifecycle(runRef);
        return;
      case 'pause':
        await this.appendPauseResumeLifecycle(runRef, request, 'RunPaused');
        return;
      case 'resume':
        await this.appendPauseResumeLifecycle(runRef, request, 'RunResumed');
        return;
    }
  }

  public capabilities(): readonly string[] {
    return this.capabilitiesValue;
  }

  public signalSemanticsVersions(): readonly SignalSemanticsVersion[] {
    return [CURRENT_SIGNAL_SEMANTICS_VERSION];
  }

  private toRunRef(ctx: ResolvedRunContext): EngineRunRef {
    const workflowId = asNonBlankString(
      `${this.deps.workflowIdPrefix ?? 'in_memory'}_${ctx.runId}`
    );
    if (this.provider === 'conductor') {
      return {
        provider: 'conductor',
        tenantId: ctx.tenantId,
        workflowId,
        runId: ctx.runId,
        conductorUrl: asNonBlankString(this.deps.conductorUrl ?? 'memory://conductor'),
      };
    }

    const runRef: EngineRunRef = {
      provider: 'temporal',
      tenantId: ctx.tenantId,
      namespace: asNonBlankString(this.deps.namespace ?? 'in-memory'),
      workflowId,
      runId: ctx.runId,
    };
    if (this.deps.taskQueue !== undefined) {
      runRef.taskQueue = asNonBlankString(this.deps.taskQueue);
    }
    return runRef;
  }

  private async appendCancelLifecycle(runRef: EngineRunRef): Promise<void> {
    const meta = await this.deps.stateStore.getRunMetadataByRunId(runRef.tenantId, runRef.runId);
    if (!meta) {
      throw new RunMetadataNotFoundError(runRef.runId);
    }

    await this.deps.stateStoreWrite.appendAndEnqueueTx(
      runRef.runId,
      buildRunEvents([
        {
          idempotency: this.idempotency,
          clock: this.clock,
          meta,
          eventType: 'RunCancelRequested',
        },
        {
          idempotency: this.idempotency,
          clock: this.clock,
          meta,
          eventType: 'RunCancelled',
        },
      ]).map((event) => ({
        ...event,
        payloadVersion: 1,
      }))
    );
  }

  private async appendPauseResumeLifecycle(
    runRef: EngineRunRef,
    request: SignalRequest,
    eventType: 'RunPaused' | 'RunResumed'
  ): Promise<void> {
    const meta = await this.deps.stateStore.getRunMetadataByRunId(runRef.tenantId, runRef.runId);
    if (!meta) {
      throw new RunMetadataNotFoundError(runRef.runId);
    }

    const snapshot = await this.deps.stateStore.getSnapshot(runRef.tenantId, runRef.runId);
    if (eventType === 'RunPaused') {
      if (!snapshot || snapshot.status !== 'RUNNING' || snapshot.paused) {
        return;
      }
    } else if (!snapshot || snapshot.status !== 'PAUSED' || !snapshot.paused) {
      return;
    }

    await this.deps.stateStoreWrite.appendAndEnqueueTx(runRef.runId, [
      {
        eventId: this.idempotency.eventId(),
        eventType,
        payloadVersion: 1,
        emittedAt: this.clock.nowIsoUtc(),
        tenantId: meta.tenantId,
        projectId: meta.projectId,
        environmentId: meta.environmentId,
        runId: meta.runId,
        planId: meta.planId,
        planVersion: meta.planVersion,
        engineAttemptId: 1,
        logicalAttemptId: meta.logicalAttemptId,
        idempotencyKey: this.idempotency.signalKey(
          {
            runId: meta.runId,
            logicalAttemptId: meta.logicalAttemptId,
            planId: meta.planId,
            planVersion: meta.planVersion,
          },
          request
        ),
      },
    ]);
  }
}

function mapCanonicalSignalToDispatch(request: SignalRequest): {
  kind: 'cancel' | 'pause' | 'resume';
} {
  switch (request.type) {
    case 'CANCEL':
      return { kind: 'cancel' };
    case 'PAUSE':
      return { kind: 'pause' };
    case 'RESUME':
      return { kind: 'resume' };
  }
}

function validatePlanMetadata(metadata: ExecutionPlan['metadata']): void {
  if (!(SUPPORTED_CONTRACT_VERSIONS as readonly string[]).includes(metadata.contractVersion)) {
    throw new Error(
      `PLAN_CONTRACT_VERSION_UNKNOWN: ${metadata.contractVersion}. Supported: ${SUPPORTED_CONTRACT_VERSIONS.join(', ')}`
    );
  }
}

function validateStep(step: ExecutionPlan['steps'][number]): void {
  const allowed = new Set([
    'stepId',
    'kind',
    'dependsOn',
    'retryPolicy',
    'stepTypeConfig',
    'type',
    'gateway',
  ]);
  for (const key of Object.keys(step)) {
    if (!allowed.has(key)) {
      throw new Error(`INVALID_STEP_SCHEMA: field_not_allowed:${key}`);
    }
  }

  if (!Array.isArray(step.dependsOn) && typeof step.dependsOn !== 'undefined') {
    throw new TypeError('INVALID_STEP_SCHEMA: dependsOn_must_be_array');
  }

  if (Array.isArray(step.dependsOn) && step.dependsOn.some((dep) => typeof dep !== 'string')) {
    throw new Error('INVALID_STEP_SCHEMA: dependsOn_values_must_be_string');
  }
}

function toProviderStatusView(
  provider: EngineRunRef['provider'],
  canonical: CanonicalRunStatus
): ProviderRunStatusView {
  return {
    provider,
    providerStatus: canonical.status,
    ...(canonical.substatus === undefined ? {} : { providerSubstatus: canonical.substatus }),
    ...(canonical.message === undefined ? {} : { message: canonical.message }),
  };
}
