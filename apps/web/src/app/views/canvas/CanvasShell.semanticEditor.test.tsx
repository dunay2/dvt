// @vitest-environment jsdom
/** Open and inspect a Model without mutating or requesting its data. */
import { act } from 'react';
import { fireEvent, within } from '@testing-library/dom';
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
  it.each([false, true])('hands off entry focus unless the user moved it (%s)', async (moved) => {
    const { data, fixture } = await mountModel();
    const frames: FrameRequestCallback[] = [];
    const schedule = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const opener = document.createElement('button');
    document.body.append(opener);
    try {
      opener.focus();
      await act(async () => data.onOpenNode?.(fixture.transform.id));
      const editor = harness.container.querySelector<HTMLElement>(
        '[data-slot="canvas-model-editor"]'
      )!;
      const modelTab = navigation.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-model-main-tab"]'
      )!;
      if (moved) await act(async () => modelTab.focus());
      await act(async () => frames.splice(0).forEach((callback) => callback(0)));
      expect(document.activeElement).toBe(moved ? modelTab : editor);
      await act(async () =>
        navigation.querySelector<HTMLButtonElement>('[data-slot="canvas-model-tab-close"]')!.click()
      );
      await act(async () => frames.splice(0).forEach((callback) => callback(0)));
      expect(document.activeElement).toBe(opener);
    } finally {
      schedule.mockRestore();
      opener.remove();
    }
  });
  it('opens only the model workspace and leaves existing data results in the drawer', async () => {
    const { data, fixture, previewTransformRows, onApplyNodeDraft } = await mountModel();
    await act(async () => data.onOpenNode?.(fixture.transform.id));
    const editor = harness.container.querySelector('[data-slot="canvas-model-editor"]');
    expect(
      useOperationalDrawerContributionStore
        .getState()
        .contribution?.tabs.some((tab) => tab.id.startsWith('sql:'))
    ).toBe(false);
    const toolbar = harness.container.querySelector('[data-slot="canvas-model-toolbar"]');
    expect(toolbar?.tagName).toBe('FOOTER');
    expect(editor?.firstElementChild).not.toBe(toolbar);
    expect(editor?.lastElementChild).toBe(toolbar);
    expect(toolbar?.querySelectorAll('button')).toHaveLength(0);
    expect(
      useOperationalDrawerContributionStore
        .getState()
        .contribution?.tabs.find((tab) => tab.id === 'data:operation')?.content
    ).toBeDefined();
    expect(harness.container.querySelector('[data-slot="canvas-model-editor"]')).toBe(editor);
    expect(previewTransformRows).not.toHaveBeenCalled();
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
  });
  it('uses shared keyboard navigation between Canvas, Code and the retained named model', async () => {
    const frames: FrameRequestCallback[] = [];
    const schedule = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    try {
      const { data, fixture, previewTransformRows, onApplyNodeDraft } = await mountModel();
      const panelFor = (tab: HTMLElement): HTMLElement => {
        const panel = document.getElementById(tab.getAttribute('aria-controls') ?? '');
        expect(panel).not.toBeNull();
        expect(panel?.getAttribute('role')).toBe('tabpanel');
        expect(panel?.getAttribute('aria-labelledby')).toBe(tab.id);
        return panel!;
      };
      const canvas = navigation.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-workspace-tab"]'
      )!;
      const canvasPanel = panelFor(canvas);
      const viewport = harness.container.querySelector('[data-testid="canvas-viewport"]');
      const activityRail = within(harness.container).getByRole('navigation', {
        name: 'Canvas explorer',
      });
      await act(async () => data.onOpenNode?.(fixture.transform.id));
      const model = navigation.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-model-main-tab"]'
      )!;
      const modelPanel = panelFor(model);
      const code = navigation.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-code-main-tab"]'
      )!;
      let codePanel: HTMLElement | undefined;
      let codeEditor: Element | null | undefined;
      expect(
        model
          .closest('[role="tablist"]')
          ?.contains(navigation.querySelector('[data-slot="canvas-model-tab-close"]'))
      ).toBe(false);
      expect(
        modelPanel.contains(harness.container.querySelector('[data-slot="canvas-model-editor"]'))
      ).toBe(true);
      await act(async () => model.focus());
      for (const [key, target] of [
        ['Home', canvas],
        ['End', model],
        ['ArrowLeft', code],
        ['ArrowLeft', canvas],
        ['ArrowRight', code],
        ['ArrowRight', model],
        ['Home', canvas],
      ] as const) {
        await act(async () => {
          fireEvent.keyDown(document.activeElement!, { key });
          await new Promise((resolve) => setTimeout(resolve, 0));
        });
        await act(async () => frames.splice(0).forEach((callback) => callback(0)));
        expect(document.activeElement).toBe(target);
        expect(target.getAttribute('aria-selected')).toBe('true');
        const activePanel = panelFor(target);
        expect(activePanel.getAttribute('aria-hidden')).toBe('false');
        expect(activePanel.hasAttribute('inert')).toBe(false);
        const visibleRails = within(harness.container).getAllByRole('navigation', {
          name: 'Canvas explorer',
        });
        expect(visibleRails).toHaveLength(1);
        if (target === model) {
          expect(activityRail.closest('[hidden][inert]')).not.toBeNull();
          expect(modelPanel.contains(visibleRails[0]!)).toBe(true);
        } else {
          expect(visibleRails[0]).toBe(activityRail);
          expect(activityRail.closest('[inert], [aria-hidden="true"]')).toBeNull();
        }
        if (target === code) {
          codePanel ??= activePanel;
          codeEditor ??= activePanel.querySelector('[data-testid="sql-context-workbench"]');
          expect(activePanel).toBe(codePanel);
          expect(activePanel.querySelector('[data-testid="sql-context-workbench"]')).toBe(
            codeEditor
          );
        }
        for (const inactive of [canvasPanel, modelPanel, codePanel]) {
          if (inactive == null || inactive === activePanel) continue;
          expect(inactive.getAttribute('aria-hidden')).toBe('true');
          expect(inactive.hasAttribute('inert')).toBe(true);
        }
      }
      await act(async () =>
        navigation.querySelector<HTMLButtonElement>('[data-slot="canvas-model-tab-close"]')!.click()
      );
      expect(panelFor(canvas)).toBe(canvasPanel);
      expect(harness.container.querySelector('[data-testid="canvas-viewport"]')).toBe(viewport);
      expect(document.getElementById(modelPanel.id)).toBeNull();
      expect(previewTransformRows).not.toHaveBeenCalled();
      expect(onApplyNodeDraft).not.toHaveBeenCalled();
    } finally {
      schedule.mockRestore();
    }
  });

  it('does not expose an orphan tab panel without an active Canvas', async () => {
    await harness.render({ panels: { activeCanvas: null, activeCanvasId: null } });
    expect(navigation.querySelector('[role="tab"]')).toBeNull();
    expect(harness.container.querySelector('[role="tabpanel"]')).toBeNull();
  });
  it.each(['Canvas', 'Model'] as const)(
    'rejects a late Code admission after a newer %s selection',
    async (destination) => {
      let settle!: (accepted: boolean) => void;
      const admission = new Promise<boolean>((resolve) => {
        settle = resolve;
      });
      const { data, fixture, previewTransformRows, onApplyNodeDraft } = await mountModel(false, {
        workspaceCommands: { onOpenProjectCode: () => admission },
        layout: {
          contextualWorkbench: {
            id: 'project-code',
            title: 'Project files',
            closeLabel: 'Close',
            panel: <div>Existing authority-owned Code</div>,
            requestClose: async () => true,
          },
        },
      });
      await act(async () => data.onOpenNode?.(fixture.transform.id));
      const editor = harness.container.querySelector('[data-slot="canvas-model-editor"]');
      const code = navigation.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-code-main-tab"]'
      )!;
      await act(async () => fireEvent.mouseDown(code, { button: 0, ctrlKey: false }));
      const target = navigation.querySelector<HTMLButtonElement>(
        destination === 'Canvas'
          ? '[data-slot="canvas-workspace-tab"]'
          : '[data-slot="canvas-model-main-tab"]'
      )!;
      await act(async () => fireEvent.mouseDown(target, { button: 0, ctrlKey: false }));
      await act(async () => settle(true));
      expect(target.getAttribute('aria-selected')).toBe('true');
      expect(code.getAttribute('aria-selected')).toBe('false');
      expect(harness.container.querySelector('[data-slot="canvas-model-editor"]')).toBe(editor);
      expect(editor?.closest('[inert]') != null).toBe(destination === 'Canvas');
      expect(previewTransformRows).not.toHaveBeenCalled();
      expect(onApplyNodeDraft).not.toHaveBeenCalled();
    }
  );
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

  it('routes the Properties header icon to the single semantic-editor tab without writing', async () => {
    const fixture = buildSemanticWorkbenchFixture();
    const onApplyNodeDraft = vi.fn(() => ({ outcome: 'no_changes' }) as const);
    await harness.render({
      layout: { inspectorPanelVisible: true },
      panels: {
        inspectorNode: fixture.transform,
        inspectorPreferredTabId: 'general',
        inspectorGraphNodes: [...fixture.sources, fixture.transform],
        inspectorGraphEdges: fixture.edges,
        relationalTreeAuthoring: {
          canEditNode: true,
          onApplyNodeDraft,
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
      '[data-slot="canvas-node-workbench-header-actions"] [data-slot="canvas-open-semantic-editor"]'
    );
    expect(openEditor).not.toBeNull();
    const general = harness.container.querySelector(
      '[data-slot="canvas-node-workbench-general-content"]'
    );
    expect(general).not.toBeNull();
    expect(general?.querySelector('[data-slot="canvas-open-semantic-editor"]')).toBeNull();

    await act(async () => openEditor!.click());

    expect(harness.container.querySelector('[data-slot="canvas-model-editor"]')).not.toBeNull();
    expect(navigation.querySelector('[data-slot="canvas-model-main-tab"]')).not.toBeNull();
    expect(navigation.querySelectorAll('[data-slot="canvas-model-main-tab"]')).toHaveLength(1);
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
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
