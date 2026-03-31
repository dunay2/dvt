import { waitFor } from '@testing-library/dom';
import { notifyManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

type MountedQueryUi = {
  cleanup(): Promise<void>;
  container: HTMLDivElement;
  queryClient: QueryClient;
  render(nextNode: ReactNode): Promise<void>;
};

export type WaitForReactQueryOptions = Readonly<{
  description?: string;
  intervalMs?: number;
  tick?: (attempt: number) => Promise<void> | void;
  timeoutMs?: number;
}>;

type ReactQueryNotifyFunction = (callback: () => void) => void;

const reactActEnvironmentLeaseState: {
  depth: number;
  previousValue: boolean | undefined;
} = {
  depth: 0,
  previousValue: undefined,
};

const reactQueryNotifyLeaseState: {
  depth: number;
  previousNotifyFunction: ReactQueryNotifyFunction | undefined;
} = {
  depth: 0,
  previousNotifyFunction: undefined,
};

const reactQueryNotifyTrackerKey = Symbol.for('dvt.reactQueryNotifyTracker');
const defaultReactQueryNotifyFunction: ReactQueryNotifyFunction = (callback) => {
  callback();
};

type ReactQueryNotifyTracker = {
  currentNotifyFunction: ReactQueryNotifyFunction;
  installed: boolean;
  originalSetNotifyFunction: (fn: ReactQueryNotifyFunction) => void;
};

function installReactQueryNotifyTracker(): ReactQueryNotifyTracker {
  const tracker = getReactQueryNotifyTracker();

  if (tracker.installed) {
    return tracker;
  }

  const mutableNotifyManager = notifyManager as typeof notifyManager & {
    setNotifyFunction: (fn: ReactQueryNotifyFunction) => void;
  };

  // Track notify function changes from module-load onward so a custom setter
  // installed before the first harness lease can still be restored correctly.
  mutableNotifyManager.setNotifyFunction = (fn) => {
    tracker.currentNotifyFunction = fn;
    tracker.originalSetNotifyFunction(fn);
  };
  tracker.installed = true;

  return tracker;
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

function enableReactActEnvironment(): void {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
}

function captureReactActEnvironment(): boolean | undefined {
  return (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
    .IS_REACT_ACT_ENVIRONMENT;
}

function restoreReactActEnvironment(previousValue: boolean | undefined): void {
  const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

  if (previousValue === undefined) {
    Reflect.deleteProperty(globalObject, 'IS_REACT_ACT_ENVIRONMENT');
    return;
  }

  globalObject.IS_REACT_ACT_ENVIRONMENT = previousValue;
}

function acquireReactActEnvironmentLease(): () => void {
  if (reactActEnvironmentLeaseState.depth === 0) {
    reactActEnvironmentLeaseState.previousValue = captureReactActEnvironment();
    enableReactActEnvironment();
  }

  reactActEnvironmentLeaseState.depth += 1;
  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    reactActEnvironmentLeaseState.depth = Math.max(reactActEnvironmentLeaseState.depth - 1, 0);

    if (reactActEnvironmentLeaseState.depth > 0) {
      return;
    }

    restoreReactActEnvironment(reactActEnvironmentLeaseState.previousValue);
    reactActEnvironmentLeaseState.previousValue = undefined;
  };
}

function getReactQueryNotifyTracker(): ReactQueryNotifyTracker {
  const globalObject = globalThis as typeof globalThis & {
    [reactQueryNotifyTrackerKey]?: ReactQueryNotifyTracker;
  };

  if (!globalObject[reactQueryNotifyTrackerKey]) {
    globalObject[reactQueryNotifyTrackerKey] = {
      currentNotifyFunction: defaultReactQueryNotifyFunction,
      installed: false,
      originalSetNotifyFunction: notifyManager.setNotifyFunction.bind(notifyManager),
    };
  }

  return globalObject[reactQueryNotifyTrackerKey];
}

const reactQueryNotifyTracker = installReactQueryNotifyTracker();

function acquireReactQueryNotifyLease(): () => void {
  if (reactQueryNotifyLeaseState.depth === 0) {
    reactQueryNotifyLeaseState.previousNotifyFunction =
      reactQueryNotifyTracker.currentNotifyFunction;
    notifyManager.setNotifyFunction((callback) => {
      act(() => {
        callback();
      });
    });
  }

  reactQueryNotifyLeaseState.depth += 1;
  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    reactQueryNotifyLeaseState.depth = Math.max(reactQueryNotifyLeaseState.depth - 1, 0);

    if (reactQueryNotifyLeaseState.depth > 0) {
      return;
    }

    notifyManager.setNotifyFunction(
      reactQueryNotifyLeaseState.previousNotifyFunction ?? defaultReactQueryNotifyFunction
    );
    reactQueryNotifyLeaseState.previousNotifyFunction = undefined;
  };
}

export async function withTestQueryClient(
  node: ReactNode,
  queryClient: QueryClient = createTestQueryClient()
): Promise<MountedQueryUi> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const releaseActEnvironmentLease = acquireReactActEnvironmentLease();
  const releaseReactQueryNotifyLease = acquireReactQueryNotifyLease();
  let disposed = false;

  async function render(nextNode: ReactNode): Promise<void> {
    await act(async () => {
      root.render(<QueryClientProvider client={queryClient}>{nextNode}</QueryClientProvider>);
      await Promise.resolve();
    });
  }

  async function cleanupInternal(suppressUnmountErrors: boolean): Promise<void> {
    if (disposed) {
      return;
    }

    disposed = true;
    let unmountError: unknown;

    try {
      await act(async () => {
        root.unmount();
      });
    } catch (error) {
      unmountError = error;
    }

    try {
      container.remove();
      queryClient.clear();
    } finally {
      releaseReactQueryNotifyLease();
      releaseActEnvironmentLease();
    }

    if (unmountError && !suppressUnmountErrors) {
      throw unmountError;
    }
  }

  async function cleanup(): Promise<void> {
    await cleanupInternal(false);
  }

  try {
    await render(node);
  } catch (error) {
    await cleanupInternal(true);
    throw error;
  }

  return {
    cleanup,
    container,
    queryClient,
    render,
  };
}

