// @vitest-environment jsdom
/** Preserve the current focus owner when an earlier context-menu scope retires. */
import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent, screen } from '@testing-library/dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from './context-menu';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => {
    root.unmount();
  });
  act(() => {
    vi.runOnlyPendingTimers();
  });
  container.remove();
  vi.useRealTimers();
});

function openMenu(
  modal: boolean,
  onCloseAutoFocus?: ComponentProps<typeof ContextMenuContent>['onCloseAutoFocus']
): HTMLElement {
  act(() => {
    root.render(
      <>
        <ContextMenu modal={modal}>
          <ContextMenuTrigger asChild>
            <button type="button">Actions</button>
          </ContextMenuTrigger>
          <ContextMenuContent onCloseAutoFocus={onCloseAutoFocus}>
            <ContextMenuItem>Complete action</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button">Inputs</button>
          </PopoverTrigger>
          <PopoverContent>
            <button type="button">Source choice</button>
          </PopoverContent>
        </Popover>
      </>
    );
  });
  const opener = screen.getByRole('button', { name: 'Actions' });
  act(() => {
    opener.focus();
    fireEvent.contextMenu(opener, { button: 2, clientX: 8, clientY: 8 });
  });
  act(() => {
    vi.runOnlyPendingTimers();
  });
  return opener;
}

it.each([false, true])('preserves the newer Popover after menu cleanup with modal=%s', (modal) => {
  const onClose = vi.fn();
  openMenu(modal, onClose);
  act(() => {
    fireEvent.click(screen.getByRole('menuitem', { name: 'Complete action' }));
  });
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Inputs' }));
  });
  const source = screen.getByRole('button', { name: 'Source choice' });
  expect(document.activeElement).toBe(source);
  act(() => {
    vi.runOnlyPendingTimers();
  });
  expect(document.activeElement).toBe(source);
  expect(screen.getByRole('button', { name: 'Inputs' }).getAttribute('aria-expanded')).toBe('true');
  expect(onClose).toHaveBeenCalledOnce();
});

it.each([false, true])(
  'restores the actual opener without a newer owner with modal=%s',
  (modal) => {
    const onClose = vi.fn();
    const opener = openMenu(modal, onClose);
    act(() => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Complete action' }));
    });
    act(() => {
      vi.runOnlyPendingTimers();
    });
    expect(document.activeElement).toBe(opener);
    expect(onClose).toHaveBeenCalledOnce();
  }
);

it('honors consumer cancellation and invokes its callback once', () => {
  const onClose = vi.fn((event: Event) => event.preventDefault());
  openMenu(false, onClose);
  act(() => {
    fireEvent.click(screen.getByRole('menuitem', { name: 'Complete action' }));
  });
  act(() => {
    vi.runOnlyPendingTimers();
  });
  expect(document.activeElement).toBe(document.body);
  expect(onClose).toHaveBeenCalledOnce();
});
