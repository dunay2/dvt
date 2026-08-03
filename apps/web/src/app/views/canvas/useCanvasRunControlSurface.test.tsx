// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { createMockRunsService } from '../../../testing/runsPortDoubles';
import type { IRunsPort } from '../../ports/runs';
import { AppServicesProvider } from '../../services/AppServicesContext';
import { useCanvasRunControlSurface } from './useCanvasRunControlSurface';

function RunControlSurfaceHost({ runId }: Readonly<{ runId: string | null }>): JSX.Element {
  const surface = useCanvasRunControlSurface('tenant::project::dev', runId);
  return (
    <output data-testid="surface">
      {surface == null
        ? 'unavailable'
        : `${surface.runId}:${surface.availability.cancel.available ? 'cancel' : 'blocked'}`}
    </output>
  );
}

describe('useCanvasRunControlSurface', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  async function renderSurface(runsService: IRunsPort, runId = 'run-active'): Promise<void> {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <AppServicesProvider overrides={{ ...createAppServicesTestOverrides(), runsService }}>
            <RunControlSurfaceHost runId={runId} />
          </AppServicesProvider>
        </QueryClientProvider>
      );
    });

    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (container.textContent !== 'unavailable') return;
      await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    }
  }

  it('publishes controls only from the matching authoritative snapshot', async () => {
    await renderSurface({
      ...createMockRunsService(),
      getRunSnapshot: async () => ({
        runId: 'run-active',
        status: 'running',
        controls: {
          cancel: { available: true },
          recover: { available: false, reason: 'run_active' },
        },
      }),
    });

    expect(container?.textContent).toBe('run-active:cancel');
  });

  it('fails closed when the snapshot does not publish control availability', async () => {
    await renderSurface({
      ...createMockRunsService(),
      getRunSnapshot: async () => ({ runId: 'run-active', status: 'running' }),
    });

    expect(container?.textContent).toBe('unavailable');
  });
});
