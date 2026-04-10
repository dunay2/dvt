// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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

  it('renders the shell frame regions when navigation and bottom drawer are visible', async () => {
    await act(async () => {
      root.render(
        <AppShellFrame
          bottomDrawer={<div data-testid="console-drawer">Console drawer</div>}
          focusMode={false}
          healthBanner={<div data-testid="shell-banner">Shell banner</div>}
          leftNavigation={<div data-testid="left-nav">Left nav</div>}
          showBottomDrawer
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
    expect(bottomDrawer?.textContent).toContain('Console drawer');
    expect(bottomDrawer?.closest('[data-slot="app-shell-main"]')).toBe(main);
  });

  it('hides navigation and bottom drawer in focus mode while keeping top bar and outlet', async () => {
    await act(async () => {
      root.render(
        <AppShellFrame
          bottomDrawer={<div>Console drawer</div>}
          focusMode
          healthBanner={<div>Shell banner</div>}
          leftNavigation={<div>Left nav</div>}
          showBottomDrawer
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
});
