// @vitest-environment jsdom

/** Owned concern: prove CanvasShell owns a stable CanvasContextMenu integration boundary. */
import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCanvasShellHarness,
  getCanvasShellState,
  type CanvasShellPropsOverrides,
} from './CanvasShell.testHarness';
import type { CanvasShellProps } from './canvasShell.types';
import type { CanvasContextMenuPresenter } from './useCanvasContextMenuPresenter';

vi.mock('../CodeView', () => ({
  default: () => <div data-testid="code-workbench-panel" />,
}));

describe('CanvasShell context menu integration', () => {
  let container: HTMLDivElement;
  let renderShell: (overrides?: CanvasShellPropsOverrides) => Promise<CanvasShellProps>;
  let unmountShell: () => void;

  beforeEach(() => {
    const harness = createCanvasShellHarness();
    container = harness.container;
    renderShell = harness.render;
    unmountShell = harness.unmount;
  });

  afterEach(() => {
    unmountShell();
    vi.useRealTimers();
  });

  function getContextMenuPresenter(): CanvasContextMenuPresenter {
    const presenter = getCanvasShellState().canvasViewportProps?.contextMenuPresenter;
    expect(presenter).toBeDefined();
    return presenter as CanvasContextMenuPresenter;
  }

  function expectMenuVisible(): void {
    expect(container.querySelector('[data-slot="canvas-context-menu"]')).not.toBeNull();
  }

  function expectMenuClosed(): void {
    expect(container.querySelector('[data-slot="canvas-context-menu"]')).toBeNull();
  }

  it('keeps the shell-owned canvas menu open through the browser pointer echo', async () => {
    vi.useFakeTimers();
    await renderShell();
    const presenter = getContextMenuPresenter();

    await act(async () => {
      presenter.handlePaneContextMenu({
        preventDefault: vi.fn(),
        clientX: 480,
        clientY: 320,
      } as unknown as React.MouseEvent<Element>);
    });
    await act(async () => {
      document.dispatchEvent(
        new MouseEvent('pointerdown', {
          bubbles: true,
          button: 0,
          clientX: 720,
          clientY: 220,
        })
      );
    });

    expectMenuVisible();

    vi.advanceTimersByTime(351);
    await act(async () => {
      document.dispatchEvent(
        new MouseEvent('pointerdown', {
          bubbles: true,
          button: 0,
          clientX: 720,
          clientY: 220,
        })
      );
    });

    expectMenuClosed();
  });

  it('opens project code as a contextual workbench from the canvas menu', async () => {
    await renderShell();
    const presenter = getContextMenuPresenter();

    await act(async () => {
      presenter.handleCanvasAction({
        action: 'open-project-code',
        label: 'Open project code',
      });
    });

    expect(container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-contextual-workbench"]')).not.toBeNull();
  });
});
