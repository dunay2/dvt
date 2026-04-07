/**
 * @file packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
 * @baseline ADR-0001: Temporal Integration Test Policy (Build Preconditions + Lifecycle Discipline)
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0030: Pre-Dispatch Intent Log - lookupRunRef for PENDING intent reconciliation
 * @decision Section 3 - Provider adapter delegates run lifecycle to Temporal workflow primitives
 * @decision Section 5 - Status queries use the workflow statusQuery and return provider-native live status
 * @decision ADR-0030 section 3.3 - lookupRunRef derives workflowId from runId and probes Temporal to detect orphans
 * @consequence Temporal provider operations remain deterministic and aligned with engine lifecycle semantics
 * @version 1.2.0
 * @date 2026-03-08
 */
import {
  type EngineRunRef,
  type ExecutionPlan,
  type PlanRef,
  type ResolvedRunContext,
  type RunStatusSnapshot,
  type SignalRequest,
  parseEngineRunRef,
  parsePlanRef,
  parseResolvedRunContext,
  parseSignalRequest,
} from '@dvt/contracts';
import { RUN_PLAN_WORKFLOW, WorkflowSignals } from '@dvt/contracts';
import type { IProviderAdapter } from '@dvt/engine';

import type { TemporalAdapterConfig } from './config.js';
import type { TemporalClientManager } from './TemporalClient.js';
import { isWorkflowNotFound } from './temporalErrorPolicy.js';
import { withAbortSignalTimeout, withTimeoutMs } from './temporalObservability.js';
import {
  toRunStatusSnapshotFromWorkflowState,
  toTemporalRunRef,
  toTemporalTaskQueue,
  toTemporalWorkflowId,
} from './WorkflowMapper.js';
import type { WorkflowState } from './workflows/RunPlanWorkflow.js';

interface WorkflowHandleLike {
  cancel(): Promise<unknown>;
  signal(signalName: string, ...args: unknown[]): Promise<void>;
  query?<TResult>(queryName: string, ...args: unknown[]): Promise<TResult>;
  /**
   * Fetches the workflow execution description from the Temporal server.
   * Throws a WorkflowNotFoundError (name === 'WorkflowNotFoundError') when the
   * workflow does not exist. Used by lookupRunRef for orphan detection.
   */
  describe(): Promise<unknown>;
}

interface WorkflowClientLike {
  start(
    workflowType: string,
    options: unknown
  ): Promise<{
    workflowId: string;
    firstExecutionRunId?: string;
  }>;
  withAbortSignal?<R>(abortSignal: globalThis.AbortSignal, fn: () => Promise<R>): Promise<R>;
  getHandle(workflowId: string): WorkflowHandleLike;
}

export interface TemporalAdapterDeps {
  clientManager?: TemporalClientManager;
  workflowClient?: WorkflowClientLike;
  config: TemporalAdapterConfig;
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

  estimateRunRef(ctx: ResolvedRunContext): EngineRunRef {
    const validatedCtx = parseResolvedRunContext(ctx);
    const workflowId = toTemporalWorkflowId(validatedCtx.runId);
    const taskQueue = toTemporalTaskQueue(validatedCtx.tenantId, this.deps.config);
    return toTemporalRunRef({
      tenantId: validatedCtx.tenantId,
      workflowId,
      // Temporal assigns firstExecutionRunId only after start. Before that, the
      // engine can still pre-bootstrap metadata using the stable caller runId.
      runId: validatedCtx.runId,
      config: this.deps.config,
      taskQueue,
    });
  }

  async startRun(
    plan: ExecutionPlan,
    planRef: PlanRef,
    ctx: ResolvedRunContext
  ): Promise<EngineRunRef> {
    const validatedPlanRef = parsePlanRef(planRef);
    const validatedCtx = parseResolvedRunContext(ctx);
    const workflowClient = await this.getClient();

    const workflowId = toTemporalWorkflowId(validatedCtx.runId);
    const taskQueue = toTemporalTaskQueue(validatedCtx.tenantId, this.deps.config);

    const started = await workflowClient.start(RUN_PLAN_WORKFLOW, {
      taskQueue,
      workflowId,
      args: [
        {
          plan,
          planRef: validatedPlanRef,
          ctx: validatedCtx,
          continueAsNewAfterLayerCount: this.deps.config.continueAsNewAfterLayerCount,
        },
      ],
    });

    return toTemporalRunRef({
      tenantId: validatedCtx.tenantId,
      workflowId: started.workflowId,
      // Keep EngineRunRef keyed to the canonical logical runId. Temporal's
      // execution runId is provider-internal; event/state stores are indexed
      // by the caller-stable ctx.runId.
      runId: validatedCtx.runId,
      config: this.deps.config,
      taskQueue,
    });
  }

