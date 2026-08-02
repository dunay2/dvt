// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AppShellFrame } from './AppShellFrame';

const PINNED_NAVIGATION_DISPOSITION = {
  railMode: 'visible',
  footerMode: 'pinned',
  reason: 'global_route',
} as const;

const MENU_NAVIGATION_DISPOSITION = {
  railMode: 'hidden',
  footerMode: 'menu',
  reason: 'workbench_route',
} as const;

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

  it('renders the shell frame regions when navigation and bottom drawer are visible', async () => {
    await act(async () => {
      root.render(
        <AppShellFrame
          bottomDrawer={<div data-testid="bottom-operational-drawer">Operations drawer</div>}
          focusMode={false}
          healthBanner={<div data-testid="shell-banner">Shell banner</div>}
          leftNavigation={<div data-testid="left-nav">Left nav</div>}
          navigationDisposition={PINNED_NAVIGATION_DISPOSITION}
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
          focusMode
          healthBanner={<div>Shell banner</div>}
          leftNavigation={<div>Left nav</div>}
          navigationDisposition={PINNED_NAVIGATION_DISPOSITION}
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

  it('hides permanent navigation when route posture uses menu navigation', async () => {
    await act(async () => {
      root.render(
        <AppShellFrame
          bottomDrawer={<div>Operations drawer</div>}
          focusMode={false}
          healthBanner={<div>Shell banner</div>}
          leftNavigation={<div>Left nav</div>}
          navigationDisposition={MENU_NAVIGATION_DISPOSITION}
          showBottomDrawer={false}
          skipToMainContentLabel="Skip to main content"
          topBar={<div>Top bar</div>}
        >
          <div>Route outlet</div>
        </AppShellFrame>
      );
    });

    expect(container.querySelector('[data-slot="app-shell-left-navigation"]')).toBeNull();
    expect(container.querySelector('[data-slot="app-shell-outlet"]')?.textContent).toContain(
      'Route outlet'
    );
  });
});
