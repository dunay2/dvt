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
        >
          <div>Route body</div>
        </RouteWorkbenchFrame>
      );
    });

    const header = container.querySelector('[data-slot="route-workbench-header"]');
    const body = container.querySelector('[data-slot="route-workbench-body"]');
    const bodyContent = container.querySelector('[data-slot="route-workbench-body-content"]');

    expect(header?.textContent).toContain('Shared header');
    expect(body).not.toBeNull();
    expect(bodyContent?.textContent).toContain('Route body');
    expect(bodyContent?.className).toContain('p-6');
    expect(bodyContent?.className).toContain('pb-10');
    expect(body?.contains(header ?? null)).toBe(false);
  });

  it('supports non-scroll bodies without adding the shared body padding wrapper', async () => {
    await act(async () => {
      root.render(
        <RouteWorkbenchFrame
          header={<div data-testid="workbench-header">Static header</div>}
          bodyClassName="flex min-h-0 flex-1"
          scroll={false}
        >
          <div data-testid="workbench-body">Static route body</div>
        </RouteWorkbenchFrame>
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
});
