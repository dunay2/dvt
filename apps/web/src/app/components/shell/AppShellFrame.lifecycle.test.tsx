// @vitest-environment jsdom
/** Owned concern: preserve drawer content identity across unrelated shell renders. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AppShellFrame } from './AppShellFrame';

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
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it('retains drawer DOM, local input and focus when resize is followed by a shell render', () => {
  const props = {
    bottomDrawer: <input aria-label="Data search" defaultValue="" />,
    bottomDrawerHeight: 320,
    focusMode: false,
    leftNavigation: null,
    navigationDisposition: {
      railMode: 'hidden',
      footerMode: 'menu',
      reason: 'workbench_route',
    } as const,
    showBottomDrawer: true,
    skipToMainContentLabel: 'Skip',
    topBar: null,
    children: <div>Model</div>,
  };
  vi.stubGlobal('innerHeight', 900);
  act(() => root.render(<AppShellFrame {...props} />));
  const input = container.querySelector('input')!;
  const drawer = container.querySelector('#app-shell-bottom-drawer-panel')!;
  const panelSize = drawer.getAttribute('data-panel-size');
  input.value = 'orders';
  input.focus();
  vi.stubGlobal('innerHeight', 800);
  act(() => {
    window.dispatchEvent(new Event('resize'));
    root.render(<AppShellFrame {...props} topBar={<div>Changed selection</div>} />);
  });
  expect(container.querySelector('input')).toBe(input);
  expect(input.value).toBe('orders');
  expect(document.activeElement).toBe(input);
  expect(drawer.getAttribute('data-panel-size')).toBe(panelSize);

  act(() => root.render(<AppShellFrame {...props} bottomDrawerHeight={400} />));
  expect(
    container.querySelector('#app-shell-bottom-drawer-panel')?.getAttribute('data-panel-size')
  ).not.toBe(panelSize);
});
