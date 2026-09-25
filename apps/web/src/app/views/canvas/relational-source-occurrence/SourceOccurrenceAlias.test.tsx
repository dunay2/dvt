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

async function changeAlias(value: string): Promise<void> {
  const input = container.querySelector<HTMLInputElement>('[data-slot="source-occurrence-alias"]')!;
  expect(input).not.toBeNull();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function click(slot: string): Promise<void> {
  await act(async () =>
    container.querySelector<HTMLButtonElement>(`[data-slot="${slot}"]`)!.click()
  );
}

describe('Read properties alias', () => {
  setupWorkbenchTest();
  it('opens on one click, updates only that occurrence, and preserves the alias after Apply/reopen', async () => {
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
    const render = async (): Promise<void> =>
      await act(async () =>
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
    await render();
    const reads = container.querySelectorAll<HTMLButtonElement>('[data-operator="read"]');
    const readId = reads[1]!.getAttribute('data-relation-id');
    await act(async () => reads[1]!.click());
    await click('canvas-relational-edit');
    await changeAlias('Parents');
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.disabled
    ).toBe(true);
    await click('source-occurrence-update');
    expect(
      container.querySelector(`[data-relation-id="${readId}"][data-operator="read"]`)?.textContent
    ).toContain('Parents');
    expect(container.querySelectorAll('[data-operator="read"]')[0]?.textContent).not.toContain(
      'Parents'
    );
    expect(apply).not.toHaveBeenCalled();
    await click('canvas-relational-tree-apply');
    expect(apply).toHaveBeenCalledTimes(1);
    await render();
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(`[data-relation-id="${readId}"][data-operator="read"]`)!
        .click()
    );
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-inline-editor"]')?.textContent
    ).toContain('Parents');
    expect(container.querySelector('[data-slot="source-occurrence-alias"]')).toBeNull();
    await click('canvas-relational-edit');
    expect(
      container.querySelector<HTMLInputElement>('[data-slot="source-occurrence-alias"]')?.value
    ).toBe('Parents');
    expect(container.querySelectorAll('[data-slot="canvas-relational-tree-source"]')).toHaveLength(
      1
    );
  });

  it('blocks invalid alias submission and cancels back to the unchanged document', async () => {
    const graph = occurrenceGraph();
    const apply = vi.fn();
    await act(async () =>
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
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-operator="read"]')!.click()
    );
    await click('canvas-relational-edit');
    await changeAlias('');
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="source-occurrence-update"]')?.disabled
    ).toBe(true);
    await click('canvas-relational-tree-cancel');
    expect(apply).not.toHaveBeenCalled();
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-operator="read"]')!.click()
    );
    expect(container.querySelector('[data-slot="source-occurrence-alias"]')).toBeNull();
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-inline-editor"]')?.textContent
    ).toContain('places');
  });
});
