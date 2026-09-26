// @vitest-environment jsdom
/** Open and inspect a Model without mutating or requesting its data. */
import { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { buildSemanticWorkbenchFixture } from '../../labs/semanticWorkbenchFixture';
import { getCanvasShellState } from './CanvasShell.testHarness';
import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import {
  setupSemanticEditorShell,
  harness,
  navigation,
  mountModel,
} from './CanvasShell.semanticEditor.test-support';

describe('Canvas Model inspection', () => {
  setupSemanticEditorShell();
  it('opens named SQL and data outputs in the existing drawer without replacing the editor', async () => {
    const { data, fixture, previewTransformRows, onApplyNodeDraft } = await mountModel();
    await act(async () => data.onOpenNode?.(fixture.transform.id));
    const editor = harness.container.querySelector('[data-slot="canvas-model-editor"]');
    expect(
      useOperationalDrawerContributionStore
        .getState()
        .contribution?.tabs.some((tab) => tab.id.startsWith('sql:'))
    ).toBe(false);
    for (const kind of ['sql', 'data']) {
      await act(async () =>
        harness.container
          .querySelector<HTMLButtonElement>(`[data-slot="canvas-model-open-${kind}"]`)!
          .click()
      );
      const drawer = useOperationalDrawerContributionStore.getState();
      const tab = drawer.contribution?.tabs.find((item) => item.id === drawer.activeTab);
      expect(tab?.id).toMatch(new RegExp(`^${kind}:`));
      expect(tab?.label).toContain(fixture.transform.name);
      expect(tab?.content).toBeDefined();
    }
    expect(harness.container.querySelector('[data-slot="canvas-model-editor"]')).toBe(editor);
    expect(previewTransformRows).not.toHaveBeenCalled();
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
  });
  it('uses shared keyboard navigation between Canvas and the named model', async () => {
    const { data, fixture } = await mountModel();
    await act(async () => data.onOpenNode?.(fixture.transform.id));
    const canvas = navigation.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-workspace-tab"]'
    )!;
    const model = navigation.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-model-main-tab"]'
    )!;
    await act(async () => {
      model.focus();
      fireEvent.keyDown(model, { key: 'Home' });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(document.activeElement).toBe(canvas);
    expect(canvas.getAttribute('aria-selected')).toBe('true');
    await act(async () => {
      fireEvent.keyDown(canvas, { key: 'End' });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(document.activeElement).toBe(model);
    expect(model.getAttribute('aria-selected')).toBe('true');
  });
  it('selects without navigation or queries, then opens the full-width editor on double-click', async () => {
    const { data, fixture, onSelectNode, previewTransformRows } = await mountModel();
    await act(async () => data.onSelectNode?.(fixture.transform.id));
    expect(onSelectNode).toHaveBeenCalledOnce();
    expect(harness.container.querySelector('[data-slot="canvas-model-editor"]')).toBeNull();
    await act(async () => data.onOpenNode?.(fixture.transform.id));
    expect(harness.container.querySelector('[data-slot="canvas-model-editor"]')).not.toBeNull();
    expect(getCanvasShellState().canvasViewportProps?.externalNodeSurfaceActive).toBe(true);
    expect(harness.container.querySelectorAll('[data-slot="canvas-model-view-tab"]')).toHaveLength(
      0
    );
    expect(previewTransformRows).not.toHaveBeenCalled();
    const toolbar = harness.container.querySelector('[data-slot="canvas-model-toolbar"]');
    expect(toolbar?.querySelectorAll('[role="tab"]')).toHaveLength(0);
    expect(toolbar?.textContent).not.toContain('Semantic editor');
    expect(navigation.querySelector('[data-slot="canvas-model-main-tab"]')?.textContent).toBe(
      fixture.transform.name
    );
    expect(toolbar?.querySelector('[data-slot="canvas-model-back"]')).toBeNull();
    expect(navigation.querySelector('[data-slot="canvas-model-main-tab"]')).not.toBeNull();
    expect(
      harness.container.querySelector('[data-slot="canvas-relational-tree-start-authoring"]')
    ).toBeNull();
    await act(async () =>
      fireEvent.mouseDown(
        navigation.querySelector<HTMLButtonElement>('[data-slot="canvas-workspace-tab"]')!,
        { button: 0, ctrlKey: false }
      )
    );
    expect(getCanvasShellState().canvasViewportProps?.externalNodeSurfaceActive).toBe(false);
  });

  it('routes the contextual inspector to the single semantic-editor tab', async () => {
    const fixture = buildSemanticWorkbenchFixture();
    await harness.render({
      layout: { inspectorPanelVisible: true },
      panels: {
        inspectorNode: fixture.transform,
        inspectorPreferredTabId: 'code',
        inspectorGraphNodes: [...fixture.sources, fixture.transform],
        inspectorGraphEdges: fixture.edges,
        relationalTreeAuthoring: {
          canEditNode: true,
          onApplyNodeDraft: vi.fn(() => ({ outcome: 'no_changes' }) as const),
        },
      },
      graph: {
        nodesWithImpact: [
          {
            id: fixture.transform.id,
            position: { x: 200, y: 140 },
            type: 'dbtNode',
            data: { ...fixture.transform, pluginKind: fixture.transform.kind },
          },
        ],
      },
    });

    expect(harness.container.querySelector('[data-slot^="dvt-select-operation-"]')).toBeNull();
    const openEditor = harness.container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-open-semantic-editor"]'
    );
    expect(openEditor).not.toBeNull();

    await act(async () => openEditor!.click());

    expect(harness.container.querySelector('[data-slot="canvas-model-editor"]')).not.toBeNull();
    expect(navigation.querySelector('[data-slot="canvas-model-main-tab"]')).not.toBeNull();
    expect(
      harness.container.querySelector('[data-slot="canvas-node-workbench-overlay"]')
    ).toBeNull();
  });

  it('does not enter authoring when selecting an already participating source', async () => {
    const { data, fixture, onApplyNodeDraft } = await mountModel();
    await act(async () => data.onOpenNode?.(fixture.transform.id));
    await act(async () =>
      harness.container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')!
        .click()
    );
    expect(
      harness.container.querySelector('[data-slot="canvas-relational-tree-block-canvas"]')
    ).toBeNull();
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
  });
});
