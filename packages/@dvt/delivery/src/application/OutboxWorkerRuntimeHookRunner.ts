import type { OutboxTickResult } from '../contracts.js';

import type { OutboxWorkerRuntimeHooks, OutboxWorkerRuntimeLogger } from './OutboxWorkerRuntime.js';
import { toOutboxWorkerRuntimeErrorLike } from './outboxWorkerRuntimeErrorSupport.js';

type LifecycleHookName = 'onStarted' | 'onStopped';
type ValueHookName = 'onTick' | 'onError';

export class OutboxWorkerRuntimeHookRunner {
  constructor(
    private readonly hooks: OutboxWorkerRuntimeHooks | undefined,
    private readonly logger: OutboxWorkerRuntimeLogger
  ) {}

  runStarted(): void {
    this.runLifecycleHook('onStarted');
  }

  runTick(result: OutboxTickResult): void {
    this.runValueHook('onTick', result);
  }

  runError(error: unknown): void {
    this.runValueHook('onError', error);
  }

  runStopped(): void {
    this.runLifecycleHook('onStopped');
  }

  private runLifecycleHook(name: LifecycleHookName): void {
    const hooks = this.hooks;
    if (!hooks) {
      return;
    }

    const hook = hooks[name];
    if (!hook) {
      return;
    }

    try {
      (hook as (this: OutboxWorkerRuntimeHooks) => void).call(hooks);
    } catch (error) {
      this.warnHookFailure(name, error);
    }
  }

  private runValueHook(name: 'onTick', value: OutboxTickResult): void;
  private runValueHook(name: 'onError', value: unknown): void;
  private runValueHook(name: ValueHookName, value: unknown): void {
    const hooks = this.hooks;
    if (!hooks) {
      return;
    }

    const hook = hooks[name];
    if (!hook) {
      return;
    }

    try {
      if (name === 'onTick') {
        (hook as (this: OutboxWorkerRuntimeHooks, result: OutboxTickResult) => void).call(
          hooks,
          value as OutboxTickResult
        );
        return;
      }

      (hook as (this: OutboxWorkerRuntimeHooks, error: unknown) => void).call(hooks, value);
    } catch (error) {
      this.warnHookFailure(name, error);
    }
  }

  private warnHookFailure(name: keyof OutboxWorkerRuntimeHooks, error: unknown): void {
    this.logger.warn?.(
      { err: toOutboxWorkerRuntimeErrorLike(error), hook: name },
      'outbox runtime hook failed'
    );
  }
}
