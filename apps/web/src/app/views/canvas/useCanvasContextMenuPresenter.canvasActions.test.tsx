// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildTestNodeKind } from './canvasKindRegistration.testSupport';
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

function PresenterHarness({
  callbacks,
  onPresenter,
}: Readonly<{
  callbacks: PresenterCallbackSpies;
  onPresenter: (presenter: CanvasContextMenuPresenter) => void;
}>): null {
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
  return null;
}

describe('useCanvasContextMenuPresenter canvas actions', () => {
  let callbacks: PresenterCallbackSpies;
  let container: HTMLDivElement;
  let presenter: CanvasContextMenuPresenter | null;
  let root: Root;

  beforeEach(() => {
    callbacks = {
      onCreateAuthoringNode: vi.fn(),
      onEdgesChange: vi.fn(),
      onOpenSourceImport: vi.fn(),
      onOpenProjectExplorer: vi.fn(),
      onPreviewExecutionPlan: vi.fn(),
      onOpenCanvasSettings: vi.fn(),
    };
    container = document.createElement('div');
    document.body.appendChild(container);
    presenter = null;
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  async function renderAndOpenPaneMenu(): Promise<CanvasContextMenuPresenter> {
    await act(async () => {
      root.render(
        <PresenterHarness callbacks={callbacks} onPresenter={(next) => (presenter = next)} />
      );
    });
    await act(async () => {
      presenter?.handlePaneContextMenu({
        preventDefault: vi.fn(),
        clientX: 320,
        clientY: 260,
      } as unknown as React.MouseEvent<Element>);
    });
    expect(presenter).not.toBeNull();
    return presenter as CanvasContextMenuPresenter;
  }

  it('routes source import with the flow position captured from the canvas gesture', async () => {
    const menuPresenter = await renderAndOpenPaneMenu();

    await act(async () => {
      menuPresenter.handleCanvasAction({ action: 'open-source-import', label: 'Add source' });
    });

    expect(callbacks.onOpenSourceImport).toHaveBeenCalledWith({ x: 420, y: 220 });
    expect(presenter?.model ?? null).toBeNull();
  });

  it('routes canvas-level commands without inventing node actions', async () => {
    let menuPresenter = await renderAndOpenPaneMenu();
    await act(async () => {
      menuPresenter.handleCanvasAction({
        action: 'open-project-explorer',
        label: 'Explore project',
      });
    });

    menuPresenter = await renderAndOpenPaneMenu();
    await act(async () => {
      menuPresenter.handleCanvasAction({
        action: 'preview-execution-plan',
        label: 'Preview execution plan',
      });
    });

    menuPresenter = await renderAndOpenPaneMenu();
    await act(async () => {
      menuPresenter.handleCanvasAction({
        action: 'open-canvas-settings',
        label: 'Canvas settings',
      });
    });

    expect(callbacks.onOpenProjectExplorer).toHaveBeenCalledTimes(1);
    expect(callbacks.onPreviewExecutionPlan).toHaveBeenCalledTimes(1);
    expect(callbacks.onOpenCanvasSettings).toHaveBeenCalledTimes(1);
    expect(presenter?.model ?? null).toBeNull();
  });
});
