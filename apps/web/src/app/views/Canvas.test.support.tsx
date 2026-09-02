// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { expect, vi } from 'vitest';

import { DVT_AUTHORING_NODE_KINDS } from '../plugins/dvt/dvtNodeTypeCatalog';
import { DBT_NODE_KINDS } from '../plugins/nodeTypeCatalog.dbt';
import type { NodeKindRegistration } from '../plugins/nodeTypeContracts';
import type { CanonicalNode } from '../types/canonical';
import {
  getPublishedRouteBootstrapPresentation,
  resetRouteBootstrapPresentation,
} from '../bootstrap/routeBootstrapRegistry';
import { AppServicesProvider } from '../services/AppServicesContext';
import { getRouteBootstrapRegistration } from '../bootstrap/routeBootstrapRegistration';
import Canvas from './Canvas';
import {
  CANVAS_ROUTE_BOOTSTRAP_HANDLE,
  getCanvasDraftPresentationState,
  resetCanvasDraftPresentationState,
} from './canvas/canvasDraftPresentationStore';
import { useCanvasWorkspaceMenuContributionStore } from './canvas/canvasWorkspaceMenuContributionStore';
import { useCanvasController } from './canvas/useCanvasController';
import { buildController, type CanvasController } from './Canvas.test.controller';
import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import { createTestQueryClient } from '../../testing/reactQueryHarness';
export { buildController } from './Canvas.test.controller';

export const CANVAS_ROUTE_BOOTSTRAP_REGISTRATION = getRouteBootstrapRegistration('dbt.canvas', {
  routeBootstrap: CANVAS_ROUTE_BOOTSTRAP_HANDLE,
})!;

const canvasRouteState = vi.hoisted(() => ({
  viewportProps: null as null | Record<string, unknown>,
  initialEntry: '/canvas',
  router: null as ReturnType<typeof createMemoryRouter> | null,
}));

vi.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReactFlow: () => ({
    screenToFlowPosition: (screenPosition: { x: number; y: number }) => screenPosition,
  }),
}));

vi.mock('./canvas/useCanvasController', () => ({
  useCanvasController: vi.fn(),
}));

vi.mock('../components/SourceImportWizard', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div>Import wizard open</div> : null),
}));

vi.mock('./canvas/CanvasViewport', () => ({
  default: (props: { canPreviewExecutionPlan?: boolean; onPreviewExecutionPlan?: () => void }) => {
    canvasRouteState.viewportProps = props;
    return (
      <div data-slot="canvas-viewport">
        Viewport
        {props.canPreviewExecutionPlan ? (
          <button
            type="button"
            data-slot="canvas-context-preview-execution-plan-command"
            onClick={props.onPreviewExecutionPlan}
          >
            Preview execution plan
          </button>
        ) : null}
      </div>
    );
  },
}));

vi.mock('../components/PlanPreviewModal', () => ({
  PlanPreviewModal: ({ open }: { open: boolean }) =>
    open ? <div>Execution Preview modal</div> : null,
}));

export const mockedUseCanvasController = vi.mocked(useCanvasController);

export function currentCanvasRouteState() {
  return canvasRouteState;
}

async function renderCanvasRoute(root: Root, queryClient: QueryClient): Promise<void> {
  const router = createMemoryRouter(
    [
      {
        id: 'dbt.canvas',
        path: '/canvas/*',
        handle: {
          routeBootstrap: CANVAS_ROUTE_BOOTSTRAP_HANDLE,
        },
        element: <Canvas />,
      },
    ],
    {
      initialEntries: [canvasRouteState.initialEntry],
    }
  );
  canvasRouteState.router = router;

  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <AppServicesProvider overrides={createAppServicesTestOverrides()}>
          <RouterProvider router={router} />
        </AppServicesProvider>
      </QueryClientProvider>
    );
  });
}

export function createCanvasRouteHarness() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const queryClient = createTestQueryClient();
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  mockedUseCanvasController.mockReset();
  canvasRouteState.viewportProps = null;
  canvasRouteState.initialEntry = '/canvas';
  canvasRouteState.router = null;
  resetCanvasDraftPresentationState();
  resetRouteBootstrapPresentation(CANVAS_ROUTE_BOOTSTRAP_REGISTRATION);
  useCanvasWorkspaceMenuContributionStore.setState({ contribution: null });

  return {
    container,
    async render(initialEntry?: string) {
      canvasRouteState.initialEntry = initialEntry ?? '/canvas';
      await renderCanvasRoute(root, queryClient);
    },
    cleanup() {
      act(() => {
        root.unmount();
      });
      resetCanvasDraftPresentationState();
      resetRouteBootstrapPresentation(CANVAS_ROUTE_BOOTSTRAP_REGISTRATION);
      useCanvasWorkspaceMenuContributionStore.setState({ contribution: null });
      queryClient.clear();
      canvasRouteState.router = null;
      container.remove();
    },
  };
}