async function waitForControlledReactQuery(
  predicate: () => boolean,
  {
    description,
    intervalMs,
    tick,
    timeoutMs,
  }: Required<Pick<WaitForReactQueryOptions, 'description' | 'intervalMs' | 'timeoutMs'>> & {
    tick: NonNullable<WaitForReactQueryOptions['tick']>;
  }
): Promise<void> {
  const pollIntervalMs = Math.max(intervalMs, 1);
  const maxAttempts = Math.max(1, Math.ceil(timeoutMs / pollIntervalMs));

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (predicate()) {
      return;
    }

    await act(async () => {
      await tick(attempt);
      await Promise.resolve();
    });

    if (predicate()) {
      return;
    }
  }

  throw new Error(`Timed out waiting for ${description} after ${timeoutMs}ms`);
}

export async function waitForReactQuery(
  predicate: () => boolean,
  {
    description = 'React Query state',
    intervalMs = 20,
    tick,
    timeoutMs = 5_000,
  }: WaitForReactQueryOptions = {}
): Promise<void> {
  if (predicate()) {
    return;
  }

  if (tick) {
    await waitForControlledReactQuery(predicate, {
      description,
      intervalMs,
      tick,
      timeoutMs,
    });
    return;
  }

  await waitFor(
    async () => {
      let satisfied = false;

      await act(async () => {
        satisfied = predicate();
        await Promise.resolve();
      });

      if (!satisfied) {
        throw new Error(`Waiting for ${description}`);
      }
    },
    {
      interval: Math.max(intervalMs, 1),
      onTimeout: () => new Error(`Timed out waiting for ${description} after ${timeoutMs}ms`),
      timeout: timeoutMs,
    }
  );
}
