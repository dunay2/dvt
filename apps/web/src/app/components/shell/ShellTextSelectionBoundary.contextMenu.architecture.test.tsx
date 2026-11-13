// @vitest-environment jsdom
/** Owned concern: prove scoped context arbitration without relying on a Frame event handler. */
import React, { act } from 'react';
import { createPortal } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { within } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShellTextSelectionBoundary } from './ShellTextSelectionBoundary';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  document.getSelection()?.removeAllRanges();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  document.getSelection()?.removeAllRanges();
  host.remove();
});

describe('scoped Shell context-menu ownership', () => {
  it.each(['descendant', 'portal'] as const)(
    'cancels the native default after target and original child callbacks for %s',
    (placement) => {
      const order: string[] = [];
      const target = (
        <button
          onContextMenu={(event) => {
            expect(event.defaultPrevented).toBe(false);
            order.push('target');
          }}
        >
          Context target
        </button>
      );
      act(() =>
        root.render(
          <ShellTextSelectionBoundary>
            <div
              onContextMenu={(event) => {
                expect(event.defaultPrevented).toBe(false);
                order.push('child');
              }}
            >
              {placement === 'portal' ? createPortal(target, document.body) : target}
            </div>
          </ShellTextSelectionBoundary>
        )
      );
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 });
      act(() => {
        within(document.body).getByRole('button', { name: 'Context target' }).dispatchEvent(event);
      });
      expect(order).toEqual(['target', 'child']);
      expect(event.defaultPrevented).toBe(true);
      const outside = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      act(() => {
        host.dispatchEvent(outside);
      });
      expect(outside.defaultPrevented).toBe(false);
    }
  );

  it.each([false, true])('respects a stopped local owner with cancellation %s', (cancel) => {
    const originalChild = vi.fn();
    act(() =>
      root.render(
        <ShellTextSelectionBoundary>
          <div onContextMenu={originalChild}>
            <button
              onContextMenu={(event) => {
                if (cancel) event.preventDefault();
                event.stopPropagation();
              }}
            >
              Local owner
            </button>
          </div>
        </ShellTextSelectionBoundary>
      )
    );
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 });
    act(() => {
      within(document.body).getByRole('button', { name: 'Local owner' }).dispatchEvent(event);
    });
    expect(originalChild).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(cancel);
  });
});