export function currentCanvasRouteLocation() {
  return canvasRouteState.router?.state.location ?? null;
}

export type CanvasRouteHarness = ReturnType<typeof createCanvasRouteHarness>;

function toCanvasDocumentId(canvasDocument: NonNullable<CanvasController['canvasDocument']>) {
  const existingId = 'id' in canvasDocument ? canvasDocument.id : undefined;

  if (typeof existingId === 'string' && existingId.length > 0) {
    return existingId;
  }

  const titleId = canvasDocument.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return titleId || `${canvasDocument.kind}-canvas`;
}

function normalizeCanvasDocumentState(
  controller: CanvasController,
  overrides?: Partial<CanvasController>
): Pick<CanvasController, 'canvasDocument' | 'canvasDocuments' | 'activeCanvasId'> {
  if (overrides?.canvasDocument === undefined) {
    return {
      canvasDocument: controller.canvasDocument,
      canvasDocuments: controller.canvasDocuments,
      activeCanvasId: controller.activeCanvasId,
    };
  }

  if (overrides.canvasDocument == null) {
    return {
      canvasDocument: null,
      canvasDocuments: overrides.canvasDocuments ?? [],
      activeCanvasId: overrides.activeCanvasId ?? null,
    };
  }

  const activeCanvas = {
    ...overrides.canvasDocument,
    id: toCanvasDocumentId(overrides.canvasDocument),
  };

  return {
    canvasDocument: activeCanvas,
    canvasDocuments: overrides.canvasDocuments ?? [activeCanvas],
    activeCanvasId: overrides.activeCanvasId ?? activeCanvas.id,
  };
}

export async function renderCanvasRouteWithController(
  harness: CanvasRouteHarness,
  overrides?: Partial<CanvasController>,
  options?: Readonly<{ initialEntry?: string }>
) {
  const controller = buildController(overrides);
  mockedUseCanvasController.mockReturnValue({
    ...controller,
    ...normalizeCanvasDocumentState(controller, overrides),
  });
  await harness.render(options?.initialEntry);
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
  readinessStatus: string;
  readinessDetail: string;
}) {
  const { routeState, readinessStatus, readinessDetail } = args;

  expect(currentCanvasDraftPresentationState()).toMatchObject({
    routeState,
    routeReadiness: {
      status: readinessStatus,
      detail: readinessDetail,
    },
  });
  expect(publishedCanvasRouteBootstrapPresentation()).toMatchObject({
    status: readinessStatus,
    detail: readinessDetail,
  });
}

export function expectCanvasRegistryClosed(): void {
  expect(currentCanvasRouteState().viewportProps?.onOpenSourceImport).toBeUndefined();
}

export function buildCanvasRouteReadyNodes(): CanvasController['nodesWithImpact'] {
  return [
    {
      id: 'node.ready',
      type: 'dbtNode',
      position: { x: 0, y: 0 },
      data: {},
    },
  ] as unknown as CanvasController['nodesWithImpact'];
}

export function expectPrimaryCanvasActionsBlocked(container: ParentNode): void {
  const { layoutButton, planButton, runButton } = getPrimaryCanvasButtons(container);
  expect(layoutButton).toBeUndefined();
  expect(planButton).toBeUndefined();
  expect(runButton).toBeUndefined();
}

export function expectActiveCanvasShellIdentity(args: {
  container: ParentNode;
  title: string;
  kindLabel: string;
}): void {
  const { container, title, kindLabel } = args;
  const graphOverlayIdentity = container.querySelector(
    '[data-slot="canvas-active-canvas-identity"]'
  );
  const tabStrip = container.querySelector('[data-slot="canvas-playground-tab-strip"]');
  const contribution = useCanvasWorkspaceMenuContributionStore.getState().contribution;

  expect(tabStrip).toBeNull();
  expect(graphOverlayIdentity).toBeNull();
  expect(contribution).toMatchObject({
    activeCanvas: {
      title,
      kind: kindLabel.toLowerCase(),
    },
  });
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
  readinessStatus?: 'blocked' | 'complete';
}): void {
  const { harness, text, detail, routeState, readinessStatus = 'blocked' } = args;

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
    readinessStatus,
    readinessDetail: detail,
  });
  expectCanvasRegistryClosed();
}
