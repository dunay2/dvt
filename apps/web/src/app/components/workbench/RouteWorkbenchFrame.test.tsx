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

    expect(container.textContent).toContain('Shared header');
    expect(container.textContent).toContain('Route body');
  });
});
