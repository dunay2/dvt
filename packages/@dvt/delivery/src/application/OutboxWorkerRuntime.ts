import type {
  IEventBus,
  IOutboxStorage,
  OutboxClaimSelection,
  OutboxTickResult,
  OutboxWorkerObserver,
} from '../contracts.js';

import { OutboxWorker } from './OutboxWorker.js';
import {
  extractTickResultFromRuntimeError,
  toOutboxWorkerRuntimeErrorLike,
  unwrapOutboxWorkerRuntimeError,
} from './outboxWorkerRuntimeErrorSupport.js';
import { OutboxWorkerRuntimeHookRunner } from './OutboxWorkerRuntimeHookRunner.js';
import { OutboxWorkerRuntimeLoopController } from './OutboxWorkerRuntimeLoopController.js';

export interface OutboxWorkerRuntimeLogger {
  info(data: Record<string, unknown>, msg?: string): void;
  warn?(data: Record<string, unknown>, msg?: string): void;
  error(data: Record<string, unknown>, msg?: string): void;
}

export interface OutboxWorkerRuntimeOptions {
  batchSize?: number;
  stopOnError?: boolean;
  pollIntervalMs?: number;
  errorBackoffMs?: number;
  nowMs?: () => number;
  observer?: OutboxWorkerObserver;
  claimSelection?: OutboxClaimSelection | (() => OutboxClaimSelection | undefined);
  hooks?: OutboxWorkerRuntimeHooks;
  interruptPendingTick?: () => void | Promise<void>;
}

export interface OutboxWorkerRuntimeHooks {
  onStarted?(): void;
  onTick?(result: OutboxTickResult): void;
  onError?(error: unknown): void;
  onStopped?(): void;
}

type RuntimeTimingOptions = Required<
  Pick<
    OutboxWorkerRuntimeOptions,
    'batchSize' | 'stopOnError' | 'pollIntervalMs' | 'errorBackoffMs'
  >
>;

const DEFAULT_OPTIONS: RuntimeTimingOptions = {
  batchSize: 100,
  stopOnError: false,
  pollIntervalMs: 1000,
  errorBackoffMs: 5000,
};

export class OutboxWorkerRuntime {
  private readonly options: RuntimeTimingOptions;
  private readonly worker: OutboxWorker;
  private readonly hookRunner: OutboxWorkerRuntimeHookRunner;
  private readonly loopController: OutboxWorkerRuntimeLoopController;

  constructor(
    storage: IOutboxStorage,
    bus: IEventBus,
    private readonly logger: OutboxWorkerRuntimeLogger,
    options: OutboxWorkerRuntimeOptions = {}
  ) {
    this.options = {
      batchSize: options.batchSize ?? DEFAULT_OPTIONS.batchSize,
      stopOnError: options.stopOnError ?? DEFAULT_OPTIONS.stopOnError,
      pollIntervalMs: options.pollIntervalMs ?? DEFAULT_OPTIONS.pollIntervalMs,
      errorBackoffMs: options.errorBackoffMs ?? DEFAULT_OPTIONS.errorBackoffMs,
    };
    this.hookRunner = new OutboxWorkerRuntimeHookRunner(options.hooks, logger);
    this.loopController = new OutboxWorkerRuntimeLoopController(
      options.interruptPendingTick === undefined
        ? { logger }
        : { interruptPendingTick: options.interruptPendingTick, logger }
    );
    const claimSelection = options.claimSelection;
    this.worker = new OutboxWorker(storage, bus, {
      batchSize: this.options.batchSize,
      stopOnError: this.options.stopOnError,
      nowMs: options.nowMs ?? (() => Date.now()),
      ...(claimSelection === undefined ? {} : { claimSelection }),
      ...(options.observer ? { observer: options.observer } : {}),
    });
  }

  start(signal?: globalThis.AbortSignal): Promise<void> {
    return this.loopController.start(() => this.runLoop(), signal);
  }

  async stop(): Promise<void> {
    await this.loopController.stop();
  }

  private async runLoop(): Promise<void> {
    this.hookRunner.runStarted();
    this.logger.info(
      {
        batchSize: this.options.batchSize,
        pollIntervalMs: this.options.pollIntervalMs,
        errorBackoffMs: this.options.errorBackoffMs,
        stopOnError: this.options.stopOnError,
      },
      'outbox worker runtime started'
    );

    try {
      while (this.loopController.isRunning()) {
        const shouldContinue = await this.runLoopIteration();
        if (!shouldContinue) break;
      }
    } finally {
      this.hookRunner.runStopped();
      this.logger.info({}, 'outbox worker runtime stopped');
    }
  }

  private async runLoopIteration(): Promise<boolean> {
    try {
      const result = await this.worker.tick();
      this.hookRunner.runTick(result);
    } catch (error) {
      return this.handleTickFailure(error);
    }

    if (!this.loopController.isRunning()) {
      return false;
    }

    await this.loopController.wait(this.options.pollIntervalMs);
    return this.loopController.isRunning();
  }

  private async handleTickFailure(error: unknown): Promise<boolean> {
    if (!this.loopController.isRunning()) {
      return false;
    }

    const tickResult = extractTickResultFromRuntimeError(error);
    const runtimeError = unwrapOutboxWorkerRuntimeError(error);

    if (tickResult) {
      this.hookRunner.runTick(tickResult);
    }
    this.hookRunner.runError(runtimeError);
    this.logger.error(
      {
        err: toOutboxWorkerRuntimeErrorLike(runtimeError),
        backoffMs: this.options.errorBackoffMs,
      },
      'outbox worker tick failed'
    );

    if (this.options.stopOnError) {
      throw runtimeError;
    }

    if (!this.loopController.isRunning()) {
      return false;
    }

    await this.loopController.wait(this.options.errorBackoffMs);
    return this.loopController.isRunning();
  }
}
