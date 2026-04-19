import type { InterruptibleEventBus } from './createOutboxEventBus.js';

export interface ClosableStateStore {
  close(): Promise<void>;
}

export interface AbortableStateStore extends ClosableStateStore {
  abortPendingOperations(): void | Promise<void>;
}

interface StoppableRuntime {
  stop(): Promise<void>;
}

export async function waitForOutboxRuntimeStartupOrAbort(
  startup: () => Promise<void>,
  deps: {
    shutdownSignal?: globalThis.AbortSignal;
    stateStore: AbortableStateStore;
    eventBus: InterruptibleEventBus;
  }
): Promise<void> {
  const signal = deps.shutdownSignal;
  if (!signal) {
    await startup();
    return;
  }

  if (signal.aborted) {
    await interruptPendingTick(deps.stateStore, deps.eventBus);
    throw createAbortError('outbox runtime startup aborted');
  }

  let detachAbortListener = (): void => {};
  let startupCompleted = false;
  const abortPromise = new Promise<never>((_resolve, reject) => {
    const onAbort = (): void => {
      if (startupCompleted) {
        return;
      }
      detachAbortListener();
      void interruptPendingTick(deps.stateStore, deps.eventBus);
      reject(createAbortError('outbox runtime startup aborted'));
    };

    detachAbortListener = (): void => {
      signal.removeEventListener('abort', onAbort);
    };

    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
    }
  });

  try {
    await Promise.race([startup(), abortPromise]);
    startupCompleted = true;
  } finally {
    detachAbortListener();
  }
}

export async function interruptPendingTick(
  stateStore: { abortPendingOperations(): void | Promise<void> },
  eventBus: InterruptibleEventBus
): Promise<void> {
  eventBus.abortPendingPublishes?.();
  await Promise.resolve(stateStore.abortPendingOperations());
}

export async function safelyReleaseStartupResources(
  stateStore: ClosableStateStore,
  poolLease: { release(): Promise<void> }
): Promise<void> {
  try {
    await stateStore.close();
  } catch {
    // Cleanup must not mask the startup failure.
  }

  try {
    await poolLease.release();
  } catch {
    // Cleanup must not mask the startup failure.
  }
}

export async function stopOutboxRuntimeResources(deps: {
  runtimes: Array<StoppableRuntime | null>;
  stateStore: ClosableStateStore;
  poolLease: { release(): Promise<void> };
}): Promise<void> {
  let firstError: unknown = null;

  for (const runtime of deps.runtimes) {
    if (!runtime) {
      continue;
    }
    try {
      await runtime.stop();
    } catch (error) {
      firstError ??= error;
    }
  }

  try {
    await deps.stateStore.close();
  } catch (error) {
    firstError ??= error;
  }

  try {
    await deps.poolLease.release();
  } catch (error) {
    firstError ??= error;
  }

  if (firstError) {
    throw firstError;
  }
}

function createAbortError(message: string): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}
