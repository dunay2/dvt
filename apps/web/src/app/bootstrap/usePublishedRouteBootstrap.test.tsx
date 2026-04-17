import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RouteBootstrapRegistration } from './routeBootstrapPresentation';
import { usePublishedRouteBootstrap } from './usePublishedRouteBootstrap';

const mockPublishRouteBootstrapPresentation = vi.hoisted(() => vi.fn());
const mockResetRouteBootstrapPresentation = vi.hoisted(() => vi.fn());
const mockUseActiveRouteBootstrapRegistration = vi.hoisted(() => vi.fn());

vi.mock('./routeBootstrapPresentation', async () => {
  const actual = await vi.importActual<typeof import('./routeBootstrapPresentation')>(
    './routeBootstrapPresentation'
  );
  return {
    ...actual,
    publishRouteBootstrapPresentation: (...args: unknown[]) =>
      mockPublishRouteBootstrapPresentation(...args),
    resetRouteBootstrapPresentation: (...args: unknown[]) =>
      mockResetRouteBootstrapPresentation(...args),
  };
});

vi.mock('./useActiveRouteBootstrapRegistration', () => ({
  useActiveRouteBootstrapRegistration: (...args: unknown[]) =>
    mockUseActiveRouteBootstrapRegistration(...args),
}));

const PUBLISHED_REGISTRATION: RouteBootstrapRegistration = {
  routeId: 'dbt.canvas',
  routeBootstrap: {
    mode: 'published',
    initialPresentation: {
      status: 'pending',
      detail: 'Preparing canvas route',
      canComplete: false,
    },
  },
};

describe('usePublishedRouteBootstrap', () => {
  let container: HTMLDivElement;
  let root: Root;

  function Probe({ detail }: { detail: string }): null {
    usePublishedRouteBootstrap('dbt.canvas', {
      status: 'pending',
      detail,
      canComplete: false,
    });
    return null;
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockPublishRouteBootstrapPresentation.mockReset();
    mockResetRouteBootstrapPresentation.mockReset();
    mockUseActiveRouteBootstrapRegistration.mockReset();
    mockUseActiveRouteBootstrapRegistration.mockReturnValue(PUBLISHED_REGISTRATION);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('publishes presentation updates in place and only resets on unmount', () => {
    act(() => {
      root.render(<Probe detail="Loading canvas route data" />);
    });

    expect(mockPublishRouteBootstrapPresentation).toHaveBeenCalledTimes(1);
    expect(mockResetRouteBootstrapPresentation).not.toHaveBeenCalled();
    expect(mockUseActiveRouteBootstrapRegistration).toHaveBeenCalledWith(
      'dbt.canvas',
      expect.objectContaining({
        locale: navigator.language || 'en',
      })
    );

    act(() => {
      root.render(<Probe detail="Loading canvas route data (phase 2)" />);
    });

    expect(mockPublishRouteBootstrapPresentation).toHaveBeenCalledTimes(2);
    expect(mockResetRouteBootstrapPresentation).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });

    expect(mockResetRouteBootstrapPresentation).toHaveBeenCalledTimes(1);
    expect(mockResetRouteBootstrapPresentation).toHaveBeenCalledWith(PUBLISHED_REGISTRATION);
  });
});
