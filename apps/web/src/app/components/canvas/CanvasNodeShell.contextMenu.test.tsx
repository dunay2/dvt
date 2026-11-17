// @vitest-environment jsdom
import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { CanvasNodeShell } from './CanvasNodeShell';
import {
  CONTEXT_MENU_MODEL,
  setupCanvasNodeShellTestSurface,
} from './CanvasNodeShell.test-support';
const surface = setupCanvasNodeShellTestSurface();
import { flushSync } from 'react-dom';
/** Prove native menu commands and guarded focus restoration. */
describe('Canvas node contextual operations', () => {
  it('opens node operations from a native right-click on the node body', async () => {
    const onContextMenuAction = vi.fn();

    act(() => {
      surface.root.render(
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
    const target = surface.container.querySelector('[data-testid="node-body"]')!;
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
        surface.root.render(
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

      const shell = surface.container.querySelector<HTMLElement>(
        '[data-slot="canvas-node-shell"]'
      )!;
      const inspectorInput = surface.container.querySelector('input')!;
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
});
