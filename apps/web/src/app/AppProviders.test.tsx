// @vitest-environment jsdom

import { createAppServicesTestOverrides } from '../testing/appServicesTestDoubles';
import { act, Suspense } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { waitForReactQuery } from '../testing/reactQueryHarness';
import { useCapabilitiesQuery } from './queries/useCapabilitiesQuery';
import AppProviders from './AppProviders';
import type { BootstrapStepStatusCommand } from './bootstrap/appBootstrapCommands';

const bootstrapScreenMocks = vi.hoisted(() => ({
  setBootstrapStepStatus: vi.fn<(command: BootstrapStepStatusCommand) => void>(),
}));

vi.mock('./bootstrap/appBootstrapScreen', () => ({
  setBootstrapStepStatus: bootstrapScreenMocks.setBootstrapStepStatus,
}));

describe('AppProviders', () => {
  let container: HTMLDivElement;
  let root: Root;
  let previousActEnvironment: boolean | undefined;

  beforeEach(() => {
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
    globalObject.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    bootstrapScreenMocks.setBootstrapStepStatus.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();

    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    if (previousActEnvironment === undefined) {
      Reflect.deleteProperty(globalObject, 'IS_REACT_ACT_ENVIRONMENT');
    } else {
      globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }
  });

  it('acknowledges only a committed provider tree without waiting for browser paint', () => {
    // A one-shot animation frame left an otherwise ready startup gate stuck at four of five.
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(0);
    const pending = new Promise<never>(() => {});
    function Pending(): never {
      throw pending;
    }
    const overrides = createAppServicesTestOverrides();
    act(() => {
      root.render(
        <Suspense fallback={<div>Pending tree</div>}>
          <AppProviders overrides={overrides}>
            <Pending />
          </AppProviders>
        </Suspense>
      );
    });
    expect(container.textContent).toBe('Pending tree');
    expect(bootstrapScreenMocks.setBootstrapStepStatus).not.toHaveBeenCalled();

    bootstrapScreenMocks.setBootstrapStepStatus.mockImplementation((command: { step: string }) => {
      if (command.step === 'hydrate')
        expect(container.querySelector('[data-committed]')).not.toBeNull();
    });
    act(() => {
      root.render(
        <AppProviders overrides={overrides}>
          <div data-committed>Committed</div>
        </AppProviders>
      );
    });
    act(() => {
      root.render(
        <AppProviders overrides={overrides}>
          <div data-committed>Updated</div>
        </AppProviders>
      );
    });
    const hydration = bootstrapScreenMocks.setBootstrapStepStatus.mock.calls.filter(
      ([command]) => command.step === 'hydrate'
    );
    expect(hydration).toEqual([[{ step: 'hydrate', status: 'complete' }]]);
    expect(container.textContent).toBe('Updated');
  });

  it('provides app services and query client to route-level runtime hooks', async () => {
    const capabilitiesPort = {
      loadCapabilities: vi.fn().mockResolvedValue({
        apiVersion: '1.0.0',
        minFrontendVersion: '1.0.0',
        plugins: {},
      }),
    };

    function Probe(): JSX.Element {
      const query = useCapabilitiesQuery();
      return (
        <div data-testid="capabilities-status">
          {query.status}:{String(Object.keys(query.data?.plugins ?? {}).length)}
        </div>
      );
    }

    await act(async () => {
      root.render(
        <AppProviders overrides={{ ...createAppServicesTestOverrides(), capabilitiesPort }}>
          <Probe />
        </AppProviders>
      );
    });

    await waitForReactQuery(
      () =>
        container.querySelector('[data-testid="capabilities-status"]')?.textContent === 'success:0',
      {
        description: 'capabilities query success under app providers',
      }
    );

    expect(capabilitiesPort.loadCapabilities).toHaveBeenCalledTimes(1);
    expect(bootstrapScreenMocks.setBootstrapStepStatus).toHaveBeenCalledWith({
      step: 'services',
      status: 'complete',
      detail: 'App services and query client ready',
    });
  });
});
