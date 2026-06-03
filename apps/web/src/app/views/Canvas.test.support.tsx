// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { expect, vi } from 'vitest';

import { DVT_AUTHORING_NODE_KINDS } from '../plugins/dvt/dvtNodeTypeCatalog';
import { DBT_NODE_KINDS } from '../plugins/nodeTypeCatalog.dbt';
import type { NodeKindRegistration } from '../plugins/nodeTypeContracts';
import type { CanonicalNode } from '../types/canonical';
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
import { useCanvasViewMenuContributionStore } from './canvas/canvasViewMenuContributionStore';
import { useCanvasController } from './canvas/useCanvasController';
import { buildController, type CanvasController } from './Canvas.test.controller';
export { buildController } from './Canvas.test.controller';

export const CANVAS_ROUTE_BOOTSTRAP_REGISTRATION = getRouteBootstrapRegistration('dbt.canvas', {
  routeBootstrap: CANVAS_ROUTE_BOOTSTRAP_HANDLE,
})!;

const canvasRouteState = vi.hoisted(() => ({
  explorerProps: null as null | Record<string, unknown>,
  inspectorProps: null as null | Record<string, unknown>,
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
  default: (props: Record<string, unknown>) => {
    canvasRouteState.inspectorProps = props;
    return (
      <div data-slot="canvas-inspector-panel">
        Inspector
        {props.beforePanels as React.ReactNode}
      </div>
    );
  },
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
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  mockedUseCanvasController.mockReset();
  canvasRouteState.explorerProps = null;
  canvasRouteState.inspectorProps = null;
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
      container.remove();
    },
  };
}

export type CanvasRouteHarness = ReturnType<typeof createCanvasRouteHarness>;

export async function renderCanvasRouteWithController(
  harness: CanvasRouteHarness,
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
    planButton:
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-toolbar-plan-command"]') ??
      undefined,
    runButton:
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-toolbar-run-command"]') ??
      undefined,
  };
}

export function currentCanvasDraftPresentationState() {
  return getCanvasDraftPresentationState();
}

export function publishedCanvasRouteBootstrapPresentation() {
  return getPublishedRouteBootstrapPresentation(CANVAS_ROUTE_BOOTSTRAP_REGISTRATION);
}

export function expectCanvasSurfaceState(args: {
  harness: CanvasRouteHarness;
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

export function expectCanvasRegistryClosed(): void {
  expect(currentCanvasRouteState().explorerProps?.onOpenDataRegistry).toBeUndefined();
}

export function expectPrimaryCanvasActionsBlocked(container: ParentNode): void {
  const { layoutButton, planButton, runButton } = getPrimaryCanvasButtons(container);

  expect(layoutButton).toBeUndefined();
  expect(planButton).toBeUndefined();
  expect(runButton).toBeUndefined();
  expect(useCanvasViewMenuContributionStore.getState().contribution).toBeNull();
}

export function expectActiveCanvasTab(args: {
  container: ParentNode;
  title: string;
  kindLabel: string;
}): void {
  const { container, title, kindLabel } = args;
  const tabStrip = container.querySelector('[data-slot="canvas-playground-tab-strip"]');

  expect(tabStrip).not.toBeNull();
  expect(tabStrip?.textContent).toContain(title);
  expect(tabStrip?.textContent).toContain(kindLabel);
}

export function requireAuthoringNodeKind(kind: string): NodeKindRegistration {
  const registration = [...DVT_AUTHORING_NODE_KINDS, ...DBT_NODE_KINDS].find(
    (candidate) => candidate.kind === kind
  );
  if (registration == null) {
    throw new Error(`Missing authoring node kind fixture: ${kind}`);
  }
  return registration;
}

export function buildInspectorFixtureNode(): CanonicalNode {
  return {
    id: 'node.source',
    name: 'Source',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
  };
}

export function expectBlockedCanvasRouteState(args: {
  harness: CanvasRouteHarness;
  text: string;
  detail: string;
  routeState: 'blocked_backend';
  bootstrapStatus?: 'blocked' | 'complete';
  canCompleteBootstrap?: boolean;
}): void {
  const {
    harness,
    text,
    detail,
    routeState,
    bootstrapStatus = 'blocked',
    canCompleteBootstrap = false,
  } = args;

  expectCanvasSurfaceState({
    harness,
    text,
    extraText: detail,
    slot: 'canvas-blocked-state',
    viewportVisible: false,
  });
  expectPrimaryCanvasActionsBlocked(harness.container);
  expectCanvasBootstrapState({
    routeState,
    bootstrapStatus,
    bootstrapDetail: detail,
    canCompleteBootstrap,
  });
  expectCanvasRegistryClosed();
}
