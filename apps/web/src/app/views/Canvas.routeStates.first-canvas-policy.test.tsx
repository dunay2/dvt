import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildCanvasHostCycleControllerState } from './Canvas.test.hostCycleScenario';
import {
  createCanvasRouteHarness,
  expectActiveCanvasTab,
  expectCanvasRegistryClosed,
  getPrimaryCanvasButtons,
  renderCanvasRouteWithController,
  requireAuthoringNodeKind,
  type CanvasRouteHarness,
} from './Canvas.test.support';

describe('Canvas route first-canvas policy', () => {
  let harness: CanvasRouteHarness;

  beforeEach(() => {
    harness = createCanvasRouteHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('creates the first transformation canvas through the controller command', async () => {
    const handleCreateCanvasDocument = vi.fn();
    await renderCanvasRouteWithController(harness, {
      explorerNodes: [],
      canvasDocument: null,
      canCreateCanvasDocument: true,
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
