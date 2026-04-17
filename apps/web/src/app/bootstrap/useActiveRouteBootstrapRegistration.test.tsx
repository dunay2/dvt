import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
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

  function Probe({
    options,
  }: {
    options?: Parameters<typeof useActiveRouteBootstrapRegistration>[1];
  }): null {
    registrationResult = useActiveRouteBootstrapRegistration('dbt.canvas', options);
    return null;
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
    mockUseMatches.mockReset();
    consoleErrorSpy.mockRestore();
  });

  it('throws a typed data-router-context error when useMatches is unavailable', () => {
    mockUseMatches.mockImplementation(() => {
      throw new Error('useMatches must be used within a data router');
    });

    expect(() => {
      act(() => {
        root.render(<Probe />);
      });
    }).toThrow(RouteBootstrapDataRouterContextError);
  });

  it('returns null when missing data-router context is explicitly allowed', () => {
    mockUseMatches.mockImplementation(() => {
      throw new Error('useMatches must be used within a data router');
    });

    act(() => {
      root.render(<Probe options={{ allowMissingDataRouterContext: true }} />);
    });

    expect(registrationResult).toBeNull();
  });

  it('rethrows non-data-router errors without remapping them', () => {
    mockUseMatches.mockImplementation(() => {
      throw new Error('unexpected router failure');
    });

    expect(() => {
      act(() => {
        root.render(<Probe />);
      });
    }).toThrow('unexpected router failure');
  });
});
