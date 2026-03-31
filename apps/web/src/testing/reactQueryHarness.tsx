import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

type MountedQueryUi = {
  cleanup(): Promise<void>;
  container: HTMLDivElement;
  queryClient: QueryClient;
  render(nextNode: ReactNode): Promise<void>;
};

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

export async function withTestQueryClient(
  node: ReactNode,
  queryClient: QueryClient = createTestQueryClient()
): Promise<MountedQueryUi> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  enableReactActEnvironment();

  async function render(nextNode: ReactNode): Promise<void> {
    await act(async () => {
      root.render(<QueryClientProvider client={queryClient}>{nextNode}</QueryClientProvider>);
    });
  }

  async function cleanup(): Promise<void> {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    queryClient.clear();
  }

  await render(node);

  return {
    cleanup,
    container,
    queryClient,
    render,
  };
}

export async function waitForReactQuery(
  predicate: () => boolean,
  timeoutMs = 1_000
): Promise<void> {
  const timeoutAt = Date.now() + timeoutMs;

  while (Date.now() < timeoutAt) {
    if (predicate()) {
      return;
    }

    await act(async () => {
      await Promise.resolve();
      await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
    });
  }

  throw new Error(`Timed out waiting for React Query state after ${timeoutMs}ms`);
}
