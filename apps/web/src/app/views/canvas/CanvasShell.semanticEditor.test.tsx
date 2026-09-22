// @vitest-environment jsdom
/** Owned concern: verify independent Model authoring, selection and exploratory-data gestures. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import { buildSemanticWorkbenchFixture } from '../../labs/semanticWorkbenchFixture';
import { createCanvasShellHarness, getCanvasShellState } from './CanvasShell.testHarness';
import { CanvasWorkspaceTopBarIdentity } from './CanvasWorkspaceMenuControls';

describe('Canvas Model editor navigation', () => {
  let harness: ReturnType<typeof createCanvasShellHarness>;
  let navigation: HTMLDivElement;
  let navigationRoot: Root;
  beforeEach(() => {
    harness = createCanvasShellHarness();
    navigation = document.createElement('div');
    document.body.appendChild(navigation);
    navigationRoot = createRoot(navigation);
    act(() => navigationRoot.render(<CanvasWorkspaceTopBarIdentity />));
  });
  afterEach(() => {
    harness.unmount();
    act(() => navigationRoot.unmount());
    navigation.remove();
  });

  async function mountModel(withSecondModel = false): Promise<{
    data: DbtNodeData;
    fixture: ReturnType<typeof buildSemanticWorkbenchFixture>;
    onSelectNode: ReturnType<typeof vi.fn>;
    previewTransformRows: ReturnType<typeof vi.fn>;
    onApplyNodeDraft: ReturnType<typeof vi.fn>;
  }> {
    const fixture = buildSemanticWorkbenchFixture();
    const previewTransformRows = vi.fn();
    const onSelectNode = vi.fn();
    const onApplyNodeDraft = vi.fn(() => ({ outcome: 'no_changes' }) as const);
    const models = [
      fixture.transform,
      ...(withSecondModel
        ? [{ ...fixture.transform, id: 'other-model', name: 'Other model' }]
        : []),
    ];
    await harness.render({
      panels: {
        inspectorGraphNodes: [...fixture.sources, ...models],
        inspectorGraphEdges: fixture.edges,
        relationalTreeAuthoring: { canEditNode: true, onApplyNodeDraft },
      },
      graph: {
        nodesWithImpact: models.map((model) => ({
          id: model.id,
          position: { x: 200, y: 140 },
          type: 'dbtNode',
          data: { ...model, pluginKind: model.kind, onSelectNode },
        })),
        viewport: { x: 40, y: 70, zoom: 0.8 },
      },
      canvasTransformDataSampleQuery: { previewTransformRows },
    });
    const data = (
      getCanvasShellState().canvasViewportProps?.nodesWithImpact as Array<{ data: DbtNodeData }>
    )[0]!.data;
    return { data, fixture, onSelectNode, previewTransformRows, onApplyNodeDraft };
  }

  it('guards replacement by another Model and cancels the queued replacement when staying', async () => {
    const { data, fixture, onApplyNodeDraft } = await mountModel(true);
    act(() => data.onOpenNode?.(fixture.transform.id));
    act(() =>
      harness.container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-node-expand"]')!
        .click()
    );
    act(() =>
      harness.container.querySelector<HTMLButtonElement>('[aria-label="Editar condición"]')!.click()
    );
    act(() => {
      const field = harness.container.querySelector<HTMLSelectElement>(
        '[aria-label="Comparador de la condición"]'
      )!;
      field.value = 'not_equal';
      field.dispatchEvent(new Event('change', { bubbles: true }));
    });
    act(() =>
      navigation.querySelector<HTMLButtonElement>('[data-slot="canvas-workspace-tab"]')!.click()
    );
    const other = (
      getCanvasShellState().canvasViewportProps?.nodesWithImpact as Array<{ data: DbtNodeData }>
    )[1]!.data;
    act(() => other.onOpenNode?.('other-model'));
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    act(() =>
      Array.from(document.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button'))
        .find((button) => button.textContent === 'Keep editing')!
        .click()
    );
    expect(harness.container.querySelector('h1')?.textContent).toBe(fixture.transform.name);
    act(() =>
      navigation.querySelector<HTMLButtonElement>('[data-slot="canvas-model-tab-close"]')!.click()
    );
    act(() =>
      Array.from(document.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button'))
        .find((button) => button.textContent === 'Discard changes')!
        .click()
    );
    expect(harness.container.querySelector('[data-slot="canvas-model-editor"]')).toBeNull();
    expect(navigation.querySelector('[data-slot="canvas-model-main-tab"]')).toBeNull();
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
  });

  it('selects without navigation or queries, then opens the full-width editor on double-click', async () => {
    const { data, fixture, onSelectNode, previewTransformRows } = await mountModel();
    act(() => data.onSelectNode?.(fixture.transform.id));
    expect(onSelectNode).toHaveBeenCalledOnce();
    expect(harness.container.querySelector('[data-slot="canvas-model-editor"]')).toBeNull();
    act(() => data.onOpenNode?.(fixture.transform.id));
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

    act(() => openEditor!.click());

    expect(harness.container.querySelector('[data-slot="canvas-model-editor"]')).not.toBeNull();
    expect(navigation.querySelector('[data-slot="canvas-model-main-tab"]')).not.toBeNull();
    expect(
      harness.container.querySelector('[data-slot="canvas-node-workbench-overlay"]')
    ).toBeNull();
  });

  it('queries data in the bottom drawer without leaving the Canvas or changing its viewport', async () => {
    const { data, fixture, previewTransformRows } = await mountModel();
    previewTransformRows.mockResolvedValue({
      contractVersion: 1,
      canvasId: 'canvas-test',
      transformNodeId: fixture.transform.id,
      draftRevision: 'revision-1',
      semanticPlanSha256: 'a'.repeat(64),
      columns: [{ name: 'id', type: 'integer', nullable: false }],
      rows: [{ values: ['7'] }],
      limit: 20,
      truncated: false,
      sampledAt: '2026-09-22T10:00:00Z',
    });
    expect(previewTransformRows).not.toHaveBeenCalled();
    await act(async () => data.onOpenSourceDataSample?.(fixture.transform.id));
    expect(previewTransformRows).toHaveBeenCalledExactlyOnceWith({
      canvasId: 'canvas-test',
      transformNodeId: fixture.transform.id,
      limit: 20,
    });
    expect(useOperationalDrawerContributionStore.getState()).toMatchObject({
      activeTab: `data:${fixture.transform.id}`,
      contribution: {
        tabs: expect.arrayContaining([
          expect.objectContaining({
            id: `data:${fixture.transform.id}`,
            dataSample: expect.objectContaining({ status: 'ready' }),
          }),
        ]),
      },
    });
    expect(harness.container.querySelector('[data-slot="canvas-model-editor"]')).toBeNull();
    expect(harness.container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
    expect(getCanvasShellState().canvasViewportProps?.viewport).toEqual({
      x: 40,
      y: 70,
      zoom: 0.8,
    });
  });

  it('guards a local draft with Stay and Discard, without a canonical write', async () => {
    const { data, fixture, onApplyNodeDraft } = await mountModel();
    act(() => data.onOpenNode?.(fixture.transform.id));
    act(() =>
      harness.container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-node-expand"]')!
        .click()
    );
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
    expect(
      harness.container.querySelector('[data-slot="canvas-relational-tree-apply"]')
    ).toBeNull();
    act(() =>
      harness.container.querySelector<HTMLButtonElement>('[aria-label="Editar condición"]')!.click()
    );
    act(() => {
      const comparison = harness.container.querySelector<HTMLSelectElement>(
        '[aria-label="Comparador de la condición"]'
      )!;
      comparison.value = 'not_equal';
      comparison.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(
      harness.container.querySelector(
        '[data-slot="canvas-model-actions"] [data-slot="canvas-relational-tree-apply"]'
      )
    ).not.toBeNull();
    const editor = harness.container.querySelector('[data-slot="canvas-model-editor"]');
    const comparison = harness.container.querySelector<HTMLSelectElement>(
      '[aria-label="Comparador de la condición"]'
    )!;
    act(() =>
      navigation.querySelector<HTMLButtonElement>('[data-slot="canvas-workspace-tab"]')!.click()
    );
    expect(
      harness.container
        .querySelector('[data-slot="canvas-model-workspace-surface"]')
        ?.getAttribute('aria-hidden')
    ).toBe('true');
    expect(
      harness.container
        .querySelector('[data-slot="canvas-workspace-surface"]')
        ?.getAttribute('aria-hidden')
    ).toBe('false');
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    act(() =>
      navigation.querySelector<HTMLButtonElement>('[data-slot="canvas-model-main-tab"]')!.click()
    );
    expect(harness.container.querySelector('[data-slot="canvas-model-editor"]')).toBe(editor);
    expect(comparison.value).toBe('not_equal');
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
    act(() =>
      navigation.querySelector<HTMLButtonElement>('[data-slot="canvas-model-tab-close"]')!.click()
    );
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    const button = (text: string): HTMLButtonElement =>
      Array.from(document.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button')).find(
        (item) => item.textContent === text
      )!;
    act(() => button('Keep editing').click());
    expect(
      harness.container.querySelector('[data-slot="canvas-relational-tree-draft"]')
    ).not.toBeNull();
    act(() =>
      navigation.querySelector<HTMLButtonElement>('[data-slot="canvas-model-tab-close"]')!.click()
    );
    act(() => button('Discard changes').click());
    expect(harness.container.querySelector('[data-slot="canvas-model-editor"]')).toBeNull();
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
  });

  it('does not enter authoring when selecting an already participating source', async () => {
    const { data, fixture, onApplyNodeDraft } = await mountModel();
    act(() => data.onOpenNode?.(fixture.transform.id));
    act(() =>
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
