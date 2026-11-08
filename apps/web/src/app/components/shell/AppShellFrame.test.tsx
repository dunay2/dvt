// @vitest-environment jsdom

import React, { act } from 'react';
import { createPortal } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../ui/context-menu';

import { AppShellFrame } from './AppShellFrame';

describe('AppShellFrame', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('cancels native context menus across shell slots and portals after child handlers', () => {
    const childHandler = vi.fn((event: React.MouseEvent) => {
      expect(event.defaultPrevented).toBe(false);
    });
    act(() =>
      root.render(
        <AppShellFrame
          bottomDrawer={<input aria-label="Data search" onContextMenu={childHandler} />}
          bottomDrawerHeight={360}
          focusMode={false}
          leftNavigation={<button onContextMenu={childHandler}>Elements</button>}

          showBottomDrawer
          skipToMainContentLabel="Skip"
          topBar={<button onContextMenu={childHandler}>Project</button>}
        >
          <textarea aria-label="Description" onContextMenu={childHandler} />
          {createPortal(
            <div data-testid="owned-portal" onContextMenu={childHandler}>
              Inspector
            </div>,
            document.body
          )}
        </AppShellFrame>
      )
    );
    const targets = [
      ...container.querySelectorAll('button, input, textarea'),
      document.querySelector('[data-testid="owned-portal"]')!,
    ];
    for (const button of [2, 0]) {
      for (const target of targets) {
        const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button });
        act(() => {
          target.dispatchEvent(event);
        });
        expect(event.defaultPrevented).toBe(true);
      }
    }
    expect(childHandler).toHaveBeenCalledTimes(targets.length * 2);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    targets[0]!.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
    const outside = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    container.dispatchEvent(outside);
    expect(outside.defaultPrevented).toBe(false);
  });

  it('preserves one app-owned menu, dismissal and reopening without invoking an action', async () => {
    const action = vi.fn();
    await act(async () =>
      root.render(
        <AppShellFrame
          bottomDrawer={null}
          bottomDrawerHeight={0}
          focusMode={false}
          leftNavigation={null}

          showBottomDrawer={false}
          skipToMainContentLabel="Skip"
          topBar={null}
        >
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div data-testid="menu-target">Card</div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onSelect={action}>Inspect</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </AppShellFrame>
      )
    );
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 });
      await act(async () => {
        container.querySelector('[data-testid="menu-target"]')!.dispatchEvent(event);
      });
      expect(event.defaultPrevented).toBe(true);
      const menus = document.querySelectorAll('[role="menu"]');
      expect(menus).toHaveLength(1);
      expect(menus[0]!.textContent).toBe('Inspect');
      await act(async () => {
        menus[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
      expect(document.querySelector('[role="menu"]')).toBeNull();
    }
    expect(action).not.toHaveBeenCalled();
  });

  it('renders the shell frame regions when navigation and bottom drawer are visible', async () => {
    await act(async () => {
      root.render(
        <AppShellFrame
          bottomDrawer={<div data-testid="bottom-operational-drawer">Operations drawer</div>}
          bottomDrawerHeight={360}
          focusMode={false}
          healthBanner={<div data-testid="shell-banner">Shell banner</div>}
          leftNavigation={<div data-testid="left-nav">Left nav</div>}

          showBottomDrawer
          skipToMainContentLabel="Skip to main content"
          topBar={<div data-testid="top-bar">Top bar</div>}
        >
          <div data-testid="route-outlet">Route outlet</div>
        </AppShellFrame>
      );
    });

    const frame = container.querySelector('[data-slot="app-shell-frame"]');
    const body = container.querySelector('[data-slot="app-shell-body"]');
    const leftNavigation = container.querySelector('[data-slot="app-shell-left-navigation"]');
    const main = container.querySelector('[data-slot="app-shell-main"]');
    const outlet = container.querySelector('[data-slot="app-shell-outlet"]');
    const bottomDrawer = container.querySelector('[data-slot="app-shell-bottom-drawer"]');
    const panelGroup = container.querySelector('[data-slot="resizable-panel-group"]');
    const panels = Array.from(container.querySelectorAll('[data-slot="resizable-panel"]'));
    const skipLinks = Array.from(
      container.querySelectorAll<HTMLAnchorElement>('[data-slot="app-shell-skip-link"]')
    );
    const mainLandmarks = Array.from(container.querySelectorAll('main'));

    expect(frame?.textContent).toContain('Top bar');
    expect(frame?.textContent).toContain('Shell banner');
    expect(body).not.toBeNull();
    expect(leftNavigation?.textContent).toContain('Left nav');
    expect(leftNavigation?.parentElement).toBe(body);
    expect(leftNavigation?.className).toContain('flex');
    expect(leftNavigation?.className).toContain('h-full');
    expect(main?.parentElement).toBe(body);
    expect(outlet?.textContent).toContain('Route outlet');
    expect(outlet?.closest('[data-slot="app-shell-main"]')).toBe(main);
    expect(bottomDrawer?.textContent).toContain('Operations drawer');
    expect(bottomDrawer?.closest('[data-slot="app-shell-main"]')).toBe(main);
    expect(panelGroup?.getAttribute('id')).toBe('app-shell-vertical-panels');
    expect(panels.map((panel) => panel.getAttribute('id'))).toContain(
      'app-shell-route-outlet-panel'
    );
    expect(panels.map((panel) => panel.getAttribute('id'))).toContain(
      'app-shell-bottom-drawer-panel'
    );
    expect(container.querySelector('#app-shell-bottom-drawer-resize-handle svg')).not.toBeNull();
    expect(skipLinks).toHaveLength(1);
    expect(skipLinks[0]?.textContent).toBe('Skip to main content');
    expect(skipLinks[0]?.getAttribute('href')).toBe('#app-shell-main-content');
    expect(mainLandmarks).toHaveLength(1);
    expect(mainLandmarks[0]).toBe(outlet);
    expect(mainLandmarks[0]?.id).toBe('app-shell-main-content');
    expect(mainLandmarks[0]?.tabIndex).toBe(-1);

    skipLinks[0]?.focus();
    await act(async () => {
      skipLinks[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(document.activeElement).toBe(mainLandmarks[0]);
  });

  it('hides navigation and bottom drawer in focus mode while keeping top bar and outlet', async () => {
    await act(async () => {
      root.render(
        <AppShellFrame
          bottomDrawer={<div>Operations drawer</div>}
          bottomDrawerHeight={360}
          focusMode
          healthBanner={<div>Shell banner</div>}
          leftNavigation={<div>Left nav</div>}

          showBottomDrawer
          skipToMainContentLabel="Skip to main content"
          topBar={<div>Top bar</div>}
        >
          <div>Route outlet</div>
        </AppShellFrame>
      );
    });

    const frame = container.querySelector('[data-slot="app-shell-frame"]');
    const leftNavigation = container.querySelector('[data-slot="app-shell-left-navigation"]');
    const bottomDrawer = container.querySelector('[data-slot="app-shell-bottom-drawer"]');
    const outlet = container.querySelector('[data-slot="app-shell-outlet"]');

    expect(frame?.textContent).toContain('Top bar');
    expect(leftNavigation).toBeNull();
    expect(bottomDrawer).toBeNull();
    expect(outlet?.textContent).toContain('Route outlet');
  });

  it('keeps direct navigation beside the outlet outside explicit focus mode', async () => {
    await act(async () => {
      root.render(
        <AppShellFrame
          bottomDrawer={<div>Operations drawer</div>}
          bottomDrawerHeight={0}
          focusMode={false}
          healthBanner={<div>Shell banner</div>}
          leftNavigation={<div>Left nav</div>}

          showBottomDrawer={false}
          skipToMainContentLabel="Skip to main content"
          topBar={<div>Top bar</div>}
        >
          <div>Route outlet</div>
        </AppShellFrame>
      );
    });

    expect(container.querySelector('[data-slot="app-shell-left-navigation"]')?.textContent).toBe(
      'Left nav'
    );
    expect(container.querySelector('[data-slot="app-shell-outlet"]')?.textContent).toContain(
      'Route outlet'
    );
  });
});
