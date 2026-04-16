// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { waitForReactQuery } from '../testing/reactQueryHarness';
import { useCapabilitiesQuery } from './queries/useCapabilitiesQuery';
import AppProviders from './AppProviders';

const bootstrapScreenMocks = vi.hoisted(() => ({
  setBootstrapStepStatus: vi.fn(),
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

    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    if (previousActEnvironment === undefined) {
      Reflect.deleteProperty(globalObject, 'IS_REACT_ACT_ENVIRONMENT');
    } else {
      globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }
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
        <AppProviders overrides={{ mode: 'mock', capabilitiesPort }}>
          <Probe />
        </AppProviders>
      );
    });

    await waitForReactQuery(
      () => container.querySelector('[data-testid="capabilities-status"]')?.textContent === 'success:0',
      {
        description: 'capabilities query success under app providers',
      }
    );

    expect(capabilitiesPort.loadCapabilities).toHaveBeenCalledTimes(1);
    expect(bootstrapScreenMocks.setBootstrapStepStatus).toHaveBeenCalledWith(
      'services',
      'complete',
      'App services and query client ready'
    );
  });
});
