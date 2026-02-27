/**
 * @file packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
 * @baseline ADR-0001: Temporal Integration Test Policy (Build Preconditions + Lifecycle Discipline)
 * @baseline ADR-0003: Execution Model
 * @decision Section 3 — Provider adapter delegates run lifecycle to Temporal workflow primitives
 * @decision Section 5 — Status reconstruction uses persisted events + projector for deterministic snapshots
 * @consequence Temporal provider operations remain deterministic and aligned with engine lifecycle semantics
 * @version 1.0.0
 * @date 2026-02-21
 */
import {
  type EngineRunRef,
  type IProviderAdapter,
  type PlanRef,
  type RunContext,
  type RunStatusSnapshot,
  type SignalRequest,
  parseEngineRunRef,
  parsePlanRef,
  parseRunContext,
  parseSignalRequest,
} from '@dvt/contracts';
import { RUN_PLAN_WORKFLOW, WorkflowSignals } from '@dvt/contracts';

import type { TemporalAdapterConfig } from './config.js';
import type { TemporalClientManager } from './TemporalClient.js';
import { toTemporalRunRef, toTemporalTaskQueue, toTemporalWorkflowId } from './WorkflowMapper.js';

interface WorkflowHandleLike {
  cancel(): Promise<unknown>;
  signal(signalName: string, ...args: unknown[]): Promise<void>;
}

interface WorkflowClientLike {
  start(
    workflowType: string,
    options: unknown
  ): Promise<{
    workflowId: string;
    firstExecutionRunId?: string;
  }>;
  getHandle(workflowId: string): WorkflowHandleLike;
}

interface IRunStateStoreLike {
  listEvents(tenantId: string, runId: string): Promise<unknown[]>;
}

interface SnapshotProjectorLike {
  rebuild(runId: string, events: unknown[]): RunStatusSnapshot;
}

export interface TemporalAdapterDeps {
  clientManager?: TemporalClientManager;
  workflowClient?: WorkflowClientLike;
  config: TemporalAdapterConfig;
  stateStore: IRunStateStoreLike;
  projector: SnapshotProjectorLike;
}

/** Capabilities declared by the Temporal adapter. Must stay in sync with adapters.capabilities.json. */
const TEMPORAL_CAPABILITIES = [
  'basic-execution',
  'signal.pause.native',
  'workflow.fan.parallel',
  'history.rotation',
] as const;

export class TemporalAdapter implements IProviderAdapter {
  readonly provider = 'temporal' as const;

  constructor(private readonly deps: TemporalAdapterDeps) {}

  async startRun(planRef: PlanRef, ctx: RunContext): Promise<EngineRunRef> {
    const validatedPlanRef = parsePlanRef(planRef);
    const validatedCtx = parseRunContext(ctx);
    const workflowClient = await this.getClient();

    const workflowId = toTemporalWorkflowId(validatedCtx.runId);
    const taskQueue = toTemporalTaskQueue(validatedCtx.tenantId, this.deps.config);

    const started = await workflowClient.start(RUN_PLAN_WORKFLOW, {
      taskQueue,
      workflowId,
      args: [
        {
          planRef: validatedPlanRef,
          ctx: validatedCtx,
          continueAsNewAfterLayerCount: this.deps.config.continueAsNewAfterLayerCount,
        },
      ],
    });

    const runId =
      typeof started.firstExecutionRunId === 'string' && started.firstExecutionRunId.length > 0
        ? started.firstExecutionRunId
        : validatedCtx.runId;

    return toTemporalRunRef({
      tenantId: validatedCtx.tenantId,
      workflowId: started.workflowId,
      runId,
      config: this.deps.config,
      taskQueue,
    });
  }

  async cancelRun(runRef: EngineRunRef): Promise<void> {
    const validatedRunRef = parseEngineRunRef(runRef);
    const workflowClient = await this.getClient();
    await workflowClient.getHandle(validatedRunRef.workflowId).cancel();
  }

  async getRunStatus(runRef: EngineRunRef): Promise<RunStatusSnapshot> {
    const validatedRunRef = parseEngineRunRef(runRef);
    // Operational authority is persisted projection, not Workflow query state.
    const events = await this.deps.stateStore.listEvents(
      validatedRunRef.tenantId,
      validatedRunRef.runId
    );
    return this.deps.projector.rebuild(validatedRunRef.runId, events);
  }

  async signal(runRef: EngineRunRef, request: SignalRequest): Promise<void> {
    const validatedRunRef = parseEngineRunRef(runRef);
    const validatedRequest = parseSignalRequest(request);
    const workflowClient = await this.getClient();
    const workflow = workflowClient.getHandle(validatedRunRef.workflowId) as WorkflowHandleLike;

    switch (validatedRequest.type) {
      case 'PAUSE':
        await workflow.signal(WorkflowSignals.PAUSE);
        return;
      case 'RESUME':
        await workflow.signal(WorkflowSignals.RESUME);
        return;
      case 'CANCEL':
        // Canonicalize cancellation on the provider-native cancel path so both
        // `cancelRun()` and `signal(CANCEL)` follow the same execution semantics.
        await workflow.cancel();
        return;
      case 'RETRY_STEP':
      case 'RETRY_RUN':
        throw new Error('NotImplemented: RETRY_* signals are Phase 2');
      default: {
        const _never: never = validatedRequest.type;
        throw new Error(`Unknown signal type: ${String(_never)}`);
      }
    }
  }

  capabilities(): readonly string[] {
    return TEMPORAL_CAPABILITIES;
  }

  /**
   * Verifies the Temporal connection is alive.
   * Called by WorkflowEngine.healthCheck() to report adapter liveness.
   */
  async ping(): Promise<void> {
    if (!this.deps.clientManager) {
      // workflowClient injected directly (test mode) — treat as up.
      return;
    }
    if (!this.deps.clientManager.isConnected()) {
      throw new Error('TEMPORAL_CLIENT_NOT_CONNECTED');
    }
    await this.deps.clientManager.ensureConnected();
  }

  private async getClient(): Promise<WorkflowClientLike> {
    if (this.deps.workflowClient) {
      return this.deps.workflowClient;
    }
    if (!this.deps.clientManager) {
      throw new Error('TEMPORAL_CLIENT_NOT_CONFIGURED');
    }
    if (!this.deps.clientManager.isConnected()) {
      await this.deps.clientManager.connect();
    }
    return this.deps.clientManager.getClient().client.workflow;
  }
}
