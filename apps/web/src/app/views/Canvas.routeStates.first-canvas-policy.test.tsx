import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildCanvasHostCycleControllerState } from './Canvas.test.hostCycleScenario';
import { canvasViewRouteCopyByKey } from './canvas/canvasCopyCatalog.route';
import { canvasViewRouteCopyEs } from './canvas/canvasCopyCatalog.route.es';
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
  const legacyAddDataLabel = ['Add', 'data'].join(' ');

  beforeEach(() => {
    harness = createCanvasRouteHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  async function openFirstNodePalette(firstNodeLabel: string): Promise<void> {
    const trigger = Array.from(harness.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(firstNodeLabel)
    );
    expect(trigger).toBeDefined();
    await act(async () => {
      trigger?.click();
    });
  }

  function findPaletteOption(label: string): HTMLButtonElement | undefined {
    return Array.from(
      document.body.querySelectorAll<HTMLButtonElement>(
        '[data-slot="canvas-add-node-palette-option"]'
      )
    ).find((button) => button.textContent?.includes(label));
  }

  it('uses Add source vocabulary for empty editable route guidance', () => {
    expect(canvasViewRouteCopyByKey.routeEmptyEditableMessage.fallback).toContain('Add source');
    expect(canvasViewRouteCopyByKey.routeEmptyEditableMessage.fallback).not.toContain(
      legacyAddDataLabel
    );
    expect(canvasViewRouteCopyEs.routeEmptyEditableMessage).toContain('Add source');
    expect(canvasViewRouteCopyEs.routeEmptyEditableMessage).not.toContain(legacyAddDataLabel);
  });

  it('creates the first transformation canvas through the controller command', async () => {
    const handleCreateCanvasDocument = vi.fn();
    await renderCanvasRouteWithController(harness, {
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

  it('renders read-only empty guidance without suggesting legacy source actions when edits are gated', async () => {
    await renderCanvasRouteWithController(harness, {
      canvasDocument: {
        kind: 'transformation',
        title: 'Main canvas',
      },
      userPermissions: {
        canPlan: false,
        canRun: false,
        canEditEdges: false,
        canPersistGraphDraft: true,
        canManagePlugins: false,
        canManageRBAC: false,
      },
    });

    expect(harness.container.textContent).toContain('Start transformation canvas');
    expect(harness.container.textContent).toContain(
      'This workspace does not expose graph nodes yet. Graph edits are disabled in this context.'
    );
    expect(harness.container.textContent).not.toContain(`Use ${legacyAddDataLabel}`);
    expectCanvasRegistryClosed();
  });

  it('routes empty authoring first-node creation through the controller command', async () => {
    const handleCreateAuthoringNode = vi.fn();
    await renderCanvasRouteWithController(harness, {
      canvasDocument: {
        kind: 'transformation',
        title: 'Main canvas',
      },
      handleCreateAuthoringNode,
    });

    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expect(harness.container.textContent).toContain('Main canvas');
    expect(harness.container.textContent).toContain('Start transformation canvas');
    expect(harness.container.textContent).toContain('Add first transformation node');

    await openFirstNodePalette('Add first transformation node');

    const sourceButton = findPaletteOption('Source');
    expect(sourceButton).toBeDefined();

    await act(async () => {
      sourceButton?.click();
    });

    expect(handleCreateAuthoringNode).toHaveBeenCalledWith(requireAuthoringNodeKind('dvt:source'));
  });

  it('renders empty guidance without suggesting legacy source actions when source import is unavailable', async () => {
    await renderCanvasRouteWithController(harness, {
      canvasDocument: {
        kind: 'transformation',
        title: 'Main canvas',
      },
      canOpenSourceImport: false,
    });

    expect(harness.container.textContent).toContain('Start transformation canvas');
    expect(harness.container.textContent).toContain('Source import is unavailable in this runtime');
    expect(harness.container.textContent).not.toContain(`Use ${legacyAddDataLabel}`);
    expectCanvasRegistryClosed();
  });

  it('shows a typed transformation empty canvas catalog instead of the dbt catalog', async () => {
    await renderCanvasRouteWithController(harness, {
      canvasDocument: {
        kind: 'transformation',
        title: 'Main canvas',
      },
    });

    expect(harness.container.textContent).toContain('Start transformation canvas');
    expect(harness.container.textContent).toContain('Add first transformation node');
    expect(harness.container.textContent).toContain('Main canvas');
    await openFirstNodePalette('Add first transformation node');
    expect(document.body.textContent).toContain('SQL transform');
    expect(document.body.textContent).not.toContain('Exposure');
    expect(document.body.textContent).not.toContain('Metric');
  });

  it('shows a typed dbt empty canvas catalog instead of the transformation catalog', async () => {
    await renderCanvasRouteWithController(harness, {
      canvasDocument: {
        kind: 'dbt',
        title: 'dbt canvas',
      },
      canvasAuthoringMode: 'dbt',
    });

    expect(harness.container.textContent).toContain('Start dbt canvas');
    expect(harness.container.textContent).toContain('Add first dbt node');
    expect(harness.container.textContent).toContain('dbt canvas');
    await openFirstNodePalette('Add first dbt node');
    expect(document.body.textContent).toContain('Exposure');
    expect(document.body.textContent).toContain('Metric');
    expect(document.body.textContent).not.toContain('SQL transform');
  });

  it('hides typed empty guidance by preference without reintroducing fixed Insert chrome', async () => {
    await renderCanvasRouteWithController(harness, {
      canvasDocument: {
        kind: 'dbt',
        title: 'dbt canvas',
      },
      canvasAuthoringMode: 'dbt',
      canvasEmptyStateGuideVisible: false,
    });

    expect(harness.container.querySelector('[data-slot="canvas-empty-state"]')).toBeNull();
    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expect(harness.container.textContent).toContain('dbt canvas');
    expect(harness.container.textContent).not.toContain('Start dbt canvas');
    expect(harness.container.textContent).not.toContain('Add first dbt node');

    expect(
      harness.container.querySelector('[data-slot="canvas-toolbar-insert-command"]')
    ).toBeNull();
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
    await openFirstNodePalette('Add first dbt node');
    expect(findPaletteOption('Source')?.getAttribute('disabled')).toBeNull();

    const { planButton, runButton } = getPrimaryCanvasButtons(harness.container);
    expect(planButton).toBeUndefined();
    expect(runButton).toBeUndefined();
  });
});
