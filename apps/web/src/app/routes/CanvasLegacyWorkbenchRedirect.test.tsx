// @vitest-environment jsdom

import { waitFor } from '@testing-library/dom';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CANVAS_ROUTE_INTENT_SEARCH_PARAM } from '../views/canvas/canvasLegacyRouteIntent';
import { CanvasLegacyWorkbenchRedirect } from './CanvasLegacyWorkbenchRedirect';

describe('CanvasLegacyWorkbenchRedirect', () => {
  let container: HTMLDivElement;
  let root: Root;
  let previousActEnvironment: boolean | undefined;

  beforeEach(() => {
    const globalObject = globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    };
    previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
    globalObject.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    const globalObject = globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    };
    if (previousActEnvironment === undefined) {
      Reflect.deleteProperty(globalObject, 'IS_REACT_ACT_ENVIRONMENT');
    } else {
      globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }
  });

  it('redirects a retired Code route to the canonical Canvas with its context intact', async () => {
    const router = createMemoryRouter(
      [
        { path: '/canvas', element: <div data-slot="canonical-canvas" /> },
        { path: '/canvas/*', element: <CanvasLegacyWorkbenchRedirect /> },
      ],
      {
        initialEntries: [
          '/canvas/code?authority=dbt-project-files&canvasId=orders&projectRoot=projects%2Forders',
        ],
      }
    );

    await act(async () => root.render(<RouterProvider router={router} />));

    await waitFor(() => expect(router.state.location.pathname).toBe('/canvas'));
    expect(router.state.location.search).toContain('authority=dbt-project-files');
    expect(router.state.location.search).toContain('canvasId=orders');
    expect(router.state.location.search).toContain('projectRoot=projects%2Forders');
    expect(
      new URLSearchParams(router.state.location.search).get(CANVAS_ROUTE_INTENT_SEARCH_PARAM)
    ).toBe('project-code');
    expect(container.querySelector('[data-slot="canonical-canvas"]')).not.toBeNull();
  });
});
