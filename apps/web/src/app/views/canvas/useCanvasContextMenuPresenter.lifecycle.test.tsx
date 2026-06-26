// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildTestNodeKind } from './canvasKindRegistration.testSupport';
import {
  useCanvasContextMenuPresenter,
  type CanvasContextMenuPresenter,
} from './useCanvasContextMenuPresenter';

function PresenterHarness({
  onPresenter,
}: Readonly<{ onPresenter: (presenter: CanvasContextMenuPresenter) => void }>): null {
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
  return null;
}

function createPresenterLifecycleHarness(): {
  expectMenuClosed: () => void;
  expectMenuVisible: () => void;
  getPresenter: () => CanvasContextMenuPresenter;
  openPaneMenuAt: (clientX: number, clientY: number) => Promise<void>;
  render: () => Promise<void>;
  unmount: () => void;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  let presenter: CanvasContextMenuPresenter | null = null;
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  return {
    expectMenuClosed: () => expect(presenter?.model ?? null).toBeNull(),
    expectMenuVisible: () => expect(presenter?.model).not.toBeNull(),
    getPresenter: () => {
      expect(presenter).not.toBeNull();
      return presenter as CanvasContextMenuPresenter;
    },
    openPaneMenuAt: async (clientX, clientY) => {
      await act(async () => {
        presenter?.handlePaneContextMenu({
          preventDefault: vi.fn(),
          clientX,
          clientY,
        } as unknown as React.MouseEvent<Element>);
      });
    },
    render: async () => {
      await act(async () => {
        root.render(<PresenterHarness onPresenter={(next) => (presenter = next)} />);
      });
    },
    unmount: () => {
      act(() => root.unmount());
      container.remove();
      presenter = null;
      vi.clearAllMocks();
    },
  };
}

describe('useCanvasContextMenuPresenter lifecycle', () => {
  let harness: ReturnType<typeof createPresenterLifecycleHarness>;

  beforeEach(() => {
    harness = createPresenterLifecycleHarness();
  });

  afterEach(() => {
    harness.unmount();
    vi.useRealTimers();
  });

  it('keeps the menu open through the browser click echo after a right-click', async () => {
    vi.useFakeTimers();
    await harness.render();

    await harness.openPaneMenuAt(320, 260);
    await act(async () => {
      harness.getPresenter().handlePaneClick({ button: 0, clientX: 356, clientY: 288 });
    });

    harness.expectMenuVisible();
  });

  it('closes the menu on an immediate real outside click away from the context point', async () => {
    vi.useFakeTimers();
    await harness.render();

    await harness.openPaneMenuAt(320, 260);
    await act(async () => {
      document.dispatchEvent(
        new MouseEvent('pointerdown', {
          bubbles: true,
          button: 0,
          clientX: 700,
          clientY: 180,
        })
      );
    });

    harness.expectMenuClosed();
  });

  it('closes the menu on a generic outside pointerdown after a right-click', async () => {
    vi.useFakeTimers();
    await harness.render();

    await harness.openPaneMenuAt(320, 260);
    await act(async () => {
      document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });

    harness.expectMenuClosed();
  });

  it('keeps the menu open when the React Flow pane click echo matches the context point', async () => {
    vi.useFakeTimers();
    await harness.render();

    await harness.openPaneMenuAt(320, 260);
    await act(async () => {
      harness.getPresenter().handlePaneClick({ button: 0, clientX: 321, clientY: 259 });
    });

    harness.expectMenuVisible();
  });

  it('suppresses only the document pointer echo at the original context point', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    await harness.render();

    await harness.openPaneMenuAt(320, 260);
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
    harness.expectMenuVisible();

    vi.setSystemTime(new Date('2026-01-01T00:00:00.351Z'));
    await act(async () => {
      document.dispatchEvent(
        new MouseEvent('pointerdown', {
          bubbles: true,
          button: 0,
          clientX: 700,
          clientY: 180,
        })
      );
    });

    harness.expectMenuClosed();
  });

  it('keeps the menu open through a delayed pointer echo at the original context point', async () => {
    vi.useFakeTimers();
    await harness.render();

    await harness.openPaneMenuAt(320, 260);
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

    harness.expectMenuVisible();
  });

  it('closes on a later click at the context point after consuming the document pointer echo', async () => {
    vi.useFakeTimers();
    await harness.render();

    await harness.openPaneMenuAt(320, 260);
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
    harness.expectMenuVisible();

    vi.advanceTimersByTime(1200);
    await act(async () => {
      harness.getPresenter().handlePaneClick({ button: 0, clientX: 321, clientY: 259 });
    });

    harness.expectMenuClosed();
  });

  it('keeps the menu open through a right-button document pointer event', async () => {
    await harness.render();

    await harness.openPaneMenuAt(320, 260);
    await act(async () => {
      document.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 2 }));
    });

    harness.expectMenuVisible();
  });

  it('closes the menu through a delayed browser click away from the context point', async () => {
    vi.useFakeTimers();
    await harness.render();

    await harness.openPaneMenuAt(320, 260);
    vi.advanceTimersByTime(800);
    await act(async () => {
      harness.getPresenter().handlePaneClick({ button: 0, clientX: 560, clientY: 360 });
    });

    harness.expectMenuClosed();
  });

  it('closes the menu on a later intentional background click away from the context point', async () => {
    vi.useFakeTimers();
    await harness.render();

    await harness.openPaneMenuAt(320, 260);
    vi.advanceTimersByTime(1001);
    await act(async () => {
      harness.getPresenter().handlePaneClick({ button: 0, clientX: 560, clientY: 360 });
    });

    harness.expectMenuClosed();
  });
});
