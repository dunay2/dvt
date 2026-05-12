import type { EngineRunRef, SignalRequest } from '@dvt/contracts';
import type { IObservability } from '@dvt/observability';

import type { IProviderAdapter } from '../adapters/IProviderAdapter.js';
import type { IRunCommandService } from '../domain/IRunCommandService.js';
import type { IRunControlService } from '../domain/IRunControlService.js';
import type { IRunSignalService } from '../domain/IRunSignalService.js';
import type { IRunStateStoreRead, IRunStateStoreWrite } from '../ports/IRunStateStore.js';
import type { IRunAccessPolicy } from '../security/RunAccessPolicy.js';
import { RunCommandService } from '../services/runControl/RunCommandService.js';
import { RunSignalService } from '../services/runControl/RunSignalService.js';
import type { IClock } from '../utils/clock.js';

import type { IdempotencyKeyBuilder } from './idempotency.js';

export interface WorkflowEngineCoreDeps {
  stateStoreRead: IRunStateStoreRead;
  stateStoreWrite: IRunStateStoreWrite;
  idempotency: IdempotencyKeyBuilder;
  policy: IRunAccessPolicy;
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  observability: IObservability;
  timeouts?: {
    adapterCallMs?: number;
    outboxEnqueueMs?: number;
  };
  clock: Pick<IClock, 'nowIsoUtc'>;
}

export class WorkflowEngineCoreService implements IRunControlService {
  private readonly runCommandService: IRunCommandService;
  private readonly runSignalService: IRunSignalService;

  constructor(deps: WorkflowEngineCoreDeps) {
    const commandDeps = {
      stateStoreRead: deps.stateStoreRead,
      policy: deps.policy,
      adapters: deps.adapters,
      observability: deps.observability,
      clock: deps.clock,
      ...(deps.timeouts === undefined ? {} : { timeouts: deps.timeouts }),
    };
    const signalDeps = {
      stateStoreRead: deps.stateStoreRead,
      stateStoreWrite: deps.stateStoreWrite,
      idempotency: deps.idempotency,
      policy: deps.policy,
      adapters: deps.adapters,
      observability: deps.observability,
      clock: deps.clock,
      ...(deps.timeouts === undefined ? {} : { timeouts: deps.timeouts }),
    };

    this.runCommandService = new RunCommandService(commandDeps);
    this.runSignalService = new RunSignalService(signalDeps);
  }

  async cancel(ref: EngineRunRef): Promise<void> {
    return this.runCommandService.cancel(ref);
  }

  async signal(ref: EngineRunRef, req: SignalRequest): Promise<void> {
    return this.runSignalService.signal(ref, req);
  }
}

export function buildRunControlService(deps: WorkflowEngineCoreDeps): IRunControlService {
  return new WorkflowEngineCoreService(deps);
}
