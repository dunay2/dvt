/**
 * @file packages/@dvt/engine/src/adapters/mock/MockAdapter.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Decision — The mock adapter executes steps and emits canonical events to validate engine semantics without an external runtime
 * @consequence Tests and local development verify run/step lifecycle using the same domain event model
 * @version 1.0.0
 * @date 2026-02-21
 */
import type {
  EngineRunRef,
  PlanRef,
  ResolvedRunContext,
  RunStatusSnapshot,
  SignalRequest,
} from '@dvt/contracts';

import type { ExecutionPlan } from '../../contracts/executionPlan.js';
import { IdempotencyKeyBuilder } from '../../core/idempotency.js';
import { SnapshotProjector } from '../../core/SnapshotProjector.js';
import type { IRunStateStoreRead } from '../../ports/IRunStateStore.js';
import type { IClock } from '../../utils/clock.js';
import type { IProviderAdapter } from '../IProviderAdapter.js';

export interface MockAdapterDeps {
  stateStore: IRunStateStoreRead;
  /** @deprecated Mock adapter no longer appends events directly; retained for compatibility. */
  clock?: IClock;
  /** @deprecated Mock adapter no longer appends events directly; retained for compatibility. */
  idempotency?: IdempotencyKeyBuilder;
  projector: SnapshotProjector;
  planFetcher?: {
    fetch(planRef: PlanRef): Promise<ExecutionPlan>;
  };
}

/** Contract versions this adapter implementation can execute. */
const SUPPORTED_CONTRACT_VERSIONS = ['1.0.0'] as const;

/** Capabilities declared by the mock adapter. Must stay in sync with adapters.capabilities.json. */
const MOCK_CAPABILITIES = [
  'basic-execution',
  'signal.pause.native',
  'workflow.fan.parallel',
] as const;

export class MockAdapter implements IProviderAdapter {
  readonly provider = 'mock' as const;

  constructor(private readonly deps: MockAdapterDeps) {}

  estimateRunRef(ctx: ResolvedRunContext): EngineRunRef {
    return {
      provider: 'mock',
      tenantId: ctx.tenantId,
      workflowId: `mock_${ctx.runId}`,
      runId: ctx.runId,
    };
  }

  async startRun(planRef: PlanRef, ctx: ResolvedRunContext): Promise<EngineRunRef> {
    const plan: ExecutionPlan = this.deps.planFetcher
      ? await this.deps.planFetcher.fetch(planRef)
      : {
          metadata: {
            planId: planRef.planId,
            planVersion: planRef.planVersion,
            schemaVersion: planRef.schemaVersion,
            contractVersion: '1.0.0',
          },
          steps: [],
        };

    validateMockPlanMetadata(plan.metadata);

    const runRef: EngineRunRef = {
      provider: 'mock',
      tenantId: ctx.tenantId,
      workflowId: `mock_${ctx.runId}`,
      runId: ctx.runId,
    };

    for (const step of plan.steps) {
      validateMockStep(step);
    }

    return runRef;
  }

  async cancelRun(_runRef: EngineRunRef): Promise<void> {
    // For mock, cancellation is cooperative; engine emits RunCancelled.
  }

  async getRunStatus(runRef: EngineRunRef): Promise<RunStatusSnapshot> {
    const events = await this.deps.stateStore.listEvents(runRef.tenantId, runRef.runId);
    return this.deps.projector.rebuild(runRef.runId, events);
  }

  async signal(_runRef: EngineRunRef, _request: SignalRequest): Promise<void> {
    // For mock, signals are interpreted by engine (pause/resume/cancel events).
  }

  capabilities(): readonly string[] {
    return MOCK_CAPABILITIES;
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
  // For mock we only allow: stepId, kind, dependsOn.
  const allowed = new Set(['stepId', 'kind', 'dependsOn']);
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
