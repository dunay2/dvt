// @vitest-environment jsdom

import { ReactFlowProvider } from '@xyflow/react';
import { fireEvent } from '@testing-library/dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React, { act } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasNodeShell } from './CanvasNodeShell';
import type { CanvasNodeContextMenuModel } from './canvasNodeContextMenuModel';
import { canvasNodeEmbeddedControlProps } from './canvasNodeInteractionBoundary';
import {
  activateFocusedCanvasNodeFromKeyboard,
  consumeCanvasDragClick,
} from '../../views/canvas/canvasViewportInteraction';

const CONTEXT_MENU_MODEL: CanvasNodeContextMenuModel = {
  target: { kind: 'node', nodeId: 'model-orders', nodeName: 'Orders model' },
  actionGroups: [
    {
      id: 'edit',
      label: 'Edit',
      actions: [
        {
          id: 'duplicate-node',
          label: 'Duplicate',
          intent: 'command',
          disabled: false,
        },
      ],
    },
  ],
};

const canvasNodeShellCssPath = resolve(import.meta.dirname, 'CanvasNodeShell.module.css');
const themeCssPath = resolve(import.meta.dirname, '../../../styles/theme.css');

describe('CanvasNodeShell', () => {
  let container: HTMLDivElement;
  let root: Root;
  let previousActEnvironment: boolean | undefined;

  beforeEach(() => {
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
    globalObject.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    if (previousActEnvironment === undefined) {
      Reflect.deleteProperty(globalObject, 'IS_REACT_ACT_ENVIRONMENT');
    } else {
      globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }
  });

  const renderGestureShell = (
    props: Partial<React.ComponentProps<typeof CanvasNodeShell>>
  ): void => {
    act(() =>
      root.render(
        <div className="react-flow__node" onKeyDownCapture={activateFocusedCanvasNodeFromKeyboard}>
          <CanvasNodeShell
            contextMenuModel={CONTEXT_MENU_MODEL}
            shouldShowSourceHandle={false}
            shouldShowTargetHandle={false}
            onContextMenuAction={vi.fn()}
            {...props}
          >
            <div data-testid="node-body">Orders model</div>
            <button type="button" {...canvasNodeEmbeddedControlProps}>
              Inline control
            </button>
          </CanvasNodeShell>
        </div>
      )
    );
  };

  it('inspects exactly once after a native single click settles', () => {
    vi.useFakeTimers();
    const select = vi.fn();
    const open = vi.fn();
    renderGestureShell({ onSelectNode: select, onOpenNode: open });
    act(() => {
      fireEvent.click(container.querySelector('[data-testid="node-body"]')!, { detail: 1 });
    });
    expect(select).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(select).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(select).toHaveBeenCalledOnce();
    expect(open).not.toHaveBeenCalled();
  });

  it('opens only once for the native click-click-double-click sequence without inspecting', () => {
    vi.useFakeTimers();
    const select = vi.fn();
    const open = vi.fn();
    renderGestureShell({ onSelectNode: select, onOpenNode: open });
    const body = container.querySelector('[data-testid="node-body"]')!;
    act(() => {
      fireEvent.click(body, { detail: 1 });
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      fireEvent.click(body, { detail: 2 });
      fireEvent.dblClick(body, { detail: 2 });
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(open).toHaveBeenCalledOnce();
    expect(select).not.toHaveBeenCalled();
  });

  it.each([
    'control',
    'context-menu',
    'pointer-elsewhere',
    'keyboard-elsewhere',
    'owner-change',
    'unmount',
  ] as const)('cancels pending pointer inspection after %s', (nextIntent) => {
    vi.useFakeTimers();
    const select = vi.fn();
    const open = vi.fn();
    renderGestureShell({ onSelectNode: select, onOpenNode: open });
    const body = container.querySelector('[data-testid="node-body"]')!;
    act(() => {
      fireEvent.click(body, { detail: 1 });
    });
    act(() => {
      if (nextIntent === 'control')
        fireEvent.click(container.querySelector('button')!, { detail: 1 });
      if (nextIntent === 'context-menu') fireEvent.contextMenu(body);
      if (nextIntent === 'pointer-elsewhere') fireEvent.pointerDown(document.body, { button: 0 });
      if (nextIntent === 'keyboard-elsewhere') fireEvent.keyDown(document.body, { key: 'Escape' });
      if (nextIntent === 'unmount') root.render(null);
    });
    if (nextIntent === 'owner-change')
      renderGestureShell({
        onSelectNode: select,
        onOpenNode: open,
        contextMenuModel: {
          ...CONTEXT_MENU_MODEL,
          target: { kind: 'node', nodeId: 'different-model', nodeName: 'Different model' },
        },
      });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(select).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it('uses the current callback for an unchanged card when its single click settles', () => {
    vi.useFakeTimers();
    const previous = vi.fn();
    const current = vi.fn();
    renderGestureShell({ onSelectNode: previous });
    act(() => {
      fireEvent.click(container.querySelector('[data-testid="node-body"]')!, { detail: 1 });
    });
    renderGestureShell({ onSelectNode: current });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(previous).not.toHaveBeenCalled();
    expect(current).toHaveBeenCalledOnce();
  });

  it.each(['open', 'inspect'] as const)(
    'routes Enter immediately to the card %s capability without delayed inspection',
    (capability) => {
      vi.useFakeTimers();
      const select = vi.fn();
      const open = vi.fn();
      renderGestureShell({
        onSelectNode: select,
        ...(capability === 'open' ? { onOpenNode: open } : {}),
      });
      const shell = container.querySelector<HTMLElement>('[data-slot="canvas-node-shell"]')!;
      expect(shell.tabIndex).toBe(0);
      expect(shell.getAttribute('aria-keyshortcuts')).toBe('Enter');
      act(() => {
        fireEvent.click(shell, { detail: 1 });
      });
      act(() => {
        fireEvent.keyDown(shell, { key: 'Enter' });
      });
      expect(select).toHaveBeenCalledTimes(capability === 'inspect' ? 1 : 0);
      expect(open).toHaveBeenCalledTimes(capability === 'open' ? 1 : 0);
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(select).toHaveBeenCalledTimes(capability === 'inspect' ? 1 : 0);
      expect(open).toHaveBeenCalledTimes(capability === 'open' ? 1 : 0);
    }
  );

  it('does not schedule inspection for a drag click consumed by the viewport capture boundary', () => {
    vi.useFakeTimers();
    const select = vi.fn();
    const open = vi.fn();
    const pendingDragClick = { current: true };
    act(() =>
      root.render(
        <div onClickCapture={(event) => consumeCanvasDragClick(event, pendingDragClick, true)}>
          <CanvasNodeShell
            contextMenuModel={CONTEXT_MENU_MODEL}
            shouldShowSourceHandle={false}
            shouldShowTargetHandle={false}
            onContextMenuAction={vi.fn()}
            onSelectNode={select}
            onOpenNode={open}
          >
            Orders model
          </CanvasNodeShell>
        </div>
      )
    );
    act(() => {
      fireEvent.click(container.querySelector('[data-slot="canvas-node-shell"]')!, { detail: 1 });
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(pendingDragClick.current).toBe(false);
    expect(select).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it('opens the node through its dedicated activation intent on body double-click', () => {
    const openNode = vi.fn();

    act(() => {
      root.render(
        <CanvasNodeShell
          contextMenuModel={CONTEXT_MENU_MODEL}
          shouldShowSourceHandle={false}
          shouldShowTargetHandle={false}
          onContextMenuAction={vi.fn()}
          onOpenNode={openNode}
        >
          <div>Orders model</div>
        </CanvasNodeShell>
      );
    });

    act(() => {
      fireEvent.dblClick(container.querySelector('div')!);
    });

    expect(openNode).toHaveBeenCalledOnce();
  });

  it('delegates Enter to the viewport without fallback activation for modifiers or repeated keys', () => {
    const openNode = vi.fn();
    act(() => {
      root.render(
        <div className="react-flow__node" onKeyDownCapture={activateFocusedCanvasNodeFromKeyboard}>
          <CanvasNodeShell
            contextMenuModel={CONTEXT_MENU_MODEL}
            shouldShowSourceHandle={false}
            shouldShowTargetHandle={false}
            onContextMenuAction={vi.fn()}
            onOpenNode={openNode}
          >
            <button type="button" {...canvasNodeEmbeddedControlProps}>
              View data
            </button>
          </CanvasNodeShell>
        </div>
      );
    });
    const shell = container.querySelector<HTMLElement>('[data-slot="canvas-node-shell"]')!;
    expect(shell.tabIndex).toBe(0);
    act(() => {
      fireEvent.keyDown(shell, { key: 'Enter' });
      fireEvent.keyDown(shell, { key: 'Enter', repeat: true });
      fireEvent.keyDown(shell, { key: 'Enter', ctrlKey: true });
      fireEvent.keyDown(shell, { key: 'Enter', metaKey: true });
      fireEvent.keyDown(container.querySelector('button')!, { key: 'Enter' });
    });
    expect(openNode).toHaveBeenCalledOnce();
  });

  it('activates the node on a body click without activating embedded controls', () => {
    const selectNode = vi.fn();

    act(() => {
      root.render(
        <CanvasNodeShell
          contextMenuModel={CONTEXT_MENU_MODEL}
          shouldShowSourceHandle={false}
          shouldShowTargetHandle={false}
          onContextMenuAction={vi.fn()}
          onSelectNode={selectNode}
        >
          <button type="button" {...canvasNodeEmbeddedControlProps}>
            Inline control
          </button>
          <div data-testid="node-body">Orders model</div>
        </CanvasNodeShell>
      );
    });

    act(() => {
      fireEvent.click(container.querySelector('[data-testid="node-body"]')!);
      fireEvent.click(container.querySelector('button')!);
    });

    expect(selectNode).toHaveBeenCalledOnce();
  });

  it('does not enter the node when double-click starts on an embedded node control', () => {
    const openNode = vi.fn();
    const onContextMenuAction = vi.fn();

    act(() => {
      root.render(
        <CanvasNodeShell
          contextMenuModel={CONTEXT_MENU_MODEL}
          shouldShowSourceHandle={false}
          shouldShowTargetHandle={false}
          onContextMenuAction={onContextMenuAction}
          onOpenNode={openNode}
        >
          <button type="button" {...canvasNodeEmbeddedControlProps}>
            Inline control
          </button>
        </CanvasNodeShell>
      );
    });

    act(() => {
      fireEvent.dblClick(container.querySelector('button')!);
    });

    expect(openNode).not.toHaveBeenCalled();
    expect(onContextMenuAction).not.toHaveBeenCalled();
  });

  it('opens node operations from a native right-click on the node body', async () => {
    const onContextMenuAction = vi.fn();

    act(() => {
      root.render(
        <CanvasNodeShell
          contextMenuModel={CONTEXT_MENU_MODEL}
          shouldShowSourceHandle={false}
          shouldShowTargetHandle={false}
          onContextMenuAction={onContextMenuAction}
        >
          <div data-testid="node-body">Orders model</div>
        </CanvasNodeShell>
      );
    });

    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 });
    const target = container.querySelector('[data-testid="node-body"]')!;
    await act(async () => {
      target.dispatchEvent(event);
    });

    expect(document.querySelector('[data-slot="canvas-node-context-menu"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="canvas-node-context-menu"]')?.textContent).toContain(
      'Duplicate'
    );
    expect(onContextMenuAction).not.toHaveBeenCalled();
  });

  it.each([
    { close: 'Escape', handoff: false },
    { close: 'Properties', handoff: false },
    { close: 'Properties', handoff: true },
  ])(
    'preserves focus ownership after $close with external handoff $handoff',
    async ({ close, handoff }) => {
      const onContextMenuAction = vi.fn();
      act(() => {
        root.render(
          <>
            <CanvasNodeShell
              contextMenuModel={{
                ...CONTEXT_MENU_MODEL,
                actionGroups: [
                  {
                    id: 'inspect',
                    label: 'Inspect',
                    actions: [
                      {
                        id: 'open-properties',
                        label: 'Properties',
                        intent: 'query',
                        disabled: false,
                      },
                    ],
                  },
                ],
              }}
              shouldShowSourceHandle={false}
              shouldShowTargetHandle={false}
              onContextMenuAction={onContextMenuAction}
              onOpenNode={vi.fn()}
            >
              Orders model
            </CanvasNodeShell>
            <input aria-label="Inspector name" />
          </>
        );
      });

      const shell = container.querySelector<HTMLElement>('[data-slot="canvas-node-shell"]')!;
      const inspectorInput = container.querySelector('input')!;
      await act(async () => {
        shell.focus();
        fireEvent.contextMenu(shell);
      });
      const menu = document.querySelector<HTMLElement>('[data-slot="canvas-node-context-menu"]')!;
      expect(menu).not.toBeNull();
      const closed = new Promise<void>((resolveClosed) => {
        menu.addEventListener(
          'focusScope.autoFocusOnUnmount',
          () => queueMicrotask(resolveClosed),
          { once: true }
        );
      });

      await act(async () => {
        flushSync(() => {
          if (close === 'Escape') fireEvent.keyDown(menu, { key: 'Escape' });
          else fireEvent.click(menu.querySelector('[role="menuitem"]')!);
        });
        if (handoff) {
          inspectorInput.focus();
          expect(document.activeElement).toBe(inspectorInput);
        }
        await closed;
      });

      expect(document.activeElement).toBe(handoff ? inspectorInput : shell);
      expect(document.querySelector('[data-slot="canvas-node-context-menu"]')).toBeNull();
      if (close === 'Escape') expect(onContextMenuAction).not.toHaveBeenCalled();
      else {
        expect(onContextMenuAction).toHaveBeenCalledOnce();
        expect(onContextMenuAction).toHaveBeenCalledWith('open-properties');
      }
    }
  );

  it('renders graph ports through component-owned presentation slots', () => {
    act(() => {
      root.render(
        <ReactFlowProvider>
          <CanvasNodeShell
            contextMenuModel={CONTEXT_MENU_MODEL}
            shouldShowSourceHandle
            shouldShowTargetHandle
            onContextMenuAction={vi.fn()}
          >
            <div>Orders model</div>
          </CanvasNodeShell>
        </ReactFlowProvider>
      );
    });

    const ports = Array.from(container.querySelectorAll('[data-slot="canvas-node-port-handle"]'));

    expect(ports.map((port) => port.getAttribute('data-port'))).toEqual(['target', 'source']);
  });

  it('renders graph ports with caller-owned semantic tones', () => {
    act(() => {
      root.render(
        <ReactFlowProvider>
          <CanvasNodeShell
            contextMenuModel={CONTEXT_MENU_MODEL}
            shouldShowSourceHandle
            shouldShowTargetHandle
            sourceHandleTone="source"
            targetHandleTone="model"
            onContextMenuAction={vi.fn()}
          >
            <div>Orders model</div>
          </CanvasNodeShell>
        </ReactFlowProvider>
      );
    });

    const ports = Array.from(container.querySelectorAll('[data-slot="canvas-node-port-handle"]'));

    expect(ports.map((port) => port.getAttribute('data-tone'))).toEqual(['model', 'source']);
  });

  it('renders graph ports with caller-owned accessible labels', () => {
    act(() => {
      root.render(
        <ReactFlowProvider>
          <CanvasNodeShell
            contextMenuModel={CONTEXT_MENU_MODEL}
            shouldShowSourceHandle
            shouldShowTargetHandle
            sourcePortLabel="Localized outgoing port"
            targetPortLabel="Localized incoming port"
            onContextMenuAction={vi.fn()}
          >
            <div>Orders model</div>
          </CanvasNodeShell>
        </ReactFlowProvider>
      );
    });

    const ports = Array.from(container.querySelectorAll('[data-slot="canvas-node-port-handle"]'));

    expect(ports.map((port) => port.getAttribute('aria-label'))).toEqual([
      'Localized incoming port',
      'Localized outgoing port',
    ]);
  });

  it('renders graph ports with caller-owned compatibility state and descriptions', () => {
    act(() => {
      root.render(
        <ReactFlowProvider>
          <CanvasNodeShell
            contextMenuModel={CONTEXT_MENU_MODEL}
            shouldShowSourceHandle
            shouldShowTargetHandle
            sourcePortLabel="Outgoing port"
            targetPortLabel="Incoming port"
            sourcePortCompatibility={{
              state: 'available',
              compatibleNodeNames: ['Orders model'],
              description: 'Compatible with Orders model',
            }}
            targetPortCompatibility={{
              state: 'blocked',
              compatibleNodeNames: [],
              description: 'No compatible upstream nodes',
            }}
            onContextMenuAction={vi.fn()}
          >
            <div>Orders model</div>
          </CanvasNodeShell>
        </ReactFlowProvider>
      );
    });

    const ports = Array.from(container.querySelectorAll('[data-slot="canvas-node-port-handle"]'));

    expect(ports.map((port) => port.getAttribute('data-port-compatibility'))).toEqual([
      'blocked',
      'available',
    ]);
    expect(ports.map((port) => port.getAttribute('title'))).toEqual([
      'No compatible upstream nodes',
      'Compatible with Orders model',
    ]);
  });

  it('renders graph ports with stable React Flow handle ids', () => {
    act(() => {
      root.render(
        <ReactFlowProvider>
          <CanvasNodeShell
            contextMenuModel={CONTEXT_MENU_MODEL}
            shouldShowSourceHandle
            shouldShowTargetHandle
            onContextMenuAction={vi.fn()}
          >
            <div>Orders model</div>
          </CanvasNodeShell>
        </ReactFlowProvider>
      );
    });

    const ports = Array.from(container.querySelectorAll('[data-slot="canvas-node-port-handle"]'));

    expect(ports.map((port) => port.getAttribute('data-handleid'))).toEqual(['target', 'source']);
  });

  it('keeps graph port tone colors in global design tokens instead of component-local hex values', () => {
    const componentCss = readFileSync(canvasNodeShellCssPath, 'utf8');
    const themeCss = readFileSync(themeCssPath, 'utf8');

    expect(componentCss).not.toMatch(/#[0-9a-fA-F]{3,8}/u);
    expect(componentCss).toContain(".portHandle[data-tone='control']");
    expect(themeCss).toContain('--canvas-node-port-source-ring');
    expect(themeCss).toContain('--canvas-node-port-model-ring');
    expect(themeCss).toContain('--canvas-node-port-test-ring');
    expect(themeCss).toContain('--canvas-node-port-output-ring');
    expect(themeCss).toContain('--canvas-node-port-control-ring');
  });
});