  async cancelRun(runRef: EngineRunRef): Promise<void> {
    const validatedRunRef = parseEngineRunRef(runRef);
    const workflowClient = await this.getClient();
    await workflowClient.getHandle(validatedRunRef.workflowId).signal(WorkflowSignals.CANCEL);
  }

  async getRunStatus(runRef: EngineRunRef): Promise<RunStatusSnapshot> {
    const validatedRunRef = parseEngineRunRef(runRef);
    const workflowClient = await this.getClient();
    const workflow = workflowClient.getHandle(validatedRunRef.workflowId);

    if (typeof workflow.query !== 'function') {
      throw new Error('TEMPORAL_WORKFLOW_QUERY_NOT_SUPPORTED');
    }

    const state = await workflow.query<WorkflowState>('status');
    return toRunStatusSnapshotFromWorkflowState({
      runId: validatedRunRef.runId,
      state,
    });
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
        await workflow.signal(WorkflowSignals.CANCEL, validatedRequest.reason);
        return;
      case 'RETRY_STEP':
      case 'RETRY_RUN':
        throw new Error('NotImplemented: RETRY_* signals are Phase 2');
      default: {
        throw new Error(`Unknown signal type: ${String(validatedRequest.type)}`);
      }
    }
  }

  capabilities(): readonly string[] {
    return TEMPORAL_CAPABILITIES;
  }

  /**
   * ADR-0030 section 3.3 - Probes the Temporal server to determine whether a workflow
   * for the given runId exists, without requiring a stored EngineRunRef.
   *
   * Used by RunMaintenanceService.reconcileOrphanedIntents() to detect the crash
   * scenario where adapter.startRun() returned successfully but markDispatched()
   * was never called.
   *
   * Returns null when the workflow does not exist on the Temporal server.
   * Propagates any non-not-found error (network failure, auth error, etc.).
   */
  async lookupRunRef(runId: string, tenantId: string): Promise<EngineRunRef | null> {
    const workflowId = toTemporalWorkflowId(runId);
    const taskQueue = toTemporalTaskQueue(tenantId, this.deps.config);
    const client = await this.getClient();
    const handle = client.getHandle(workflowId);
    try {
      await this.describeWithTimeout(client, handle);
      return toTemporalRunRef({
        tenantId,
        workflowId,
        runId,
        config: this.deps.config,
        taskQueue,
      });
    } catch (error) {
      if (isWorkflowNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Verifies the Temporal connection is alive.
   * Called by WorkflowEngine.healthCheck() to report adapter liveness.
   */
  async ping(): Promise<void> {
    const clientManager = this.deps.clientManager;

    if (!clientManager) {
      // workflowClient injected directly (test mode) - treat as up.
      return;
    }

    if (!clientManager.isConnected()) {
      throw new Error('TEMPORAL_CLIENT_NOT_CONNECTED');
    }
    await clientManager.ensureConnected();
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

  private async describeWithTimeout(
    client: WorkflowClientLike,
    handle: WorkflowHandleLike
  ): Promise<void> {
    // Real Temporal workflow clients expose BaseClient.withAbortSignal().
    // Prefer that path so lookup probes stop the underlying RPC on timeout.
    if (typeof client.withAbortSignal === 'function') {
      await withAbortSignalTimeout(
        (signal) => client.withAbortSignal!(signal, () => handle.describe()),
        this.deps.config.requestTimeoutMs,
        'lookupRunRef.describe'
      );
      return;
    }

    // Test doubles and minimal injected clients may not implement SDK helpers.
    await withTimeoutMs(
      handle.describe(),
      this.deps.config.requestTimeoutMs,
      'lookupRunRef.describe'
    );
  }
}
