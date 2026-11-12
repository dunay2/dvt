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

it('retains header controls and route content across Focus presentation changes', () => {
  // Revealing chrome must never restart a route or discard its in-progress input.
  const props = {
    bottomDrawer: null,
    bottomDrawerHeight: 0,
    onBottomDrawerHeightChange: vi.fn(),
    leftNavigation: null,
    showBottomDrawer: false,
    skipToMainContentLabel: 'Skip',
    topBar: <button>View</button>,
    children: <input aria-label="Editor" defaultValue="draft" />,
  };
  act(() => root.render(<AppShellFrame {...props} focusMode={false} />));
  const header = container.querySelector('[data-slot="app-shell-header-host"]');
  const control = container.querySelector('button');
  const editor = container.querySelector('input')!;
  editor.value = 'unsaved SQL';
  for (const focusMode of [true, false, true]) {
    act(() => root.render(<AppShellFrame {...props} focusMode={focusMode} />));
    expect(header).not.toBeNull();
    expect(container.querySelector('[data-slot="app-shell-header-host"]')).toBe(header);
    expect(header?.getAttribute('data-focus-mode')).toBe(String(focusMode));
    expect(container.querySelector('button')).toBe(control);
    expect(container.querySelector('input')).toBe(editor);
    expect(editor.value).toBe('unsaved SQL');
    expect(control?.disabled).toBe(false);
  }
});

it('retains drawer DOM, local input and focus when resize is followed by a shell render', () => {
  const props = {
    bottomDrawer: <input aria-label="Data search" defaultValue="" />,
    bottomDrawerHeight: 320,
    onBottomDrawerHeightChange: vi.fn(),
    focusMode: false,
    leftNavigation: null,
    showBottomDrawer: true,
    skipToMainContentLabel: 'Skip',
    topBar: null,
    children: <div>Model</div>,
  };
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement
  ) {
    return {
      height: this.dataset.panelGroupId === 'app-shell-vertical-panels' ? 800 : 0,
      width: 1000,
      x: 0,
      y: 0,
      top: 0,
      bottom: 800,
      left: 0,
      right: 1000,
      toJSON: () => ({}),
    };
  });
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
  expect(props.onBottomDrawerHeightChange).not.toHaveBeenCalled();
  expect(drawer.getAttribute('data-panel-size')).toBe(panelSize);

  act(() => root.render(<AppShellFrame {...props} bottomDrawerHeight={400} />));
  // A height command must resize the same panel, rather than replacing focused content through a key.
  expect(container.querySelector('input')).toBe(input);
  expect(input.value).toBe('orders');
  expect(document.activeElement).toBe(input);
  expect(
    container.querySelector('#app-shell-bottom-drawer-panel')?.getAttribute('data-panel-size')
  ).not.toBe(panelSize);
});
