import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DVT_AUTHORING_NODE_KINDS } from '../plugins/dvt/dvtNodeTypeCatalog';
import { DBT_NODE_KINDS } from '../plugins/nodeTypeCatalog.dbt';
import type { NodeKindRegistration } from '../plugins/nodeTypeContracts';
import type { CanonicalNode } from '../types/canonical';
import { canvasViewCopy } from './canvas/copy';
import {
  buildController,
  createCanvasRouteHarness,
  currentCanvasRouteState,
  expectCanvasBootstrapState,
  expectCanvasSurfaceState,
  mockedUseCanvasController,
  renderCanvasRouteWithController,
  getPrimaryCanvasButtons,
} from './Canvas.test.support';
import { buildCanvasHostCycleControllerState } from './Canvas.test.hostCycleScenario';

type CanvasRouteHarness = ReturnType<typeof createCanvasRouteHarness>;

function expectCanvasRegistryClosed(): void {
  expect(currentCanvasRouteState().explorerProps?.onOpenDataRegistry).toBeUndefined();
}

function expectPrimaryCanvasActionsBlocked(container: ParentNode): void {
  const { layoutButton, planButton, runButton } = getPrimaryCanvasButtons(container);

  expect(layoutButton).toBeDefined();
  expect(planButton).toBeDefined();
  expect(runButton).toBeDefined();
  expect(layoutButton?.getAttribute('disabled')).not.toBeNull();
  expect(planButton?.getAttribute('disabled')).not.toBeNull();
  expect(runButton?.getAttribute('disabled')).not.toBeNull();
}

