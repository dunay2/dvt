// @vitest-environment jsdom
/** Open and inspect a Model without mutating or requesting its data. */
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { buildSemanticWorkbenchFixture } from '../../labs/semanticWorkbenchFixture';
import {
  setupSemanticEditorShell,
  harness,
  navigation,
  mountModel,
} from './CanvasShell.semanticEditor.test-support';

describe('Canvas Model inspection', () => {
  setupSemanticEditorShell();
  it('selects without navigation or queries, then opens the full-width editor on double-click', async () => {
    const { data, fixture, onSelectNode, previewTransformRows } = await mountModel();
    await act(async () => data.onSelectNode?.(fixture.transform.id));
    expect(onSelectNode).toHaveBeenCalledOnce();
    expect(harness.container.querySelector('[data-slot="canvas-model-editor"]')).toBeNull();
    await act(async () => data.onOpenNode?.(fixture.transform.id));
    expect(harness.container.querySelector('[data-slot="canvas-model-editor"]')).not.toBeNull();
    expect(harness.container.querySelectorAll('[data-slot="canvas-model-view-tab"]')).toHaveLength(
      3
    );
    expect(previewTransformRows).not.toHaveBeenCalled();
    const toolbar = harness.container.querySelector('[data-slot="canvas-model-toolbar"]');
    expect(toolbar?.querySelectorAll('[role="tab"]')).toHaveLength(3);
    const modelTab = toolbar?.querySelector('[data-view="editor"]');
    expect(modelTab?.textContent).toBe(fixture.transform.name);
    expect(modelTab?.getAttribute('aria-selected')).toBe('true');
    expect(modelTab?.classList.contains('workspace-navigation-tab')).toBe(true);
    expect(toolbar?.textContent).not.toContain('Semantic editor');
    expect(navigation.querySelector('[data-slot="canvas-model-main-tab"]')?.textContent).toBe(
      'Semantic editor'
    );
    expect(toolbar?.querySelector('[data-slot="canvas-model-back"]')).toBeNull();
    expect(navigation.querySelector('[data-slot="canvas-model-main-tab"]')).not.toBeNull();
    expect(
      harness.container.querySelector('[data-slot="canvas-relational-tree-start-authoring"]')
    ).toBeNull();
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
