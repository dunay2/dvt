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
    canOpenCanvasSettings: true,
    authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
    screenToFlowPosition: ({ x, y }) => ({ x: x + 100, y: y - 40 }),
    onCreateAuthoringNode: callbacks.onCreateAuthoringNode,
    onEdgesChange: callbacks.onEdgesChange,
    onOpenSourceImport: callbacks.onOpenSourceImport,
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
      presenter?.handleViewportContextMenu({
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        target: document.createElement('div'),
        clientX: 320,
        clientY: 260,
      } as unknown as React.MouseEvent<HTMLDivElement>);
    });
    expect(presenter).not.toBeNull();
    return presenter as CanvasContextMenuPresenter;
  }

  it('opens the add-node catalog without invoking source import or graph creation', async () => {
    const menuPresenter = await renderAndOpenPaneMenu();

    expect(menuPresenter.model?.canvasActions).toEqual([
      { action: 'open-add-node-catalog', label: 'Add...' },
      { action: 'open-canvas-settings', label: 'Canvas settings' },
    ]);

    await act(async () => {
      menuPresenter.handleCanvasAction({ action: 'open-add-node-catalog', label: 'Add...' });
    });

    expect(callbacks.onOpenSourceImport).not.toHaveBeenCalled();
    expect(callbacks.onCreateAuthoringNode).not.toHaveBeenCalled();
    expect(presenter?.model).toMatchObject({
      surface: 'add-node-catalog',
      flowPosition: { x: 420, y: 220 },
      canvasActions: [],
      catalogActions: [
        {
          action: 'open-source-import',
          label: 'Add source',
          registration: expect.objectContaining({ kind: 'dvt:source' }),
        },
      ],
      createNodeActions: [],
    });
  });

  it('routes source import from inside the add-node catalog with the captured flow position', async () => {
    let menuPresenter = await renderAndOpenPaneMenu();
    await act(async () => {
      menuPresenter.handleCanvasAction({ action: 'open-add-node-catalog', label: 'Add...' });
    });

    menuPresenter = presenter as CanvasContextMenuPresenter;
    await act(async () => {
      menuPresenter.handleCanvasAction({ action: 'open-source-import', label: 'Add source' });
    });

    expect(callbacks.onOpenSourceImport).toHaveBeenCalledWith({ x: 420, y: 220 });
    expect(presenter?.model ?? null).toBeNull();
  });

  it('routes canvas settings from the background context menu', async () => {
    const menuPresenter = await renderAndOpenPaneMenu();
    await act(async () => {
      menuPresenter.handleCanvasAction({
        action: 'open-canvas-settings',
        label: 'Canvas settings',
      });
    });

    expect(callbacks.onOpenCanvasSettings).toHaveBeenCalledTimes(1);
    expect(presenter?.model ?? null).toBeNull();
  });
});
