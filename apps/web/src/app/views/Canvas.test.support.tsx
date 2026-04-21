// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { expect, vi } from 'vitest';

import {
  getPublishedRouteBootstrapPresentation,
  resetRouteBootstrapPresentation,
} from '../bootstrap/routeBootstrapRegistry';
import { getRouteBootstrapRegistration } from '../bootstrap/routeBootstrapRegistration';
import Canvas from './Canvas';
import {
  CANVAS_ROUTE_BOOTSTRAP_HANDLE,
  getCanvasDraftPresentationState,
  resetCanvasDraftPresentationState,
} from './canvas/canvasDraftPresentationStore';
import { useCanvasController } from './canvas/useCanvasController';
import { buildController, type CanvasController } from './Canvas.test.controller';
export { buildController } from './Canvas.test.controller';

export const CANVAS_ROUTE_BOOTSTRAP_REGISTRATION = getRouteBootstrapRegistration('dbt.canvas', {
  routeBootstrap: CANVAS_ROUTE_BOOTSTRAP_HANDLE,
})!;

const canvasRouteState = vi.hoisted(() => ({
  explorerProps: null as null | Record<string, unknown>,
}));

vi.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./canvas/useCanvasController', () => ({
  useCanvasController: vi.fn(),
}));

vi.mock('../components/DbtExplorer', () => ({
  default: (props: Record<string, unknown>) => {
    canvasRouteState.explorerProps = props;
    return <div data-slot="canvas-explorer-panel">Explorer</div>;
  },
}));

vi.mock('../components/InspectorPanel', () => ({
  default: () => <div data-slot="canvas-inspector-panel">Inspector</div>,
}));

vi.mock('../components/SourceImportWizard', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div>Import wizard open</div> : null),
}));

vi.mock('./canvas/CanvasViewport', () => ({
  default: () => <div data-slot="canvas-viewport">Viewport</div>,
}));

vi.mock('../components/Modals', () => ({
  PlanPreviewModal: ({ open }: { open: boolean }) => (open ? <div>Plan preview modal</div> : null),
  ConfirmEdgeModal: ({ open }: { open: boolean }) => (open ? <div>Confirm edge modal</div> : null),
}));

export const mockedUseCanvasController = vi.mocked(useCanvasController);

export function currentCanvasRouteState() {
  return canvasRouteState;
}

async function renderCanvasRoute(root: Root): Promise<void> {
  const router = createMemoryRouter(
    [
      {
        id: 'dbt.canvas',
        path: '/canvas',
        handle: {
          routeBootstrap: CANVAS_ROUTE_BOOTSTRAP_HANDLE,
        },
        element: <Canvas />,
      },
    ],
    {
      initialEntries: ['/canvas'],
    }
  );

  await act(async () => {
    root.render(<RouterProvider router={router} />);
  });
}

export function createCanvasRouteHarness() {
  const topBarCanvasControls = document.createElement('div');
  topBarCanvasControls.id = 'shell-top-bar-canvas-controls';
  document.body.appendChild(topBarCanvasControls);

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  mockedUseCanvasController.mockReset();
  canvasRouteState.explorerProps = null;
  resetCanvasDraftPresentationState();
  resetRouteBootstrapPresentation(CANVAS_ROUTE_BOOTSTRAP_REGISTRATION);

  return {
    container,
    async render() {
      await renderCanvasRoute(root);
    },
    cleanup() {
      act(() => {
        root.unmount();
      });
      resetCanvasDraftPresentationState();
      resetRouteBootstrapPresentation(CANVAS_ROUTE_BOOTSTRAP_REGISTRATION);
      document.getElementById('shell-top-bar-canvas-controls')?.remove();
      container.remove();
    },
  };
}

export async function renderCanvasRouteWithController(
  harness: ReturnType<typeof createCanvasRouteHarness>,
  overrides?: Partial<CanvasController>
) {
  mockedUseCanvasController.mockReturnValue(buildController(overrides));
  await harness.render();
}

export function findCanvasButton(container: ParentNode, label: string) {
  const inContainer = Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent?.includes(label)
  );

  if (inContainer) {
    return inContainer;
  }

  return Array.from(document.querySelectorAll('button')).find((button) =>
    button.textContent?.includes(label)
  );
}

export function getPrimaryCanvasButtons(container: ParentNode) {
  return {
    layoutButton: findCanvasButton(container, 'Layout'),
    planButton: findCanvasButton(container, 'Plan'),
    runButton: findCanvasButton(container, 'Run'),
  };
}

export function currentCanvasDraftPresentationState() {
  return getCanvasDraftPresentationState();
}

export function publishedCanvasRouteBootstrapPresentation() {
  return getPublishedRouteBootstrapPresentation(CANVAS_ROUTE_BOOTSTRAP_REGISTRATION);
}

export function expectCanvasSurfaceState(args: {
  harness: ReturnType<typeof createCanvasRouteHarness>;
  text: string;
  slot: string;
  viewportVisible: boolean;
  extraText?: string;
}) {
  const { harness, text, slot, viewportVisible, extraText } = args;

  expect(harness.container.textContent).toContain(text);
  if (extraText) {
    expect(harness.container.textContent).toContain(extraText);
  }
  expect(harness.container.querySelector(`[data-slot="${slot}"]`)).not.toBeNull();
  expect(harness.container.querySelector('[data-slot="canvas-viewport"]') != null).toBe(
    viewportVisible
  );
}

export function expectCanvasBootstrapState(args: {
  routeState: string;
  bootstrapStatus: string;
  bootstrapDetail: string;
  canCompleteBootstrap: boolean;
}) {
  const { routeState, bootstrapStatus, bootstrapDetail, canCompleteBootstrap } = args;

  expect(currentCanvasDraftPresentationState()).toMatchObject({
    routeState,
    bootstrapStatus,
    bootstrapDetail,
    canCompleteBootstrap,
  });
  expect(publishedCanvasRouteBootstrapPresentation()).toMatchObject({
    status: bootstrapStatus,
    detail: bootstrapDetail,
    canComplete: canCompleteBootstrap,
  });
}
