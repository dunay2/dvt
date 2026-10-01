/**
 * @file packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
 * @baseline ADR-0001: Temporal Integration Test Policy (Build Preconditions + Lifecycle Discipline)
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0030: Pre-Dispatch Intent Log and observation-only reconciliation
 * @decision Section 3 - Provider adapter delegates run lifecycle to Temporal workflow primitives
 * @decision Section 5 - Provider status uses workflow handle.describe() and returns provider-native live status
 * @decision Observe exact Temporal executions without treating missing history as non-execution proof
 * @consequence Temporal provider operations remain deterministic and aligned with engine lifecycle semantics
 * @version 1.2.0
 * @date 2026-03-08
 */
import { Buffer } from 'node:buffer';

import {
  CURRENT_SIGNAL_SEMANTICS_VERSION,
  type EngineRunRef,
  type PlanRef,
  type ProviderRunStatusView,
  type ResolvedRunContext,
  type SignalSemanticsVersion,
  type SignalRequest,
  parseEngineRunRef,
  parsePlanRef,
  parseResolvedRunContext,
  parseSignalRequest,
} from '@dvt/contracts';
import { RUN_PLAN_WORKFLOW, WorkflowSignals } from '@dvt/contracts';
import type { IProviderAdapter, ProviderRunObservation } from '@dvt/engine';
import { WorkflowIdConflictPolicy, WorkflowIdReusePolicy } from '@temporalio/client';

import type { TemporalAdapterConfig } from './config.js';
import type { TemporalClientManager } from './TemporalClient.js';
import { isWorkflowNotFound } from './temporalErrorPolicy.js';
import { withAbortSignalTimeout, withTimeoutMs } from './temporalObservability.js';
import {
  extractRuntimeStatusFromDescribe,
  toProviderRunStatusView,
  toTemporalRunRef,
  toTemporalTaskQueue,
  toTemporalWorkflowId,
  toStartRunObservation,
} from './WorkflowMapper.js';
import type { WorkflowStepActivityRouting } from './workflows/runPlanWorkflow.types.js';

interface WorkflowHandleLike {
  cancel(): Promise<unknown>;
  signal(signalName: string, ...args: unknown[]): Promise<void>;
  query?<TResult>(queryName: string, ...args: unknown[]): Promise<TResult>;
  /**
   * Fetches the workflow execution description from the Temporal server.
   * Throws a WorkflowNotFoundError (name === 'WorkflowNotFoundError') when the
   * workflow does not exist. Observation distinguishes this from a failed read.
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
  getHandle(workflowId: string, runId?: string): WorkflowHandleLike;
}

export interface TemporalAdapterDeps {
  clientManager?: TemporalClientManager;
  workflowClient?: WorkflowClientLike;
  config: TemporalAdapterConfig;
  additionalCapabilities?: readonly string[];
}

/**
 * Core capabilities declared by the Temporal adapter. Plugin executor
 * capabilities are supplied by runtime composition through `additionalCapabilities`.
 */
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

