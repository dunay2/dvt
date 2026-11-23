// @vitest-environment jsdom
/** Protect the same draft when closing or replacing the Model workspace. */
import { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { beforeEach, describe, expect, it } from 'vitest';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import { getCanvasShellState } from './CanvasShell.testHarness';
import { MAX_CANVAS_MODEL_TABS } from './canvasWorkspaceTabs';
import {
  setupSemanticEditorShell,
  harness,
  navigation,
  mountModel,
} from './CanvasShell.semanticEditor.test-support';

describe('Canvas Model draft protection', () => {
  setupSemanticEditorShell();
  let model: Awaited<ReturnType<typeof mountModel>>;
  beforeEach(async () => {
    model = await mountModel(true);
    await act(async () => model.data.onOpenNode?.(model.fixture.transform.id));
  }, 5000);

  it('guards replacement by another Model and cancels the queued replacement when staying', async () => {
    const { fixture, onApplyNodeDraft } = model;
    await act(async () =>
      harness.container
        .querySelector<HTMLButtonElement>(
          '[data-slot="canvas-relational-tree-node"][data-operator="join"]'
        )!
        .click()
    );
    await act(async () =>
      harness.container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-edit"]')!
        .click()
    );
    await act(async () =>
      harness.container.querySelector<HTMLButtonElement>('[aria-label="Editar condición"]')!.click()
    );
    await act(async () => {
      const field = harness.container.querySelector<HTMLSelectElement>(
        '[aria-label="Comparador de la condición"]'
      )!;
      field.value = 'not_equal';
      field.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () =>
      fireEvent.mouseDown(
        navigation.querySelector<HTMLButtonElement>('[data-slot="canvas-workspace-tab"]')!,
        { button: 0, ctrlKey: false }
      )
    );
    const other = (
      getCanvasShellState().canvasViewportProps?.nodesWithImpact as Array<{ data: DbtNodeData }>
    )[1]!.data;
    await act(async () => other.onOpenNode?.('other-model'));
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    await act(async () =>
      Array.from(document.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button'))
        .find((button) => button.textContent === 'Keep editing')!
        .click()
    );
    expect(harness.container.querySelector('h1')?.textContent).toBe(fixture.transform.name);
    await act(async () =>
      navigation.querySelector<HTMLButtonElement>('[data-slot="canvas-model-tab-close"]')!.click()
    );
    await act(async () =>
      Array.from(document.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button'))
        .find((button) => button.textContent === 'Discard changes')!
        .click()
    );
    expect(harness.container.querySelector('[data-slot="canvas-model-editor"]')).toBeNull();
    expect(navigation.querySelector('[data-slot="canvas-model-main-tab"]')).toBeNull();
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
  });

  it('guards a local draft with Stay and Discard, without a canonical write', async () => {
    const { onApplyNodeDraft } = model;
    await act(async () =>
      harness.container
        .querySelector<HTMLButtonElement>(
          '[data-slot="canvas-relational-tree-node"][data-operator="join"]'
        )!
        .click()
    );
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
    expect(
      harness.container.querySelector('[data-slot="canvas-relational-tree-apply"]')
    ).toBeNull();
    await act(async () =>
      harness.container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-edit"]')!
        .click()
    );
    await act(async () =>
      harness.container.querySelector<HTMLButtonElement>('[aria-label="Editar condición"]')!.click()
    );
    await act(async () => {
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
    await act(async () =>
      fireEvent.mouseDown(
        navigation.querySelector<HTMLButtonElement>('[data-slot="canvas-workspace-tab"]')!,
        { button: 0, ctrlKey: false }
      )
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
    await act(async () =>
      fireEvent.mouseDown(
        navigation.querySelector<HTMLButtonElement>('[data-slot="canvas-model-main-tab"]')!,
        { button: 0, ctrlKey: false }
      )
    );
    expect(harness.container.querySelector('[data-slot="canvas-model-editor"]')).toBe(editor);
    expect(comparison.value).toBe('not_equal');
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
    await act(async () =>
      navigation.querySelector<HTMLButtonElement>('[data-slot="canvas-model-tab-close"]')!.click()
    );
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    const button = (text: string): HTMLButtonElement =>
      Array.from(document.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button')).find(
        (item) => item.textContent === text
      )!;
    await act(async () => button('Keep editing').click());
    expect(
      harness.container.querySelector('[data-slot="canvas-relational-tree-draft"]')
    ).not.toBeNull();
    await act(async () =>
      navigation.querySelector<HTMLButtonElement>('[data-slot="canvas-model-tab-close"]')!.click()
    );
    await act(async () => button('Discard changes').click());
    expect(harness.container.querySelector('[data-slot="canvas-model-editor"]')).toBeNull();
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
  });
});

type ModelTabFixture = Awaited<ReturnType<typeof mountModel>> &
  Readonly<{
    nodes: readonly { id: string; data: DbtNodeData }[];
    tabs: () => HTMLButtonElement[];
    active: () => HTMLButtonElement | undefined;
    closes: () => NodeListOf<HTMLButtonElement>;
  }>;

async function mountModelTabs(additionalModels: number): Promise<ModelTabFixture> {
  const model = await mountModel(additionalModels);
  const tabs = (): HTMLButtonElement[] => [
    ...navigation.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-model-main-tab"]'),
  ];
  return {
    ...model,
    nodes: getCanvasShellState().canvasViewportProps?.nodesWithImpact as ModelTabFixture['nodes'],
    tabs,
    active: () => tabs().find((tab) => tab.getAttribute('aria-selected') === 'true'),
    closes: () =>
      navigation.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-model-tab-close"]'),
  };
}

async function openModelTabs(nodes: ModelTabFixture['nodes']): Promise<void> {
  for (const node of nodes) await act(async () => node.data.onOpenNode?.(node.id));
}

describe('Canvas Model tabs', () => {
  setupSemanticEditorShell();

  it('admits distinct tabs up to capacity and reuses an existing full-capacity tab', async () => {
    const { fixture, onApplyNodeDraft, tabs, active, nodes } =
      await mountModelTabs(MAX_CANVAS_MODEL_TABS);
    await openModelTabs(nodes);
    expect(tabs()).toHaveLength(MAX_CANVAS_MODEL_TABS);
    expect(active()?.textContent).toBe(`Other model ${MAX_CANVAS_MODEL_TABS - 1}`);
    for (const tab of tabs()) {
      const panel = document.getElementById(tab.getAttribute('aria-controls')!);
      expect(panel?.getAttribute('aria-labelledby')).toBe(tab.id);
    }
    await act(async () => fireEvent.mouseDown(tabs()[0]!, { button: 0, ctrlKey: false }));
    expect(active()?.textContent).toBe(fixture.transform.name);
    await act(async () => nodes[0]!.data.onOpenNode?.(fixture.transform.id));
    expect(tabs()).toHaveLength(MAX_CANVAS_MODEL_TABS);
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
  });

  it('keeps the exact active editor when closing another Model tab', async () => {
    const { fixture, onApplyNodeDraft, tabs, active, nodes, closes } = await mountModelTabs(1);
    await openModelTabs(nodes);
    await act(async () => fireEvent.mouseDown(tabs()[0]!, { button: 0, ctrlKey: false }));
    await act(async () => nodes[0]!.data.onOpenNode?.(fixture.transform.id));
    expect(tabs()).toHaveLength(2);
    const editor = harness.container.querySelector('[data-slot="canvas-model-editor"]');
    expect(editor).toBeInstanceOf(HTMLElement);
    await act(async () => closes()[1]!.click());
    expect(active()?.textContent).toBe(fixture.transform.name);
    expect(tabs()).toHaveLength(1);
    expect(harness.container.querySelector('[data-slot="canvas-model-editor"]')).toBe(editor);
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
  });

  it('admits an extra Model after releasing full tab capacity', async () => {
    const { onApplyNodeDraft, tabs, active, nodes, closes } =
      await mountModelTabs(MAX_CANVAS_MODEL_TABS);
    await openModelTabs(nodes.slice(0, MAX_CANVAS_MODEL_TABS));
    expect(tabs()).toHaveLength(MAX_CANVAS_MODEL_TABS);
    await act(async () => closes()[1]!.click());
    expect(active()?.textContent).toBe(`Other model ${MAX_CANVAS_MODEL_TABS - 1}`);
    expect(tabs()).toHaveLength(MAX_CANVAS_MODEL_TABS - 1);
    const seventh = nodes.at(-1)!;
    await act(async () => seventh.data.onOpenNode?.(seventh.id));
    expect(active()?.textContent).toBe(`Other model ${MAX_CANVAS_MODEL_TABS}`);
    expect(tabs()).toHaveLength(MAX_CANVAS_MODEL_TABS);
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
  });

  it('selects the existing neighbor after closing the active tab at capacity', async () => {
    const { onApplyNodeDraft, tabs, active, nodes, closes } =
      await mountModelTabs(MAX_CANVAS_MODEL_TABS);
    await openModelTabs(nodes.slice(0, MAX_CANVAS_MODEL_TABS));
    expect(tabs()).toHaveLength(MAX_CANVAS_MODEL_TABS);
    expect(active()?.textContent).toBe(`Other model ${MAX_CANVAS_MODEL_TABS - 1}`);
    await act(async () => closes()[MAX_CANVAS_MODEL_TABS - 1]!.click());
    expect(active()?.textContent).toBe(`Other model ${MAX_CANVAS_MODEL_TABS - 2}`);
    expect(tabs()).toHaveLength(MAX_CANVAS_MODEL_TABS - 1);
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
  });
});
