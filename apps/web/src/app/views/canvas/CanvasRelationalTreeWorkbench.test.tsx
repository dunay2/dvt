// @vitest-environment jsdom
/** Owned concern: relational workbench inspection shell behavior. */
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { buildSemanticWorkbenchFixture } from '../../labs/semanticWorkbenchFixture';
import * as analysis from './canvasRelationalAnalysis';
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
        '[data-slot="canvas-relational-tree-sources-toggle"]',
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
