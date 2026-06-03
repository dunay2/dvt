/** Owned concern: prove RouteWorkbenchFrame renders the route workbench slot contract. */
// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RouteWorkbenchFrame } from './RouteWorkbenchFrame';

describe('RouteWorkbenchFrame', () => {
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

  it('renders shared header and body content', async () => {
    await act(async () => {
      root.render(
        <RouteWorkbenchFrame
          header={<div data-testid="workbench-header">Shared header</div>}
          bodyContainerClassName="max-w-xl"
          slots={{
            primarySurface: <div>Route body</div>,
          }}
        />
      );
    });

    const header = container.querySelector('[data-slot="route-workbench-header"]');
    const body = container.querySelector('[data-slot="route-workbench-body"]');
    const bodyContent = container.querySelector('[data-slot="route-workbench-body-content"]');
    const primarySurface = container.querySelector('[data-slot="route-workbench-primary-surface"]');

    expect(header?.textContent).toContain('Shared header');
    expect(body).not.toBeNull();
    expect(bodyContent?.textContent).toContain('Route body');
    expect(bodyContent?.className).toContain('p-6');
    expect(bodyContent?.className).toContain('pb-10');
    expect(primarySurface?.className).toContain('max-w-xl');
    expect(body?.contains(header ?? null)).toBe(false);
  });

  it('supports non-scroll bodies without adding the shared body padding wrapper', async () => {
    await act(async () => {
      root.render(
        <RouteWorkbenchFrame
          header={<div data-testid="workbench-header">Static header</div>}
          bodyClassName="flex min-h-0 flex-1"
          scroll={false}
          slots={{
            primarySurface: <div data-testid="workbench-body">Static route body</div>,
          }}
        />
      );
    });

    const body = container.querySelector('[data-slot="route-workbench-body"]');
    const bodyContent = container.querySelector('[data-slot="route-workbench-body-content"]');
    const scrollArea = container.querySelector('[data-slot="scroll-area"]');

    expect(body?.textContent).toContain('Static route body');
    expect(body?.className).toContain('flex');
    expect(scrollArea).toBeNull();
    expect(bodyContent).toBeNull();
  });

  it('renders semantic route workbench slots as the only route body API', async () => {
    await act(async () => {
      root.render(
        <RouteWorkbenchFrame
          header={<div data-testid="workbench-header">Slot header</div>}
          slots={{
            leftPanel: <aside>Explorer</aside>,
            primarySurface: <main>Primary surface</main>,
            rightPanel: <aside>Inspector</aside>,
            bottomDrawer: <section>Route drawer</section>,
          }}
        />
      );
    });

    const leftPanel = container.querySelector('[data-slot="route-workbench-left-panel"]');
    const primarySurface = container.querySelector('[data-slot="route-workbench-primary-surface"]');
    const rightPanel = container.querySelector('[data-slot="route-workbench-right-panel"]');
    const bottomDrawer = container.querySelector('[data-slot="route-workbench-bottom-drawer"]');

    expect(leftPanel?.textContent).toContain('Explorer');
    expect(primarySurface?.textContent).toContain('Primary surface');
    expect(rightPanel?.textContent).toContain('Inspector');
    expect(bottomDrawer?.textContent).toContain('Route drawer');
    expect(primarySurface?.parentElement?.getAttribute('data-slot')).toBe(
      'route-workbench-slot-layout'
    );
    expect(bottomDrawer?.parentElement?.getAttribute('data-slot')).toBe(
      'route-workbench-slot-stack'
    );
    expect(bottomDrawer?.closest('[data-slot="route-workbench-body-content"]')).not.toBeNull();
  });
});
