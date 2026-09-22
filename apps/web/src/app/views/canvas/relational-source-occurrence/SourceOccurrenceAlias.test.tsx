// @vitest-environment jsdom
/** Owned concern: alias authoring targets a Read occurrence and survives Apply/reopen. */
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CanvasRelationalTreeWorkbench } from '../CanvasRelationalTreeWorkbench';
import { applyCanvasInspectorNodeDraft } from '../canvasInspectorAuthoringModel';
import { canvasDraftSession } from '../canvasDraftSession';
import type { CanvasInspectorNodeDraft } from '../canvasInspectorAuthoring.types';
import {
  COPY,
  container,
  root,
  setupWorkbenchTest,
} from '../CanvasRelationalTreeWorkbench.test-support';
import { occurrenceGraph } from './occurrence.test.fixtures';

function changeAlias(value: string): void {
  const input = container.querySelector<HTMLInputElement>('[data-slot="source-occurrence-alias"]')!;
  expect(input).not.toBeNull();
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function click(slot: string): void {
  act(() => container.querySelector<HTMLButtonElement>(`[data-slot="${slot}"]`)!.click());
}

describe('Read properties alias', () => {
  setupWorkbenchTest();
  it('opens on one click, updates only that occurrence, and preserves the alias after Apply/reopen', () => {
    const graph = occurrenceGraph();
    let target = graph.targetNode;
    const session = canvasDraftSession.machine.bootstrap({
      remoteDraft: null,
      canonicalNodeIds: graph.nodes.map((node) => node.id),
      canonicalEdges: graph.edges,
    });
    const apply = vi.fn((_id: string, draft: CanvasInspectorNodeDraft) => {
      target = applyCanvasInspectorNodeDraft(target, draft);
      return {
        outcome: 'applied' as const,
        draftSession: canvasDraftSession.workingSet.upsertNode(session, target),
      };
    });
    const render = (): void =>
      act(() =>
        root.render(
          <CanvasRelationalTreeWorkbench
            transformNode={target}
            nodes={[graph.source, target]}
            edges={graph.edges}
            copy={COPY}
            authoring={{ canEditNode: true, onApplyNodeDraft: apply }}
          />
        )
      );
    render();
    const reads = container.querySelectorAll<HTMLButtonElement>('[data-operator="read"]');
    const readId = reads[1]!.getAttribute('data-relation-id');
    act(() => reads[1]!.click());
    changeAlias('Parents');
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.disabled
    ).toBe(true);
    click('source-occurrence-update');
    expect(
      container.querySelector(`[data-relation-id="${readId}"][data-operator="read"]`)?.textContent
    ).toContain('Parents');
    expect(container.querySelectorAll('[data-operator="read"]')[0]?.textContent).not.toContain(
      'Parents'
    );
    expect(apply).not.toHaveBeenCalled();
    click('canvas-relational-tree-apply');
    expect(apply).toHaveBeenCalledTimes(1);
    render();
    act(() =>
      container
        .querySelector<HTMLButtonElement>(`[data-relation-id="${readId}"][data-operator="read"]`)!
        .click()
    );
    expect(
      container.querySelector<HTMLInputElement>('[data-slot="source-occurrence-alias"]')?.value
    ).toBe('Parents');
    expect(container.querySelectorAll('[data-slot="canvas-relational-tree-source"]')).toHaveLength(
      1
    );
  });

  it('blocks invalid alias submission and cancels back to the unchanged document', () => {
    const graph = occurrenceGraph();
    const apply = vi.fn();
    act(() =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={graph.targetNode}
          nodes={graph.nodes}
          edges={graph.edges}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: apply }}
        />
      )
    );
    act(() => container.querySelector<HTMLButtonElement>('[data-operator="read"]')!.click());
    changeAlias('');
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="source-occurrence-update"]')?.disabled
    ).toBe(true);
    click('canvas-relational-tree-cancel');
    expect(apply).not.toHaveBeenCalled();
    act(() => container.querySelector<HTMLButtonElement>('[data-operator="read"]')!.click());
    expect(
      container.querySelector<HTMLInputElement>('[data-slot="source-occurrence-alias"]')?.value
    ).toBe('places');
  });
});
