import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RouteBootstrapRegistrationNotFoundError } from './routeBootstrapErrors';
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
  const originalDocumentLang = document.documentElement.lang;

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
    document.documentElement.lang = 'es-ES';
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
    document.documentElement.lang = originalDocumentLang;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('publishes presentation updates in place and only resets on unmount', () => {
    document.documentElement.lang = 'en';
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('es-ES');

    act(() => {
      root.render(<Probe detail="Loading canvas route data" />);
    });

    expect(mockPublishRouteBootstrapPresentation).toHaveBeenCalledTimes(1);
    expect(mockResetRouteBootstrapPresentation).not.toHaveBeenCalled();
    expect(mockUseActiveRouteBootstrapRegistration).toHaveBeenCalledWith(
      'dbt.canvas',
      expect.objectContaining({
        locale: 'es-ES',
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

  it('fails closed with a localized typed error when a published route registration is missing', () => {
    document.documentElement.lang = 'en';
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITEST', '');
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('es-ES');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockUseActiveRouteBootstrapRegistration.mockReturnValue(null);

    let thrown: unknown;

    try {
      act(() => {
        root.render(<Probe detail="Missing route bootstrap registration" />);
      });
    } catch (error) {
      thrown = error;
    }

    expect(mockUseActiveRouteBootstrapRegistration).toHaveBeenCalledWith(
      'dbt.canvas',
      expect.objectContaining({
        allowMissingDataRouterContext: false,
        locale: 'es-ES',
      })
    );
    expect(thrown).toBeInstanceOf(RouteBootstrapRegistrationNotFoundError);
    expect(thrown).toMatchObject({
      code: 'ROUTE_BOOTSTRAP_REGISTRATION_NOT_FOUND',
      routeId: 'dbt.canvas',
      message: 'No se encontro el registro de route bootstrap para route id: dbt.canvas',
    });
    expect(mockPublishRouteBootstrapPresentation).not.toHaveBeenCalled();
    expect(mockResetRouteBootstrapPresentation).not.toHaveBeenCalled();
  });
});