  async startRun(planRef: PlanRef, ctx: ResolvedRunContext): Promise<EngineRunRef> {
    const validatedPlanRef = parsePlanRef(planRef);
    const validatedCtx = parseResolvedRunContext(ctx);
    const workflowClient = await this.getClient();

    const workflowId = toTemporalWorkflowId(validatedCtx.runId);
    const taskQueue = toTemporalTaskQueue(validatedCtx.tenantId, this.deps.config);
    const workflowInput = {
      planRef: validatedPlanRef,
      ctx: validatedCtx,
      maxContinueAsNewPayloadBytes: this.deps.config.workflowBudget.maxContinueAsNewPayloadBytes,
      continueAsNewAfterLayerCount: this.deps.config.workflowBudget.continueAsNewAfterLayerCount,
      ...toWorkflowStepActivityRoutingInput(this.deps.config),
    };

    assertWorkflowStartPayloadWithinLimit(
      workflowInput,
      this.deps.config.workflowBudget.maxStartPayloadBytes
    );

    const started = await workflowClient.start(RUN_PLAN_WORKFLOW, {
      taskQueue,
      workflowId,
      workflowIdReusePolicy: WorkflowIdReusePolicy.REJECT_DUPLICATE,
      workflowIdConflictPolicy: WorkflowIdConflictPolicy.FAIL,
      args: [workflowInput],
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

  async cancelRun(runRef: EngineRunRef, executionId?: string): Promise<void> {
    const validatedRunRef = parseEngineRunRef(runRef);
    const workflowClient = await this.getClient();
    if (executionId !== undefined && !executionId.trim())
      throw new Error('TEMPORAL_EXECUTION_ID_REQUIRED');
    await workflowClient.getHandle(validatedRunRef.workflowId, executionId).cancel();
  }

  async getProviderStatusView(runRef: EngineRunRef): Promise<ProviderRunStatusView> {
    const validatedRunRef = parseEngineRunRef(runRef);
    const workflowClient = await this.getClient();
    const handle = workflowClient.getHandle(validatedRunRef.workflowId);
    const describeResult = await handle.describe();
    const runtimeStatus = extractRuntimeStatusFromDescribe(describeResult);
    return toProviderRunStatusView({ runtimeStatus });
  }

  async signal(runRef: EngineRunRef, request: SignalRequest): Promise<void> {
    const validatedRunRef = parseEngineRunRef(runRef);
    const validatedRequest = parseSignalRequest(request);
    const workflowClient = await this.getClient();
    const workflow = workflowClient.getHandle(validatedRunRef.workflowId) as WorkflowHandleLike;
    const dispatch = mapCanonicalSignalToTemporalDispatch(validatedRequest);
    await workflow.signal(dispatch.signalName, ...dispatch.args);
  }

  capabilities(): readonly string[] {
    return Array.from(
      new Set([...TEMPORAL_CAPABILITIES, ...(this.deps.additionalCapabilities ?? [])])
    );
  }

  signalSemanticsVersions(): readonly SignalSemanticsVersion[] {
    return [CURRENT_SIGNAL_SEMANTICS_VERSION];
  }

  /**
   * ADR-0030 - Observes the exact Temporal execution for the given logical runId
   * without requiring a stored EngineRunRef.
   *
   * Used by RunMaintenanceService.reconcileOrphanedIntents() to reconcile an
   * uncertain start or observe whether compensation has reached a terminal state.
   *
   * Returns missing_at_observation when the workflow is not found; this does not
   * prove that a start never occurred or authorize another start request.
   * Propagates any non-not-found error (network failure, auth error, etc.).
   */
  async observeStartRun(runId: string, tenantId: string): Promise<ProviderRunObservation> {
    const workflowId = toTemporalWorkflowId(runId);
    const taskQueue = toTemporalTaskQueue(tenantId, this.deps.config);
    const client = await this.getClient();
    const handle = client.getHandle(workflowId);
    try {
      const description = await this.describeWithTimeout(client, handle);
      const runRef = toTemporalRunRef({
        tenantId,
        workflowId,
        runId,
        config: this.deps.config,
        taskQueue,
      });
      return toStartRunObservation(description, runRef);
    } catch (error) {
      if (isWorkflowNotFound(error)) {
        return { kind: 'missing_at_observation' };
      }
      throw error;
    }
  }

  /**
   * Verifies the Temporal connection is alive.
   * Called by IRunHealthService.healthCheck() to report adapter liveness.
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
  ): Promise<unknown> {
    // Real Temporal workflow clients expose BaseClient.withAbortSignal().
    // Prefer that path so lookup probes stop the underlying RPC on timeout.
    if (typeof client.withAbortSignal === 'function') {
      return withAbortSignalTimeout(
        (signal) => client.withAbortSignal!(signal, () => handle.describe()),
        this.deps.config.timeouts.requestTimeoutMs,
        'observeStartRun.describe'
      );
    }

    // Test doubles and minimal injected clients may not implement SDK helpers.
    return withTimeoutMs(
      handle.describe(),
      this.deps.config.timeouts.requestTimeoutMs,
      'observeStartRun.describe'
    );
  }
}

function toWorkflowStepActivityRoutingInput(config: TemporalAdapterConfig): {
  stepActivityRouting?: WorkflowStepActivityRouting;
} {
  const routes = config.activityRouting.routesByStepKind;
  if (Object.keys(routes).length === 0) {
    return {};
  }

  return {
    stepActivityRouting: {
      routesByStepKind: { ...routes },
    },
  };
}

function mapCanonicalSignalToTemporalDispatch(request: SignalRequest): {
  signalName: (typeof WorkflowSignals)[keyof typeof WorkflowSignals];
  args: unknown[];
} {
  switch (request.type) {
    case 'PAUSE':
      return {
        signalName: WorkflowSignals.PAUSE,
        args: [request.signalId],
      };
    case 'RESUME':
      return {
        signalName: WorkflowSignals.RESUME,
        args: [request.signalId],
      };
    case 'CANCEL':
      return {
        signalName: WorkflowSignals.CANCEL,
        args: [request.signalId, request.reason],
      };
    default: {
      const exhaustive: never = request.type;
      throw new Error(`TEMPORAL_SIGNAL_UNSUPPORTED: ${String(exhaustive)}`);
    }
  }
}

function assertWorkflowStartPayloadWithinLimit(
  workflowInput: {
    planRef: PlanRef;
    ctx: ResolvedRunContext;
    maxContinueAsNewPayloadBytes: number;
    continueAsNewAfterLayerCount: number;
  },
  maxBytes: number
): void {
  const serializedSizeBytes = Buffer.byteLength(JSON.stringify([workflowInput]), 'utf8');
  if (serializedSizeBytes > maxBytes) {
    throw new Error(
      `TEMPORAL_START_PAYLOAD_TOO_LARGE: sizeBytes=${serializedSizeBytes} maxBytes=${maxBytes}`
    );
  }
}
