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

type PresenterCallbackSpies = Readonly<{
  onCreateAuthoringNode: ReturnType<typeof vi.fn>;
  onEdgesChange: ReturnType<typeof vi.fn>;
  onOpenSourceImport: ReturnType<typeof vi.fn>;
  onOpenProjectExplorer: ReturnType<typeof vi.fn>;
  onPreviewExecutionPlan: ReturnType<typeof vi.fn>;
  onOpenCanvasSettings: ReturnType<typeof vi.fn>;
}>;

function createPresenterCallbackSpies(): PresenterCallbackSpies {
  return {
    onCreateAuthoringNode: vi.fn(),
    onEdgesChange: vi.fn(),
    onOpenSourceImport: vi.fn(),
    onOpenProjectExplorer: vi.fn(),
    onPreviewExecutionPlan: vi.fn(),
    onOpenCanvasSettings: vi.fn(),
  };
}

function ContextMenuPresenterHarness({
  callbacks,
  onPresenter,
}: Readonly<{
  callbacks: PresenterCallbackSpies;
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
    onCreateAuthoringNode: callbacks.onCreateAuthoringNode,
    onEdgesChange: callbacks.onEdgesChange,
    onOpenSourceImport: callbacks.onOpenSourceImport,
    onOpenProjectExplorer: callbacks.onOpenProjectExplorer,
    onPreviewExecutionPlan: callbacks.onPreviewExecutionPlan,
    onOpenCanvasSettings: callbacks.onOpenCanvasSettings,
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
  let callbacks: PresenterCallbackSpies;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    presenter = null;
    callbacks = createPresenterCallbackSpies();
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
      root.render(
        <ContextMenuPresenterHarness
          callbacks={callbacks}
          onPresenter={(next) => (presenter = next)}
        />
      );
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

  it('routes canvas menu actions through the presenter callbacks and closes the menu', async () => {
    await renderPresenter();

    await openPaneMenuAt(320, 260);
    await act(async () => {
      presenter?.handleCanvasAction({ action: 'open-source-import', label: 'Add source' });
    });
    expect(callbacks.onOpenSourceImport).toHaveBeenCalledWith({ x: 420, y: 220 });
    expectMenuClosed();

    await openPaneMenuAt(320, 260);
    await act(async () => {
      presenter?.handleCanvasAction({
        action: 'open-project-explorer',
        label: 'Explore project',
      });
    });
    expect(callbacks.onOpenProjectExplorer).toHaveBeenCalledTimes(1);
    expectMenuClosed();

    await openPaneMenuAt(320, 260);
    await act(async () => {
      presenter?.handleCanvasAction({
        action: 'preview-execution-plan',
        label: 'Preview execution plan',
      });
    });
    expect(callbacks.onPreviewExecutionPlan).toHaveBeenCalledTimes(1);
    expectMenuClosed();

    await openPaneMenuAt(320, 260);
    await act(async () => {
      presenter?.handleCanvasAction({
        action: 'open-canvas-settings',
        label: 'Canvas settings',
      });
    });
    expect(callbacks.onOpenCanvasSettings).toHaveBeenCalledTimes(1);
    expectMenuClosed();
  });

  it('keeps the menu open through a right-button document pointer event', async () => {
    await renderPresenter();

    await openPaneMenuAt(320, 260);
    expectMenuVisible();

    await act(async () => {
      document.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 2 }));
    });

    expectMenuVisible();
  });
});
