// @vitest-environment jsdom
/** Selecting data is not an instruction to mutate it. */
import React, { act, createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  CanvasRelationalTreeWorkbench,
  type CanvasRelationalTreeWorkbenchHandle,
} from './CanvasRelationalTreeWorkbench';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';
import {
  setupWorkbenchTest,
  COPY,
  root,
  container,
} from './CanvasRelationalTreeWorkbench.test-support';

describe('explicit relational editing', () => {
  setupWorkbenchTest();

  it.each(['read', 'join'])(
    'inspects an editable %s before entering a cancellable edit session',
    async (operator) => {
      const graph = occurrenceGraph();
      const applied = vi.fn(() => ({ outcome: 'no_changes' as const }));
      const handle = createRef<CanvasRelationalTreeWorkbenchHandle>();
      await act(async () =>
        root.render(
          <CanvasRelationalTreeWorkbench
            ref={handle}
            transformNode={graph.targetNode}
            nodes={graph.nodes}
            edges={graph.edges}
            copy={COPY}
            authoring={{ canEditNode: true, onApplyNodeDraft: applied }}
          />
        )
      );
      await act(async () =>
        container
          .querySelector<HTMLButtonElement>(
            `[data-slot="canvas-relational-tree-node"][data-operator="${operator}"]`
          )!
          .click()
      );
      const inspector = container.querySelector(
        '[data-slot="canvas-relational-tree-inline-editor"]'
      );
      expect(inspector).not.toBeNull();
      expect(inspector!.querySelector('input, select, textarea')).toBeNull();
      expect(handle.current!.hasUnappliedChanges).toBe(false);
      expect(applied).not.toHaveBeenCalled();
      const edit = inspector!.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-relational-edit"]'
      );
      expect(edit).not.toBeNull();
      await act(async () => edit!.click());
      const authoringCanvas = container.querySelector(
        '[data-slot="canvas-relational-tree-block-canvas"]'
      );
      expect(authoringCanvas).not.toBeNull();
      expect(authoringCanvas?.classList).toContain('h-full');
      expect(handle.current!.hasUnappliedChanges).toBe(false);
      const cancel = container.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-relational-tree-cancel"]'
      );
      expect(cancel).not.toBeNull();
      await act(async () => cancel!.click());
      expect(
        container.querySelector('[data-slot="canvas-relational-tree-block-canvas"]')
      ).toBeNull();
      expect(container.querySelector('[data-slot="canvas-relational-edit"]')).not.toBeNull();
      expect(applied).not.toHaveBeenCalled();
    }
  );

  it('does not offer edit without model edit permission', async () => {
    const graph = occurrenceGraph();
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={graph.targetNode}
          nodes={graph.nodes}
          edges={graph.edges}
          copy={COPY}
        />
      )
    );
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '[data-slot="canvas-relational-tree-node"][data-operator="join"]'
        )!
        .click()
    );
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-inline-editor"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-relational-edit"]')).toBeNull();
  });

  it.each(['operator', 'predicate'])(
    'protects %s changes when selecting another card',
    async (change) => {
      const graph = occurrenceGraph();
      const applied = vi.fn(() => ({ outcome: 'no_changes' as const }));
      const handle = createRef<CanvasRelationalTreeWorkbenchHandle>();
      await act(async () =>
        root.render(
          <CanvasRelationalTreeWorkbench
            ref={handle}
            transformNode={graph.targetNode}
            nodes={graph.nodes}
            edges={graph.edges}
            copy={COPY}
            authoring={{ canEditNode: true, onApplyNodeDraft: applied }}
          />
        )
      );
      await act(async () =>
        container.querySelector<HTMLButtonElement>('[data-operator="join"]')!.click()
      );
      await act(async () =>
        container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-edit"]')!.click()
      );
      if (change === 'predicate')
        await act(async () =>
          container.querySelector<HTMLButtonElement>('[aria-label="Editar condición"]')!.click()
        );
      const type = container.querySelector<HTMLSelectElement>(
        change === 'operator'
          ? '[data-slot="canvas-relational-tree-join-type"]'
          : '[aria-label="Comparador de la condición"]'
      )!;
      await act(async () => {
        type.value = change === 'operator' ? '1' : 'not_equal';
        type.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(handle.current!.hasUnappliedChanges).toBe(true);
      await act(async () =>
        container.querySelector<HTMLButtonElement>('[data-operator="read"]')!.click()
      );
      const dialog = document.querySelector('[role="alertdialog"]');
      expect(dialog).not.toBeNull();
      expect(handle.current!.hasUnappliedChanges).toBe(true);
      await act(async () =>
        dialog!.querySelector<HTMLButtonElement>('[data-slot="canvas-draft-discard"]')!.click()
      );
      expect(handle.current!.hasUnappliedChanges).toBe(false);
      expect(
        container.querySelector('[data-slot="canvas-relational-tree-inline-editor"] input')
      ).toBeNull();
      expect(container.querySelector('[data-slot="canvas-relation-fields"]')).not.toBeNull();
      expect(applied).not.toHaveBeenCalled();
    }
  );
});
