// @vitest-environment jsdom

/** Owned concern: prove CanvasShell owns a stable CanvasContextMenu integration boundary. */
import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCanvasShellHarness,
  getCanvasShellState,
  type CanvasShellPropsOverrides,
} from './CanvasShell.testHarness';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import type { CanvasShellProps } from './canvasShell.types';
import type { CanvasContextMenuPresenter } from './useCanvasContextMenuPresenter';

const mockCodeView = vi.hoisted(() => vi.fn());

vi.mock('../CodeView', () => ({
  default: (props: Record<string, unknown>) => {
    mockCodeView(props);
    return <div data-testid="code-workbench-panel" />;
  },
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
    mockCodeView.mockClear();
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

  function expectMenuLayerVisible(): void {
    expect(container.querySelector('[data-slot="canvas-context-menu-layer"]')).not.toBeNull();
  }

  function expectMenuClosed(): void {
    expect(container.querySelector('[data-slot="canvas-context-menu"]')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-context-menu-layer"]')).toBeNull();
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
          clientX: 481,
          clientY: 319,
        })
      );
    });

    expectMenuVisible();
    expectMenuLayerVisible();

    await act(async () => {
      vi.advanceTimersByTime(1001);
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

    expectMenuClosed();
  });

  it('routes canvas validation to the operational drawer without previewing execution', async () => {
    const onPreviewExecutionPlan = vi.fn();
    useUiLayoutStore.setState({ bottomDrawerHeight: 0, bottomDrawerVisible: false });

    await renderShell({
      chromeCommands: { onPreviewExecutionPlan },
      chromeState: { canPlanGraph: true },
    });
    const presenter = getContextMenuPresenter();

    await act(async () => {
      presenter.handleCanvasAction({
        action: 'validate-graph',
        label: 'Validate graph',
      });
    });

    expect(onPreviewExecutionPlan).not.toHaveBeenCalled();
    expect(useUiLayoutStore.getState()).toMatchObject({
      bottomDrawerHeight: 160,
      bottomDrawerVisible: true,
    });
    expect(useOperationalDrawerContributionStore.getState().activeTab).toBe('problems');
  });

  it('keeps execution preview available from the canvas menu when readiness is blocked', async () => {
    const onPreviewExecutionPlan = vi.fn();

    await renderShell({
      chromeCommands: { onPreviewExecutionPlan },
      chromeState: { canPlanGraph: false },
    });
    const presenter = getContextMenuPresenter();

    await act(async () => {
      presenter.handlePaneContextMenu({
        preventDefault: vi.fn(),
        clientX: 520,
        clientY: 360,
      } as unknown as React.MouseEvent<Element>);
    });

    expect(container.querySelector('[data-slot="canvas-context-menu"]')?.textContent).toContain(
      'Preview execution plan'
    );

    expect(onPreviewExecutionPlan).not.toHaveBeenCalled();
  });

  it('dispatches execution preview from the rendered canvas menu item', async () => {
    const onPreviewExecutionPlan = vi.fn();

    await renderShell({
      chromeCommands: { onPreviewExecutionPlan },
      chromeState: { canPlanGraph: false },
    });
    const presenter = getContextMenuPresenter();

    await act(async () => {
      presenter.handlePaneContextMenu({
        preventDefault: vi.fn(),
        clientX: 520,
        clientY: 360,
      } as unknown as React.MouseEvent<Element>);
    });

    const previewItem = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '[data-slot="canvas-context-menu"] [role="menuitem"]'
      )
    ).find((element) => element.textContent === 'Preview execution plan');

    expect(previewItem).toBeDefined();

    await act(async () => {
      previewItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onPreviewExecutionPlan).toHaveBeenCalledTimes(1);
    expectMenuClosed();
  });

  it('does not expose execution preview when route permissions block planning', async () => {
    const onPreviewExecutionPlan = vi.fn();

    await renderShell({
      chromeCommands: { onPreviewExecutionPlan },
      panels: {
        userPermissions: {
          canPlan: false,
          canRun: false,
          canEditEdges: true,
        },
      },
    });
    const presenter = getContextMenuPresenter();

    await act(async () => {
      presenter.handlePaneContextMenu({
        preventDefault: vi.fn(),
        clientX: 520,
        clientY: 360,
      } as unknown as React.MouseEvent<Element>);
    });

    expect(container.querySelector('[data-slot="canvas-context-menu"]')?.textContent).not.toContain(
      'Preview execution plan'
    );

    await act(async () => {
      presenter.handleCanvasAction({
        action: 'preview-execution-plan',
        label: 'Preview execution plan',
      });
    });

    expect(onPreviewExecutionPlan).toHaveBeenCalledTimes(1);
  });
});
