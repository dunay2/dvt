import { waitFor } from '@testing-library/dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

type MountedQueryUi = {
  cleanup(): Promise<void>;
  container: HTMLDivElement;
  queryClient: QueryClient;
  render(nextNode: ReactNode): Promise<void>;
};

export type WaitForReactQueryOptions = Readonly<{
  advance?: () => Promise<void> | void;
  description?: string;
  intervalMs?: number;
  timeoutMs?: number;
}>;

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

async function settleReactQueryTurn(advance?: WaitForReactQueryOptions['advance']): Promise<void> {
  await Promise.resolve();

  if (advance) {
    await advance();
    await Promise.resolve();
    return;
  }

  await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
}

export async function waitForReactQuery(
  predicate: () => boolean,
  {
    advance,
    description = 'React Query state',
    intervalMs = 20,
    timeoutMs = 5_000,
  }: WaitForReactQueryOptions = {}
): Promise<void> {
  await waitFor(
    async () => {
      await act(async () => {
        await settleReactQueryTurn(advance);
      });

      if (!predicate()) {
        throw new Error(`Waiting for ${description}`);
      }
    },
    { timeout: timeoutMs, interval: intervalMs }
  );
}
