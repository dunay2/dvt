// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildTestNodeKind } from './canvasKindRegistration.testSupport';
import { CanvasContextMenuView } from './CanvasContextMenuView';
import {
  useCanvasContextMenuPresenter,
  type CanvasContextMenuPresenter,
} from './useCanvasContextMenuPresenter';

function ContextMenuPresenterHarness({
  onPresenter,
}: Readonly<{
  onPresenter: (presenter: CanvasContextMenuPresenter) => void;
}>): JSX.Element {
  const presenter = useCanvasContextMenuPresenter({
    canEditEdges: true,
    canOpenSourceImport: true,
    canOpenProjectExplorer: true,
    canPreviewExecutionPlan: true,
    canOpenCanvasSettings: true,
    authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
    screenToFlowPosition: ({ x, y }) => ({ x: x + 100, y: y - 40 }),
    onCreateAuthoringNode: vi.fn(),
    onEdgesChange: vi.fn(),
    onOpenSourceImport: vi.fn(),
    onOpenProjectExplorer: vi.fn(),
    onPreviewExecutionPlan: vi.fn(),
    onOpenCanvasSettings: vi.fn(),
  });

  onPresenter(presenter);

  return (
    <CanvasContextMenuView
      model={presenter.model}
      menuRef={presenter.menuRef}
      onCanvasAction={presenter.handleCanvasAction}
      onCreateNodeAction={presenter.handleCreateNodeAction}
      onEdgeAction={presenter.handleEdgeAction}
    />
  );
}

describe('useCanvasContextMenuPresenter', () => {
  let container: HTMLDivElement;
  let root: Root;
  let presenter: CanvasContextMenuPresenter | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    presenter = null;
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    presenter = null;
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  async function renderPresenter(): Promise<void> {
    await act(async () => {
      root.render(<ContextMenuPresenterHarness onPresenter={(next) => (presenter = next)} />);
    });
  }

  async function openPaneMenuAt(clientX: number, clientY: number): Promise<void> {
    await act(async () => {
      presenter?.handlePaneContextMenu({
        preventDefault: vi.fn(),
        clientX,
        clientY,
      } as unknown as React.MouseEvent<Element>);
    });
  }

  function expectMenuVisible(): void {
    expect(container.querySelector('[data-slot="canvas-context-menu"]')).not.toBeNull();
  }

  function expectMenuClosed(): void {
    expect(container.querySelector('[data-slot="canvas-context-menu"]')).toBeNull();
  }

  it('keeps the menu open through the browser click echo after a right-click', async () => {
    vi.useFakeTimers();
    await renderPresenter();

    await openPaneMenuAt(320, 260);
    expectMenuVisible();

    await act(async () => {
      presenter?.handlePaneClick({
        button: 0,
        clientX: 356,
        clientY: 288,
      });
    });

    expectMenuVisible();
  });

  it('closes the menu on a later intentional background click away from the context point', async () => {
    vi.useFakeTimers();
    await renderPresenter();

    await openPaneMenuAt(320, 260);
    expectMenuVisible();

    vi.advanceTimersByTime(351);

    await act(async () => {
      presenter?.handlePaneClick({
        button: 0,
        clientX: 560,
        clientY: 360,
      });
    });

    expectMenuClosed();
  });

  it('keeps the menu open through a delayed pointer echo at the original context point', async () => {
    vi.useFakeTimers();
    await renderPresenter();

    await openPaneMenuAt(320, 260);
    expectMenuVisible();

    vi.advanceTimersByTime(450);

    await act(async () => {
      document.dispatchEvent(
        new MouseEvent('pointerdown', {
          bubbles: true,
          button: 0,
          clientX: 321,
          clientY: 259,
        })
      );
    });

    expectMenuVisible();
  });
});
