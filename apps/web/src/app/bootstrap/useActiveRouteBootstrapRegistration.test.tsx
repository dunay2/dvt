import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  UNSAFE_DataRouterContext,
  UNSAFE_DataRouterStateContext,
  type RouterState,
} from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RouteBootstrapDataRouterContextError } from './routeBootstrapErrors';
import { useActiveRouteBootstrapRegistration } from './useActiveRouteBootstrapRegistration';

const mockUseMatches = vi.hoisted(() => vi.fn());

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useMatches: () => mockUseMatches(),
  };
});

describe('useActiveRouteBootstrapRegistration', () => {
  let container: HTMLDivElement;
  let root: Root;
  let registrationResult: ReturnType<typeof useActiveRouteBootstrapRegistration> | undefined;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  const originalDocumentLang = document.documentElement.lang;

  function Probe({
    options,
  }: {
    options?: Parameters<typeof useActiveRouteBootstrapRegistration>[1];
  }): null {
    registrationResult = useActiveRouteBootstrapRegistration('dbt.canvas', options);
    return null;
  }

  function renderWithDataRouterContext(node: React.ReactNode): void {
    const dataRouterContextValue = {
      basename: '/',
      navigator: {} as never,
      router: {} as never,
      static: false,
    };
    const dataRouterStateValue = {
      matches: [],
      loaderData: {},
      actionData: null,
      errors: null,
    } as unknown as RouterState;

    act(() => {
      root.render(
        <UNSAFE_DataRouterContext.Provider value={dataRouterContextValue}>
          <UNSAFE_DataRouterStateContext.Provider value={dataRouterStateValue}>
            {node}
          </UNSAFE_DataRouterStateContext.Provider>
        </UNSAFE_DataRouterContext.Provider>
      );
    });
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    registrationResult = undefined;
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.documentElement.lang = originalDocumentLang;
    mockUseMatches.mockReset();
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('throws a typed data-router-context error with runtime locale-resolved copy', () => {
    document.documentElement.lang = 'en';
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('es-ES');
    mockUseMatches.mockImplementation(() => {
      throw new Error('upstream missing context');
    });

    let thrownError: unknown;
    try {
      act(() => {
        root.render(<Probe />);
      });
    } catch (cause) {
      thrownError = cause;
    }

    expect(thrownError).toBeInstanceOf(RouteBootstrapDataRouterContextError);
    expect((thrownError as Error).message).toBe(
      'El bootstrap de ruta requiere un contexto de React Router data router (RouterProvider).'
    );
  });

  it('returns null when missing data-router context is explicitly allowed', () => {
    mockUseMatches.mockImplementation(() => {
      throw new Error('upstream missing context');
    });

    act(() => {
      root.render(<Probe options={{ allowMissingDataRouterContext: true }} />);
    });

    expect(registrationResult).toBeNull();
    expect(mockUseMatches).toHaveBeenCalledTimes(1);
  });

  it('rethrows non-data-router errors without remapping them', () => {
    mockUseMatches.mockImplementation(() => {
      throw new Error('unexpected router failure');
    });

    expect(() => {
      renderWithDataRouterContext(<Probe />);
    }).toThrow('unexpected router failure');
  });
});
