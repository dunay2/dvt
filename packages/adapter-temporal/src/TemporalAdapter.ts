import type {
  EngineRunRef,
  PlanRef,
  RunContext,
  RunStatusSnapshot,
  SignalRequest,
} from '@dvt/contracts';

import type { TemporalAdapterConfig } from './config.js';
import type { TemporalClientManager } from './TemporalClient.js';
import { toTemporalRunRef, toTemporalTaskQueue, toTemporalWorkflowId } from './WorkflowMapper.js';

interface IRunStateStoreLike {
  listEvents(runId: string): Promise<unknown[]>;
}

interface SnapshotProjectorLike {
  rebuild(runId: string, events: unknown[]): RunStatusSnapshot;
}

interface IProviderAdapterLike {
  readonly provider: EngineRunRef['provider'];
  startRun(planRef: PlanRef, ctx: RunContext): Promise<EngineRunRef>;
  cancelRun(runRef: EngineRunRef): Promise<void>;
  getRunStatus(runRef: EngineRunRef): Promise<RunStatusSnapshot>;
  signal(runRef: EngineRunRef, request: SignalRequest): Promise<void>;
}

export interface TemporalAdapterDeps {
  clientManager: TemporalClientManager;
  config: TemporalAdapterConfig;
  stateStore: IRunStateStoreLike;
  projector: SnapshotProjectorLike;
}

export class TemporalAdapter implements IProviderAdapterLike {
  readonly provider = 'temporal' as const;

  constructor(private readonly deps: TemporalAdapterDeps) {}

  async startRun(planRef: PlanRef, ctx: RunContext): Promise<EngineRunRef> {
    const handle = await this.getClient();

    const workflowId = toTemporalWorkflowId(ctx.runId);
    const taskQueue = toTemporalTaskQueue(ctx.tenantId, this.deps.config);

    const started = await handle.workflow.start('runPlanWorkflow', {
      taskQueue,
      workflowId,
      args: [{ planRef, ctx }],
    });

    const runId =
      typeof started.firstExecutionRunId === 'string' && started.firstExecutionRunId.length > 0
        ? started.firstExecutionRunId
        : ctx.runId;

    return toTemporalRunRef({
      workflowId: started.workflowId,
      runId,
      config: this.deps.config,
      taskQueue,
    });
  }

  async cancelRun(runRef: EngineRunRef): Promise<void> {
    const handle = await this.getClient();
    await handle.workflow.getHandle(runRef.workflowId).cancel();
  }

  async getRunStatus(runRef: EngineRunRef): Promise<RunStatusSnapshot> {
    // Operational authority is persisted projection, not Workflow query state.
    const events = await this.deps.stateStore.listEvents(runRef.runId);
    return this.deps.projector.rebuild(runRef.runId, events);
  }

  async signal(runRef: EngineRunRef, request: SignalRequest): Promise<void> {
    const handle = await this.getClient();
    const workflow = handle.workflow.getHandle(runRef.workflowId);

    switch (request.type) {
      case 'PAUSE':
        await workflow.signal('pause');
        return;
      case 'RESUME':
        await workflow.signal('resume');
        return;
      case 'CANCEL':
        await workflow.signal('cancel', request.reason ?? 'cancel-requested');
        return;
      case 'RETRY_STEP':
      case 'RETRY_RUN':
        throw new Error('NotImplemented: RETRY_* signals are Phase 2');
      default: {
        const _never: never = request.type;
        throw new Error(`Unknown signal type: ${String(_never)}`);
      }
    }
  }

  private async getClient() {
    if (!this.deps.clientManager.isConnected()) {
      await this.deps.clientManager.connect();
    }
    return this.deps.clientManager.getClient().client;
  }
}
