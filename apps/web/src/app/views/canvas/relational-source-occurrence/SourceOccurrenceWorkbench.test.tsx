// @vitest-environment jsdom
/** Owned concern: exercise explicit occurrence append through the real Workbench transaction. */
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CanvasRelationalTreeWorkbench } from '../CanvasRelationalTreeWorkbench';
import {
  COPY,
  container,
  root,
  setupWorkbenchTest,
} from '../CanvasRelationalTreeWorkbench.test-support';
import { occurrenceGraph } from './occurrence.test.fixtures';

describe('explicit source occurrence controls', () => {
  setupWorkbenchTest();
  it('adds a third independent Read with one physical catalogue row and cancels without writing', () => {
    const graph = occurrenceGraph();
    const onApplyNodeDraft = vi.fn(() => ({ outcome: 'no_changes' as const }));
    act(() =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={graph.targetNode}
          nodes={graph.nodes}
          edges={graph.edges}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft }}
        />
      )
    );
    const add = container.querySelector<HTMLButtonElement>('[data-slot="source-occurrence-add"]');
    expect(add).not.toBeNull();
    expect(add!.disabled).toBe(false);
    act(() => add!.click());
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-append-join-input"]')
    ).not.toBeNull();
    const labels = Array.from(
      container.querySelectorAll('[data-slot="canvas-relational-tree-existing-field"] option'),
      (option) => option.textContent
    );
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels.some((label) => label?.startsWith('places · 1.'))).toBe(true);
    expect(labels.some((label) => label?.startsWith('places · 2.'))).toBe(true);
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.disabled
    ).toBe(true);
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-append-input"]')!
        .click()
    );
    const reads = Array.from(container.querySelectorAll('[data-operator="read"]'));
    expect(reads).toHaveLength(3);
    expect(new Set(reads.map((read) => read.getAttribute('data-relation-id'))).size).toBe(3);
    expect(container.querySelectorAll('[data-slot="canvas-relational-tree-source"]')).toHaveLength(
      1
    );
    expect(graph.edges).toHaveLength(1);
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-cancel"]')!
        .click()
    );
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(2);
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
  });

  it('offers no mutation action in a read-only workbench', () => {
    const graph = occurrenceGraph();
    const onApplyNodeDraft = vi.fn();
    act(() =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={graph.targetNode}
          nodes={graph.nodes}
          edges={graph.edges}
          copy={COPY}
          authoring={{ canEditNode: false, onApplyNodeDraft }}
        />
      )
    );
    expect(container.querySelector('[data-slot="source-occurrence-add"]')).toBeNull();
    act(() => container.querySelector<HTMLButtonElement>('[data-operator="read"]')!.click());
    expect(container.querySelector('[data-slot="source-occurrence-alias"]')).toBeNull();
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
  });
});
