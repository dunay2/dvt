/**
 * @file packages/@dvt/engine/src/adapters/mock/MockAdapter.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Decision — The mock adapter executes steps and emits canonical events to validate engine semantics without an external runtime
 * @consequence Tests and local development verify run/step lifecycle using the same domain event model
 * @version 1.0.0
 * @date 2026-02-21
 */
import {
  asNonBlankString,
  CURRENT_SIGNAL_SEMANTICS_VERSION,
  CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  CURRENT_EXECUTION_PLAN_VERSION,
  type CanonicalRunStatus,
  type ProviderRunStatusView,
  type EngineRunRef,
  type ExecutionPlan,
  type PlanRef,
  type ResolvedRunContext,
  type SignalSemanticsVersion,
  type SignalRequest,
} from '@dvt/contracts';

import { RunMetadataNotFoundError } from '../../contracts/errors.js';
import { IdempotencyKeyBuilder } from '../../core/idempotency.js';
import { buildRunEvents } from '../../core/lifecycle/coreRuntime.js';
import { SnapshotProjector } from '../../core/SnapshotProjector.js';
import type { IRunStateStoreRead, IRunStateStoreWrite } from '../../ports/IRunStateStore.js';
import type { IClock } from '../../utils/clock.js';
import type { IProviderAdapter } from '../IProviderAdapter.js';

export interface MockAdapterDeps {
  stateStore: IRunStateStoreRead;
  stateStoreWrite: IRunStateStoreWrite;
  clock: Pick<IClock, 'nowIsoUtc'>;
  idempotency?: IdempotencyKeyBuilder;
  projector: SnapshotProjector;
}

/** Contract versions this adapter implementation can execute. */
const SUPPORTED_CONTRACT_VERSIONS = [CURRENT_EXECUTION_PLAN_CONTRACT_VERSION] as const;

/** Capabilities declared by the mock adapter. Must stay in sync with adapters.capabilities.json. */
const MOCK_CAPABILITIES = [
  'basic-execution',
  'signal.pause.native',
  'workflow.fan.parallel',
] as const;

export class MockAdapter implements IProviderAdapter {
  readonly provider = 'mock' as const;
  private readonly clock: Pick<IClock, 'nowIsoUtc'>;
  private readonly idempotency: IdempotencyKeyBuilder;

  constructor(private readonly deps: MockAdapterDeps) {
    this.clock = deps.clock;
    this.idempotency = deps.idempotency ?? new IdempotencyKeyBuilder();
  }

  estimateRunRef(ctx: ResolvedRunContext): EngineRunRef {
    return {
      provider: 'mock',
      tenantId: ctx.tenantId,
      workflowId: asNonBlankString(`mock_${ctx.runId}`),
      runId: ctx.runId,
    };
  }

  async startRun(
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

    validateMockPlanMetadata(effectivePlan.metadata);

    const runRef: EngineRunRef = {
      provider: 'mock',
      tenantId: ctx.tenantId,
      workflowId: asNonBlankString(`mock_${ctx.runId}`),
      runId: ctx.runId,
    };

    for (const step of effectivePlan.steps) {
      validateMockStep(step);
    }

    return runRef;
  }

  async cancelRun(runRef: EngineRunRef): Promise<void> {
    await this.appendCancelLifecycle(runRef);
  }

  async getProviderStatusView(runRef: EngineRunRef): Promise<ProviderRunStatusView> {
    const events = await this.deps.stateStore.listEvents(runRef.tenantId, runRef.runId);
    const canonical = this.deps.projector.rebuild(runRef.runId, events);
    return toMockProviderStatusView(canonical);
  }

  async signal(runRef: EngineRunRef, request: SignalRequest): Promise<void> {
    const dispatch = mapCanonicalSignalToMockDispatch(request);
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

  capabilities(): readonly string[] {
    return MOCK_CAPABILITIES;
  }

  signalSemanticsVersions(): readonly SignalSemanticsVersion[] {
    return [CURRENT_SIGNAL_SEMANTICS_VERSION];
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

function mapCanonicalSignalToMockDispatch(request: SignalRequest): {
  kind: 'cancel' | 'pause' | 'resume';
} {
  switch (request.type) {
    case 'CANCEL':
      return { kind: 'cancel' };
    case 'PAUSE':
      return { kind: 'pause' };
    case 'RESUME':
      return { kind: 'resume' };
    default: {
      const exhaustive: never = request.type;
      throw new Error(`MOCK_SIGNAL_UNSUPPORTED: ${String(exhaustive)}`);
    }
  }
}

function validateMockPlanMetadata(metadata: ExecutionPlan['metadata']): void {
  if (!(SUPPORTED_CONTRACT_VERSIONS as readonly string[]).includes(metadata.contractVersion)) {
    throw new Error(
      `PLAN_CONTRACT_VERSION_UNKNOWN: ${metadata.contractVersion}. Supported: ${SUPPORTED_CONTRACT_VERSIONS.join(', ')}`
    );
  }
}

function validateMockStep(step: ExecutionPlan['steps'][number]): void {
  // Adapter narrowing rule: reject unrecognized fields.
  // For mock we allow the governed canonical step fields only.
  const allowed = new Set([
    'stepId',
    'kind',
    'dependsOn',
    'retryPolicy',
    'stepTypeConfig',
    'type',
    'gateway',
  ]);
  for (const k of Object.keys(step)) {
    if (!allowed.has(k)) {
      throw new Error(`INVALID_STEP_SCHEMA: field_not_allowed:${k}`);
    }
  }

  if (!Array.isArray(step.dependsOn) && typeof step.dependsOn !== 'undefined') {
    throw new TypeError('INVALID_STEP_SCHEMA: dependsOn_must_be_array');
  }

  if (Array.isArray(step.dependsOn) && step.dependsOn.some((dep) => typeof dep !== 'string')) {
    throw new Error('INVALID_STEP_SCHEMA: dependsOn_values_must_be_string');
  }
}

function toMockProviderStatusView(canonical: CanonicalRunStatus): ProviderRunStatusView {
  return {
    provider: 'mock',
    providerStatus: canonical.status,
    ...(canonical.substatus === undefined ? {} : { providerSubstatus: canonical.substatus }),
    ...(canonical.message === undefined ? {} : { message: canonical.message }),
  };
}
