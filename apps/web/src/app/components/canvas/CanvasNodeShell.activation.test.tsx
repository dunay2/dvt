// @vitest-environment jsdom
/** Prove immediate native inspection and separate Model entry without losing control/drag admission. */
import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { expect, it, vi } from 'vitest';
import { CanvasNodeShell } from './CanvasNodeShell';
import { canvasNodeEmbeddedControlProps } from './canvasNodeInteractionBoundary';
import {
  activateFocusedCanvasNodeFromKeyboard,
  consumeCanvasDragClick,
} from '../../views/canvas/canvasViewportInteraction';
import {
  CONTEXT_MENU_MODEL,
  setupCanvasNodeShellTestSurface,
} from './CanvasNodeShell.test-support';

const surface = setupCanvasNodeShellTestSurface();
function render(props: Partial<React.ComponentProps<typeof CanvasNodeShell>>): void {
  act(() =>
    surface.root.render(
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
}
function body(): Element {
  return surface.container.querySelector('[data-testid="node-body"]')!;
}

it('inspects on the first pointer click before any clock advances', async () => {
  vi.useFakeTimers();
  const select = vi.fn();
  const open = vi.fn();
  render({ onSelectNode: select, onOpenNode: open });
  await act(() => fireEvent.click(body(), { detail: 1 }));
  expect(select).toHaveBeenCalledOnce();
  expect(open).not.toHaveBeenCalled();
  await act(() => vi.runAllTimers());
  expect(select).toHaveBeenCalledOnce();
});

it('inspects once and opens once for the native click-click-double-click sequence', () => {
  const select = vi.fn();
  const open = vi.fn();
  render({ onSelectNode: select, onOpenNode: open });
  act(() => {
    fireEvent.click(body(), { detail: 1 });
    fireEvent.click(body(), { detail: 2 });
    fireEvent.dblClick(body(), { detail: 2 });
  });
  expect(select).toHaveBeenCalledOnce();
  expect(open).toHaveBeenCalledOnce();
});

it.each([
  'control',
  'prevented',
  'secondary',
  'control-key',
  'meta-key',
  'shift-key',
  'alt-key',
] as const)('does not inspect or open an excluded %s gesture', (intent) => {
  const select = vi.fn();
  const open = vi.fn();
  render({ onSelectNode: select, onOpenNode: open });
  const target = intent === 'control' ? surface.container.querySelector('button')! : body();
  const options = {
    detail: 1,
    button: intent === 'secondary' ? 2 : 0,
    ctrlKey: intent === 'control-key',
    metaKey: intent === 'meta-key',
    shiftKey: intent === 'shift-key',
    altKey: intent === 'alt-key',
  };
  if (intent === 'prevented') {
    target.addEventListener('click', (event) => event.preventDefault(), {
      capture: true,
      once: true,
    });
    target.addEventListener('dblclick', (event) => event.preventDefault(), {
      capture: true,
      once: true,
    });
  }
  act(() => {
    fireEvent.click(target, options);
    fireEvent.dblClick(target, options);
  });
  expect(select).not.toHaveBeenCalled();
  expect(open).not.toHaveBeenCalled();
});

it.each(['open', 'inspect'] as const)(
  'keeps Enter immediate for the current %s capability',
  async (capability) => {
    const select = vi.fn();
    const open = vi.fn();
    render({ onSelectNode: select, ...(capability === 'open' ? { onOpenNode: open } : {}) });
    const shell = surface.container.querySelector<HTMLElement>('[data-slot="canvas-node-shell"]')!;
    await act(() => fireEvent.keyDown(shell, { key: 'Enter' }));
    expect(select).toHaveBeenCalledTimes(capability === 'inspect' ? 1 : 0);
    expect(open).toHaveBeenCalledTimes(capability === 'open' ? 1 : 0);
  }
);

it('ignores repeated or modified Enter and keyboard input from embedded controls', () => {
  const open = vi.fn();
  render({ onOpenNode: open });
  const shell = surface.container.querySelector<HTMLElement>('[data-slot="canvas-node-shell"]')!;
  act(() => {
    fireEvent.keyDown(shell, { key: 'Enter', repeat: true });
    fireEvent.keyDown(shell, { key: 'Enter', ctrlKey: true });
    fireEvent.keyDown(shell, { key: 'Enter', metaKey: true });
    fireEvent.keyDown(surface.container.querySelector('button')!, { key: 'Enter' });
  });
  expect(open).not.toHaveBeenCalled();
});

it('does not turn a consumed drag click into inspection or Model entry', async () => {
  const select = vi.fn();
  const open = vi.fn();
  const dragged = { current: true };
  act(() =>
    surface.root.render(
      <div onClickCapture={(event) => consumeCanvasDragClick(event, dragged, true)}>
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
  await act(() =>
    fireEvent.click(surface.container.querySelector('[data-slot="canvas-node-shell"]')!, {
      detail: 1,
    })
  );
  expect(dragged.current).toBe(false);
  expect(select).not.toHaveBeenCalled();
  expect(open).not.toHaveBeenCalled();
});
