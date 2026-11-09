// @vitest-environment jsdom
/** Owned concern: relational workbench inspection shell behavior. */
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { buildSemanticWorkbenchFixture } from '../../labs/semanticWorkbenchFixture';
import * as analysis from './canvasRelationalAnalysis';
import {
  createModelOutputDependencyFixture,
  selectModelDependencyOutputs,
} from './canvasModelOutputDependency.test-support';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';
import {
  setupWorkbenchTest,
  COPY,
  sourceNode,
  transformNode,
  edge,
  root,
  container,
} from './CanvasRelationalTreeWorkbench.test-support';

describe('Canvas relational-tree Workbench ', () => {
  setupWorkbenchTest();
  it.each(['applied', 'draft'] as const)(
    'opens the same searchable Add menu on the %s background and only stages after selection',
    async (view) => {
      // A background gesture must not apply a Model or require an existing canonical tree.
      const fixture = buildSemanticWorkbenchFixture();
      const pendingModel = transformNode();
      const sources = [sourceNode('clients', 'clients'), sourceNode('orders', 'orders')];
      const transform = view === 'applied' ? fixture.transform : pendingModel;
      const nodes = view === 'applied' ? [...fixture.sources, transform] : [...sources, transform];
      const edges = view === 'applied' ? fixture.edges : sources.map((source) => edge(source.id));
      const apply = vi.fn(() => ({ outcome: 'no_changes' }) as const);
      act(() =>
        root.render(
          <CanvasRelationalTreeWorkbench
            transformNode={transform}
            nodes={nodes}
            edges={edges}
            copy={COPY}
            authoring={{ canEditNode: true, onApplyNodeDraft: apply }}
          />
        )
      );
      const viewport = container.querySelector<HTMLElement>(
        `[data-slot="canvas-relational-tree-${view === 'draft' ? 'draft-' : ''}viewport"]`
      )!;
      expect(viewport).not.toBeNull();
      expect(viewport.getAttribute('tabindex')).toBe('0');
      await act(async () =>
        viewport.dispatchEvent(
          new MouseEvent('dblclick', {
            bubbles: true,
            cancelable: true,
            detail: 2,
            clientX: 340,
            clientY: 220,
          })
        )
      );
      expect(document.querySelector('[cmdk-input]')).not.toBeNull();
      expect(apply).not.toHaveBeenCalled();
      expect(container.querySelectorAll('[data-operator="aggregate"]')).toHaveLength(0);
      await act(async () =>
        document.querySelector<HTMLElement>('[data-operation="aggregate"]')!.click()
      );
      expect(document.querySelector('[cmdk-input]')).toBeNull();
      expect(container.querySelectorAll('[data-operator="aggregate"]')).toHaveLength(1);
      expect(apply).not.toHaveBeenCalled();
    }
  );
  it('keeps read-only Model background gestures away from the operation menu', () => {
    const fixture = buildSemanticWorkbenchFixture();
    act(() =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={fixture.transform}
          nodes={[...fixture.sources, fixture.transform]}
          edges={fixture.edges}
          copy={COPY}
        />
      )
    );
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-tree-viewport"]'
    )!;
    act(() => viewport.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 })));
    expect(document.querySelector('[cmdk-input]')).toBeNull();
  });
  it('shows the retained tree and precise recovery guidance without enabling semantic editing', async () => {
    const graph = await createModelOutputDependencyFixture();
    const producer = await selectModelDependencyOutputs(graph.producer, ['customer']);
    const onApplyNodeDraft = vi.fn(() => ({ outcome: 'no_changes' }) as const);
    act(() =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={graph.consumer}
          nodes={graph.nodes.map((node) => (node.id === producer.id ? producer : node))}
          edges={graph.edges}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft }}
        />
      )
    );
    expect(
      container.querySelector('[data-slot="canvas-producer-input-recovery"]')?.textContent
    ).toBe(COPY.relationalTreeProducerFieldsUnavailableMessage);
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-node"][data-operator="join"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-relational-tree-unavailable"]')).toBeNull();
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
  });
  it('reuses semantic analysis during selection, disclosure, focus and viewport controls', () => {
    const fixture = buildSemanticWorkbenchFixture();
    const analyze = vi.spyOn(analysis, 'analyzeCanvasRelations');
    const onApplyNodeDraft = vi.fn(() => ({ outcome: 'no_changes' }) as const);
    try {
      act(() =>
        root.render(
          <CanvasRelationalTreeWorkbench
            transformNode={fixture.transform}
            nodes={[...fixture.sources, fixture.transform]}
            edges={fixture.edges}
            copy={COPY}
            authoring={{ canEditNode: true, onApplyNodeDraft }}
          />
        )
      );
      const baseline = analyze.mock.calls.length;
      expect(baseline).toBeGreaterThan(0);
      for (const selector of [
        '[data-slot="canvas-relational-tree-node"][data-operator="read"]',
        '[data-slot="canvas-relational-node-expand"]',
        '[data-slot="canvas-explorer-elements-toggle"]',
        'button[aria-label="Zoom in"]',
        '[data-slot="canvas-relational-tree-fit"]',
      ]) {
        const button = container.querySelector<HTMLButtonElement>(selector);
        expect(button, selector).not.toBeNull();
        act(() => {
          button!.focus();
          button!.click();
        });
        expect(analyze.mock.calls.length, selector).toBe(baseline);
      }
      expect(onApplyNodeDraft).not.toHaveBeenCalled();
    } finally {
      analyze.mockRestore();
    }
  });
  it('keeps the same properties controls mounted while activating inspection tabs by keyboard', () => {
    act(() =>
      root.render(
        <CanvasRelationalTreeEditorFrame operation="inner_join" onClose={() => undefined}>
          <input aria-label="Pending property" defaultValue="draft" />
        </CanvasRelationalTreeEditorFrame>
      )
    );
    const input = container.querySelector('input')!;
    input.value = 'pending edit';
    const activate = (slot: string): void => {
      act(() => {
        container
          .querySelector(`[data-slot="${slot}"]`)!
          .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      });
    };
    activate('canvas-operation-tree-tab');
    expect(input.closest('[role="tabpanel"]')?.getAttribute('data-state')).toBe('inactive');
    activate('canvas-operation-properties-tab');
    expect(input.closest('[role="tabpanel"]')?.getAttribute('data-state')).toBe('active');
    expect(container.querySelector('input')).toBe(input);
    expect(input.value).toBe('pending edit');
  });

  it('shows pending Sources without fabricating a tree', () => {
    const clients = sourceNode('clients', 'clients');
    const orders = sourceNode('orders', 'orders');
    const transform = transformNode();

    act(() => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[clients, orders, transform]}
          edges={[edge(clients.id), edge(orders.id)]}
          copy={COPY}
        />
      );
    });

    expect(container.querySelectorAll('[data-slot="canvas-relational-tree-source"]')).toHaveLength(
      2
    );
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-unavailable"]')?.textContent
    ).toContain('No canonical relational tree is available.');
    expect(container.textContent).toContain('Pending');
  });
});