function expectActiveCanvasTab(args: {
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

function requireAuthoringNodeKind(kind: string): NodeKindRegistration {
  const registration = [...DVT_AUTHORING_NODE_KINDS, ...DBT_NODE_KINDS].find(
    (candidate) => candidate.kind === kind
  );
  if (registration == null) {
    throw new Error(`Missing authoring node kind fixture: ${kind}`);
  }
  return registration;
}

function buildInspectorFixtureNode(): CanonicalNode {
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

function expectBlockedCanvasRouteState(args: {
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

describe('Canvas route states', () => {
  let harness: CanvasRouteHarness;

  beforeEach(() => {
    harness = createCanvasRouteHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });
  it.each([
    {
      name: 'renders a governed loading state inside the canvas workbench',
      overrides: {
        isLoadingGraph: true,
        explorerNodes: [],
      },
      surface: {
        text: 'Loading canvas',
        slot: 'canvas-loading-state',
        viewportVisible: false,
      },
      bootstrap: {
        routeState: 'loading_graph',
        bootstrapStatus: 'pending',
        bootstrapDetail: 'Loading workspace graph for canvas',
        canCompleteBootstrap: false,
      },
    },
    {
      name: 'renders a playground host state when the workspace has no canvas document yet',
      overrides: {
        explorerNodes: [],
        canvasDocument: null,
      },
      surface: {
        text: 'Create canvas',
        slot: 'canvas-playground-empty-state',
        viewportVisible: false,
      },
      bootstrap: {
        routeState: 'needs_canvas',
        bootstrapStatus: 'complete',
        bootstrapDetail: 'Canvas playground is ready to create the first canvas',
        canCompleteBootstrap: true,
      },
    },
  ])('$name', async ({ overrides, surface, bootstrap }) => {
    await renderCanvasRouteWithController(harness, overrides);
    expectCanvasSurfaceState({
      harness,
      text: surface.text,
      slot: surface.slot,
      viewportVisible: surface.viewportVisible,
    });
    expectCanvasBootstrapState(bootstrap);
  });

  it('creates the first transformation canvas through the controller command', async () => {
    const handleCreateCanvasDocument = vi.fn();
    await renderCanvasRouteWithController(harness, {
      explorerNodes: [],
      canvasDocument: null,
      handleCreateCanvasDocument,
    });

    const createButton = Array.from(harness.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Transformation')
    );

    expect(harness.container.textContent).toContain('Create canvas');
    expect(harness.container.textContent).not.toContain('Add first node');
    expect(createButton).toBeDefined();

    createButton?.click();

    expect(handleCreateCanvasDocument).toHaveBeenCalledWith({
      kind: 'transformation',
      title: 'Transformation canvas',
    });
  });

  it('renders read-only empty guidance without suggesting Add data when edits are gated', async () => {
    await renderCanvasRouteWithController(harness, {
      explorerNodes: [],
      canvasDocument: {
        kind: 'transformation',
        title: 'Main canvas',
      },
      userPermissions: {
        canPlan: false,
        canRun: false,
        canEditEdges: false,
        canManagePlugins: false,
        canManageRBAC: false,
      },
    });

    expect(harness.container.textContent).toContain('Start transformation canvas');
    expect(harness.container.textContent).toContain(
      'This workspace does not expose graph nodes yet. Graph edits are disabled in this context.'
    );
    expect(harness.container.textContent).not.toContain('Use Add data');
    expectCanvasRegistryClosed();
  });

  it('routes empty authoring first-node creation through the controller command', async () => {
    const handleCreateAuthoringNode = vi.fn();
    await renderCanvasRouteWithController(harness, {
      explorerNodes: [],
      canvasDocument: {
        kind: 'transformation',
        title: 'Main canvas',
      },
      handleCreateAuthoringNode,
    });

    const sourceButton = Array.from(harness.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Source')
    );

    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expect(harness.container.textContent).toContain('Main canvas');
    expect(harness.container.textContent).toContain('Start transformation canvas');
    expect(harness.container.textContent).toContain('Add first transformation node');
    expect(sourceButton).toBeDefined();

    sourceButton?.click();

    expect(handleCreateAuthoringNode).toHaveBeenCalledWith(requireAuthoringNodeKind('dvt:source'));
  });

  it('proves the first transformation host cycle from create canvas to graph-ready authoring', async () => {
    let currentController = buildController(
      buildCanvasHostCycleControllerState({ kind: 'needs_canvas' })
    );

    const handleCreateCanvasDocument = vi.fn(async (command: { kind: string; title: string }) => {
      currentController = buildController({
        ...buildCanvasHostCycleControllerState({
          kind: 'typed_empty',
          canvasKind: 'transformation',
          title: command.title,
        }),
        handleCreateCanvasDocument,
        handleCreateAuthoringNode,
      });
    });
    const handleCreateAuthoringNode = vi.fn((registration: NodeKindRegistration) => {
      currentController = buildController({
        ...buildCanvasHostCycleControllerState({
          kind: 'graph_ready',
          canvasKind: 'transformation',
          title: 'Transformation canvas',
          firstNodeKind: registration.kind,
        }),
        handleCreateCanvasDocument,
        handleCreateAuthoringNode,
      });
    });

    currentController = buildController({
      ...buildCanvasHostCycleControllerState({ kind: 'needs_canvas' }),
      handleCreateCanvasDocument,
      handleCreateAuthoringNode,
    });
    mockedUseCanvasController.mockImplementation(() => currentController);

    await harness.render();

    const createTransformationButton = Array.from(
      harness.container.querySelectorAll('button')
    ).find((button) => button.textContent?.includes('Transformation'));
    expect(createTransformationButton).toBeDefined();

    createTransformationButton?.click();
    await harness.render();

    expect(handleCreateCanvasDocument).toHaveBeenCalledWith({
      kind: 'transformation',
      title: 'Transformation canvas',
    });
    expect(harness.container.textContent).toContain('Start transformation canvas');
    expect(harness.container.textContent).toContain('Add first transformation node');
    expectCanvasBootstrapState({
      routeState: 'empty',
      bootstrapStatus: 'complete',
      bootstrapDetail: canvasViewCopy.emptyCanvasReadyDetail,
      canCompleteBootstrap: true,
    });

    const sourceButton = Array.from(harness.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Source')
    );
    expect(sourceButton).toBeDefined();

    sourceButton?.click();
    await harness.render();

    expect(handleCreateAuthoringNode).toHaveBeenCalledWith(requireAuthoringNodeKind('dvt:source'));
    expect(harness.container.querySelector('[data-slot="canvas-empty-state"]')).toBeNull();
    expect(
      harness.container.querySelector('[data-slot="canvas-playground-empty-state"]')
    ).toBeNull();
    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expectCanvasBootstrapState({
      routeState: 'ready',
      bootstrapStatus: 'complete',
      bootstrapDetail: canvasViewCopy.canvasReadyDetail,
      canCompleteBootstrap: true,
    });
  });

  it('proves the first dbt host cycle from create canvas to graph-ready authoring', async () => {
    let currentController = buildController(
      buildCanvasHostCycleControllerState({ kind: 'needs_canvas' })
    );

    const handleCreateCanvasDocument = vi.fn(async (command: { kind: string; title: string }) => {
      currentController = buildController({
        ...buildCanvasHostCycleControllerState({
          kind: 'typed_empty',
          canvasKind: 'dbt',
          title: command.title,
        }),
        handleCreateCanvasDocument,
        handleCreateAuthoringNode,
      });
    });
    const handleCreateAuthoringNode = vi.fn((registration: NodeKindRegistration) => {
      currentController = buildController({
        ...buildCanvasHostCycleControllerState({
          kind: 'graph_ready',
          canvasKind: 'dbt',
          title: 'dbt canvas',
          firstNodeKind: registration.kind,
        }),
        handleCreateCanvasDocument,
        handleCreateAuthoringNode,
      });
    });

    currentController = buildController({
      ...buildCanvasHostCycleControllerState({ kind: 'needs_canvas' }),
      handleCreateCanvasDocument,
      handleCreateAuthoringNode,
    });
    mockedUseCanvasController.mockImplementation(() => currentController);

    await harness.render();

    const createDbtButton = Array.from(harness.container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('dbt')
    );
    expect(createDbtButton).toBeDefined();

    createDbtButton?.click();
    await harness.render();

    expect(handleCreateCanvasDocument).toHaveBeenCalledWith({
      kind: 'dbt',
      title: 'dbt canvas',
    });
    expect(harness.container.textContent).toContain('Start dbt canvas');
    expect(harness.container.textContent).toContain('Add first dbt node');
    expect(harness.container.textContent).not.toContain('Start transformation canvas');
    expectCanvasBootstrapState({
      routeState: 'empty',
      bootstrapStatus: 'complete',
      bootstrapDetail: canvasViewCopy.emptyCanvasReadyDetail,
      canCompleteBootstrap: true,
    });

    const sourceButton = Array.from(harness.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Source')
    );
    expect(sourceButton).toBeDefined();

    sourceButton?.click();
    await harness.render();

    expect(handleCreateAuthoringNode).toHaveBeenCalledWith(requireAuthoringNodeKind('dbt:source'));
    expect(harness.container.querySelector('[data-slot="canvas-empty-state"]')).toBeNull();
    expect(
      harness.container.querySelector('[data-slot="canvas-playground-empty-state"]')
    ).toBeNull();
    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expectCanvasBootstrapState({
      routeState: 'ready',
      bootstrapStatus: 'complete',
      bootstrapDetail: canvasViewCopy.canvasReadyDetail,
      canCompleteBootstrap: true,
    });
  });

  it('continues the typed transformation host cycle into preview and run without losing host context', async () => {
    let currentController = buildController(
      buildCanvasHostCycleControllerState({ kind: 'needs_canvas' })
    );

    const handlePlan = vi.fn(async () => {
      currentController = buildController({
        ...buildCanvasHostCycleControllerState({
          kind: 'graph_ready',
          canvasKind: 'transformation',
          title: 'Transformation canvas',
          firstNodeKind: 'dvt:source',
        }),
        handleCreateCanvasDocument,
        handleCreateAuthoringNode,
        handlePlan,
        handleStartRun,
        canStartRun: true,
        planStatusSummary: canvasViewCopy.planStatusPreviewReadyMessage,
        transformationValidation: {
          valid: true,
          summaryCode: 'valid',
          draftSignature: 'draft-ready',
          scopedNodeIds: ['node.source'],
          scopedEdgeIds: [],
          nodeRolesById: { 'node.source': 'source' },
        },
      });
    });
    const handleStartRun = vi.fn();
    const handleCreateCanvasDocument = vi.fn(async (command: { kind: string; title: string }) => {
      currentController = buildController({
        ...buildCanvasHostCycleControllerState({
          kind: 'typed_empty',
          canvasKind: 'transformation',
          title: command.title,
        }),
        handleCreateCanvasDocument,
        handleCreateAuthoringNode,
        handlePlan,
        handleStartRun,
      });
    });
    const handleCreateAuthoringNode = vi.fn((registration: NodeKindRegistration) => {
      currentController = buildController({
        ...buildCanvasHostCycleControllerState({
          kind: 'graph_ready',
          canvasKind: 'transformation',
          title: 'Transformation canvas',
          firstNodeKind: registration.kind,
        }),
        handleCreateCanvasDocument,
        handleCreateAuthoringNode,
        handlePlan,
        handleStartRun,
        planStatusSummary: canvasViewCopy.planStatusPreviewRequiredMessage,
        transformationValidation: {
          valid: true,
          summaryCode: 'valid',
          draftSignature: 'draft-ready',
          scopedNodeIds: ['node.source'],
          scopedEdgeIds: [],
          nodeRolesById: { 'node.source': 'source' },
        },
      });
    });

    currentController = buildController({
      ...buildCanvasHostCycleControllerState({ kind: 'needs_canvas' }),
      handleCreateCanvasDocument,
      handleCreateAuthoringNode,
      handlePlan,
      handleStartRun,
    });
    mockedUseCanvasController.mockImplementation(() => currentController);

    await harness.render();

    const createTransformationButton = Array.from(
      harness.container.querySelectorAll('button')
    ).find((button) => button.textContent?.includes('Transformation'));
    expect(createTransformationButton).toBeDefined();

    createTransformationButton?.click();
    await harness.render();

    const sourceButton = Array.from(harness.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Source')
    );
    expect(sourceButton).toBeDefined();

    sourceButton?.click();
    await harness.render();

    expectActiveCanvasTab({
      container: harness.container,
      title: 'Transformation canvas',
      kindLabel: 'Transformation',
    });

    const planButtonBeforePreview = getPrimaryCanvasButtons(harness.container).planButton;
    expect(planButtonBeforePreview).toBeDefined();

    planButtonBeforePreview?.click();
    await harness.render();

    expect(handlePlan).toHaveBeenCalledTimes(1);
    expectActiveCanvasTab({
      container: harness.container,
      title: 'Transformation canvas',
      kindLabel: 'Transformation',
    });

    const runButton = getPrimaryCanvasButtons(harness.container).runButton;
    expect(runButton?.getAttribute('disabled')).toBeNull();

    runButton?.click();

    expect(handleStartRun).toHaveBeenCalledTimes(1);
    expectActiveCanvasTab({
      container: harness.container,
      title: 'Transformation canvas',
      kindLabel: 'Transformation',
    });
  });

  it('restores the authoritative typed empty canvas tab and posture from draft truth on reopen', async () => {
    await renderCanvasRouteWithController(harness, {
      ...buildCanvasHostCycleControllerState({
        kind: 'restored_empty',
        canvasKind: 'dbt',
        title: 'Warehouse dbt',
      }),
      canvasAuthoringMode: 'transformation',
    });

    expectActiveCanvasTab({
      container: harness.container,
      title: 'Warehouse dbt',
      kindLabel: 'dbt',
    });
    expect(harness.container.textContent).toContain('Start dbt canvas');
    expect(harness.container.textContent).toContain('Add first dbt node');
    expect(harness.container.textContent).not.toContain('Create canvas');
    expect(harness.container.textContent).not.toContain('Start transformation canvas');
    expect(harness.container.querySelector('[data-slot="canvas-empty-state"]')).not.toBeNull();
    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expectCanvasBootstrapState({
      routeState: 'empty',
      bootstrapStatus: 'complete',
      bootstrapDetail: canvasViewCopy.emptyCanvasReadyDetail,
      canCompleteBootstrap: true,
    });
  });

  it('restores the authoritative graph-ready canvas tab and posture from draft truth on reopen', async () => {
    await renderCanvasRouteWithController(harness, {
      ...buildCanvasHostCycleControllerState({
        kind: 'restored_graph_ready',
        canvasKind: 'transformation',
        title: 'Transformation canvas',
        firstNodeKind: 'dvt:source',
      }),
      canvasAuthoringMode: 'dbt',
    });

    expectActiveCanvasTab({
      container: harness.container,
      title: 'Transformation canvas',
      kindLabel: 'Transformation',
    });
    expect(harness.container.querySelector('[data-slot="canvas-empty-state"]')).toBeNull();
    expect(
      harness.container.querySelector('[data-slot="canvas-playground-empty-state"]')
    ).toBeNull();
    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expectCanvasBootstrapState({
      routeState: 'ready',
      bootstrapStatus: 'complete',
      bootstrapDetail: canvasViewCopy.canvasReadyDetail,
      canCompleteBootstrap: true,
    });
  });

  it('renders empty guidance without suggesting Add data when source import is unavailable', async () => {
    await renderCanvasRouteWithController(harness, {
      explorerNodes: [],
      canvasDocument: {
        kind: 'transformation',
        title: 'Main canvas',
      },
      canOpenSourceImport: false,
    });

    expect(harness.container.textContent).toContain('Start transformation canvas');
    expect(harness.container.textContent).toContain('Source import is unavailable in this runtime');
    expect(harness.container.textContent).not.toContain('Use Add data');
    expectCanvasRegistryClosed();
  });

  it('shows a typed transformation empty canvas catalog instead of the dbt catalog', async () => {
    await renderCanvasRouteWithController(harness, {
      explorerNodes: [],
      canvasDocument: {
        kind: 'transformation',
        title: 'Main canvas',
      },
    });

    expect(harness.container.textContent).toContain('Start transformation canvas');
    expect(harness.container.textContent).toContain('Add first transformation node');
    expect(harness.container.textContent).toContain('Main canvas');
    expect(harness.container.textContent).toContain('SQL transform');
    expect(harness.container.textContent).not.toContain('Exposure');
    expect(harness.container.textContent).not.toContain('Metric');
  });

  it('shows a typed dbt empty canvas catalog instead of the transformation catalog', async () => {
    await renderCanvasRouteWithController(harness, {
      explorerNodes: [],
      canvasDocument: {
        kind: 'dbt',
        title: 'dbt canvas',
      },
      canvasAuthoringMode: 'dbt',
    });

    expect(harness.container.textContent).toContain('Start dbt canvas');
    expect(harness.container.textContent).toContain('Add first dbt node');
    expect(harness.container.textContent).toContain('dbt canvas');
    expect(harness.container.textContent).toContain('Exposure');
    expect(harness.container.textContent).toContain('Metric');
    expect(harness.container.textContent).not.toContain('SQL transform');
  });

  it('renders a governed error state when the graph snapshot fails before any nodes are available', async () => {
    await renderCanvasRouteWithController(harness, {
      explorerNodes: [],
      graphErrorMessage: 'workspace graph unavailable',
    });

    expectCanvasSurfaceState({
      harness,
      text: 'Canvas unavailable',
      extraText: 'workspace graph unavailable',
      slot: 'canvas-error-state',
      viewportVisible: false,
    });
    expectCanvasBootstrapState({
      routeState: 'error_graph',
      bootstrapStatus: 'failed',
      bootstrapDetail: 'workspace graph unavailable',
      canCompleteBootstrap: true,
    });
  });

  it('fails closed for unsupported canvas kind across graph, inspector, Plan, and Run', async () => {
    await renderCanvasRouteWithController(harness, {
      canvasDocument: {
        kind: 'retired-canvas-kind',
        title: 'Retired canvas',
      },
      explorerNodes: [],
      inspectorNode: buildInspectorFixtureNode(),
      canEditInspectorNode: true,
      userPermissions: {
        canPlan: true,
        canRun: true,
        canEditEdges: true,
        canManagePlugins: false,
        canManageRBAC: false,
      },
    });

    expectCanvasSurfaceState({
      harness,
      text: 'Canvas unavailable',
      extraText:
        'Canvas cannot open persisted canvas kind "retired-canvas-kind" because no runtime registration is available.',
      slot: 'canvas-error-state',
      viewportVisible: false,
    });
    expectPrimaryCanvasActionsBlocked(harness.container);
    expectCanvasRegistryClosed();
    expect(harness.container.textContent).toContain(
      'Node details are read-only for this workspace state.'
    );
    expect(
      harness.container
        .querySelector<HTMLInputElement>('input[name="node-name"]')
        ?.getAttribute('disabled')
    ).not.toBeNull();
    expectCanvasBootstrapState({
      routeState: 'error_graph',
      bootstrapStatus: 'failed',
      bootstrapDetail:
        'Canvas cannot open persisted canvas kind "retired-canvas-kind" because no runtime registration is available.',
      canCompleteBootstrap: true,
    });
  });

  it('fails closed with disabled-plugin guidance for registered but unavailable canvas kinds', async () => {
    const controller = buildController();

    await renderCanvasRouteWithController(harness, {
      canvasDocument: {
        kind: 'dbt',
        title: 'dbt canvas',
      },
      availableCanvasKinds: controller.availableCanvasKinds.filter(
        (registration) => registration.kind !== 'dbt'
      ),
      explorerNodes: [],
      inspectorNode: buildInspectorFixtureNode(),
      canEditInspectorNode: true,
      userPermissions: {
        canPlan: true,
        canRun: true,
        canEditEdges: true,
        canManagePlugins: false,
        canManageRBAC: false,
      },
    });

    expectCanvasSurfaceState({
      harness,
      text: 'Canvas unavailable',
      extraText:
        'Canvas cannot open persisted canvas kind "dbt" because its plugin is disabled or unavailable.',
      slot: 'canvas-error-state',
      viewportVisible: false,
    });
    expectPrimaryCanvasActionsBlocked(harness.container);
    expectCanvasRegistryClosed();
    expectCanvasBootstrapState({
      routeState: 'error_graph',
      bootstrapStatus: 'failed',
      bootstrapDetail:
        'Canvas cannot open persisted canvas kind "dbt" because its plugin is disabled or unavailable.',
      canCompleteBootstrap: true,
    });
  });

  it('blocks the canvas surface in api mode when backend readiness is not satisfied', async () => {
    await renderCanvasRouteWithController(harness, {
      dataSourceMode: 'api',
      backendReady: false,
      backendBlockMessage: 'Readiness not satisfied: database_not_configured.',
    });

    expectBlockedCanvasRouteState({
      harness,
      text: 'Backend not ready',
      detail: 'Readiness not satisfied: database_not_configured.',
      routeState: 'blocked_backend',
      bootstrapStatus: 'complete',
      canCompleteBootstrap: true,
    });
  });

  it('prioritizes backend blocked route state over draft recovery banners', async () => {
    await renderCanvasRouteWithController(harness, {
      dataSourceMode: 'api',
      backendReady: false,
      backendBlockMessage: 'Readiness not satisfied: database_not_configured.',
      draftRecoveryReason: 'missing_remote',
      draftToolbarState: {
        label: 'Draft missing',
        tone: 'warning',
        showReloadAction: true,
      },
    });

    expect(harness.container.querySelector('[data-slot="canvas-blocked-state"]')).not.toBeNull();
    expect(
      harness.container.querySelector('[data-slot="canvas-missing-remote-draft-state"]')
    ).toBeNull();
    expectCanvasBootstrapState({
      routeState: 'blocked_backend',
      bootstrapStatus: 'complete',
      bootstrapDetail: 'Readiness not satisfied: database_not_configured.',
      canCompleteBootstrap: true,
    });
  });

  it('keeps toolbar workflow posture aligned with blocked backend route even when draft reload remains available', async () => {
    await renderCanvasRouteWithController(harness, {
      dataSourceMode: 'api',
      backendReady: false,
      backendBlockMessage: 'Readiness not satisfied: database_not_configured.',
      draftRecoveryReason: 'missing_remote',
      draftToolbarState: {
        label: 'Draft missing',
        tone: 'warning',
        showReloadAction: true,
      },
    });

    const toolbarText = document.getElementById('shell-top-bar-canvas-controls')?.textContent ?? '';

    expect(toolbarText).toContain('Read only');
    expect(toolbarText).not.toContain('Recovery');
    expect(toolbarText).toContain('Reload latest draft');
  });

  it('keeps dbt first-node authoring available while execution actions stay unavailable', async () => {
    await renderCanvasRouteWithController(harness, {
      ...buildCanvasHostCycleControllerState({
        kind: 'typed_empty',
        canvasKind: 'dbt',
        title: 'Warehouse dbt',
      }),
      canStartRun: false,
    });

    expectActiveCanvasTab({
      container: harness.container,
      title: 'Warehouse dbt',
      kindLabel: 'dbt',
    });
    expect(harness.container.textContent).toContain('Start dbt canvas');
    expect(harness.container.textContent).toContain('Add first dbt node');
    expect(
      Array.from(harness.container.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('Source'))
        ?.getAttribute('disabled')
    ).toBeNull();

    const { planButton, runButton } = getPrimaryCanvasButtons(harness.container);
    expect(planButton?.getAttribute('disabled')).not.toBeNull();
    expect(runButton?.getAttribute('disabled')).not.toBeNull();
  });
});
