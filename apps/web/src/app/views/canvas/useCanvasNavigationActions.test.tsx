import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCanvasNavigationActions } from './useCanvasNavigationActions';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('useCanvasNavigationActions', () => {
  let container: HTMLDivElement;
  let root: Root;
  let runStarted: ((runId: string) => void) | null = null;

  function Probe(): null {
    runStarted = useCanvasNavigationActions().handleRunStarted;
    return null;
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    runStarted = null;
    mockNavigate.mockReset();
  });

  it('navigates to run detail after run start', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <Probe />
        </MemoryRouter>
      );
    });

    expect(runStarted).not.toBeNull();
    act(() => {
      runStarted?.('run_123');
    });

    expect(mockNavigate).toHaveBeenCalledWith('/runs/run_123');
  });
});
