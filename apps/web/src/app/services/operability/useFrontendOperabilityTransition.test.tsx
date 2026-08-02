// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type {
  FrontendOperabilityEvent,
  FrontendOperabilitySink,
} from '../../ports/frontendOperability';
import { createSurfaceDegradedEvent } from './frontendOperabilityRecorder';
import { useFrontendOperabilityTransition } from './useFrontendOperabilityTransition';

const reactTestEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
const previousActEnvironment = reactTestEnvironment.IS_REACT_ACT_ENVIRONMENT;

beforeAll(() => {
  reactTestEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
});

afterAll(() => {
  if (previousActEnvironment === undefined) {
    Reflect.deleteProperty(reactTestEnvironment, 'IS_REACT_ACT_ENVIRONMENT');
    return;
  }

  reactTestEnvironment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
});

function TransitionProbe({
  event,
  sink,
}: {
  readonly event: FrontendOperabilityEvent | null;
  readonly sink: FrontendOperabilitySink;
}): null {
  useFrontendOperabilityTransition(sink, event);
  return null;
}

describe('useFrontendOperabilityTransition', () => {
  it('records once per state occurrence and records again after reset', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const record = vi.fn<FrontendOperabilitySink['record']>();
    const sink = { record } satisfies FrontendOperabilitySink;
    const degraded = createSurfaceDegradedEvent(
      'shell.platform-health',
      'partial',
      'platform-health-state-transition'
    );

    await act(async () => {
      root.render(<TransitionProbe event={degraded} sink={sink} />);
    });
    await act(async () => {
      root.render(<TransitionProbe event={{ ...degraded }} sink={sink} />);
    });
    expect(record).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.render(<TransitionProbe event={null} sink={sink} />);
    });
    await act(async () => {
      root.render(<TransitionProbe event={degraded} sink={sink} />);
    });

    expect(record).toHaveBeenCalledTimes(2);
    await act(async () => root.unmount());
  });

  it('records a new coarse state without requiring a healthy reset', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const record = vi.fn<FrontendOperabilitySink['record']>();
    const sink = { record } satisfies FrontendOperabilitySink;

    await act(async () => {
      root.render(
        <TransitionProbe
          event={createSurfaceDegradedEvent(
            'shell.platform-health',
            'partial',
            'platform-health-state-transition'
          )}
          sink={sink}
        />
      );
    });
    await act(async () => {
      root.render(
        <TransitionProbe
          event={createSurfaceDegradedEvent(
            'shell.platform-health',
            'probe-unavailable',
            'platform-health-state-transition'
          )}
          sink={sink}
        />
      );
    });

    expect(record).toHaveBeenCalledTimes(2);
    await act(async () => root.unmount());
  });
});
