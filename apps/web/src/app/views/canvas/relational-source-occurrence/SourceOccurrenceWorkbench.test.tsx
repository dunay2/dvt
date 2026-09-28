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
  dragSourceTo,
} from '../CanvasRelationalTreeWorkbench.test-support';
import { occurrenceGraph } from './occurrence.test.fixtures';
import { openOperationMenu } from '../operation-menu/operationMenu.test-support';

describe('explicit source occurrence controls', () => {
  setupWorkbenchTest();
  it('adds a third independent Read, connects it explicitly and cancels without writing', async () => {
    const graph = occurrenceGraph();
    const onApplyNodeDraft = vi.fn(() => ({ outcome: 'no_changes' as const }));
    await act(async () =>
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
    await act(async () => add!.click());
    const pendingId = container
      .querySelector('[data-pending="true"]')!
      .getAttribute('data-relation-id');
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-append-join-input"]')
    ).toBeNull();
    const inspector = container.querySelector('[data-canvas-inspector="true"]:not([hidden])');
    expect(inspector?.getAttribute('data-relation-id')).toBe(pendingId);
    const alias = inspector?.querySelector<HTMLInputElement>(
      '[data-slot="source-occurrence-alias"]'
    );
    expect(alias?.value).toBe(
      container.querySelector('[data-pending="true"] [data-slot="canvas-relational-node-title"]')
        ?.textContent
    );
    expect(inspector?.querySelectorAll('[data-field-id]').length).toBeGreaterThan(0);
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
    openOperationMenu(container);
    await act(async () =>
      document.querySelector<HTMLElement>('[data-slot="dvt-select-operation-aggregate"]')!.click()
    );
    const operation = container.querySelector<HTMLElement>('[data-pending-operation="true"]')!;
    const producer = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-output-port"]')
    ).find(
      (port) =>
        port.parentElement?.querySelector(
          `[data-pending="true"][data-relation-id="${pendingId}"]`
        ) != null
    )!;
    await act(async () =>
      dragSourceTo(
        producer,
        operation.querySelector<HTMLElement>('[data-slot="canvas-relational-input-port"]')!
      )
    );
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      1
    );
    expect(container.querySelector('[data-pending="true"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-slot="canvas-relational-tree-source"]')).toHaveLength(
      1
    );
    expect(graph.edges).toHaveLength(1);
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.disabled
    ).toBe(false);
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-cancel"]')!
        .click()
    );
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(2);
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
  });

  it('selects and renames pending siblings without composing them or losing the draft', async () => {
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
    const click = async (selector: string): Promise<void> => {
      await act(async () => container.querySelector<HTMLButtonElement>(selector)!.click());
    };
    await click('[data-slot="source-occurrence-add"]');
    await click('[data-slot="source-occurrence-add"]');
    const pending = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-pending="true"]')
    );
    const ids = pending.map((node) => node.getAttribute('data-relation-id'));
    await act(async () => pending[0]!.click());
    expect(container.querySelectorAll('[role="treeitem"][aria-selected="true"]')).toHaveLength(1);
    const selectedFields = Array.from(
      container.querySelectorAll('[data-slot="source-occurrence-outputs"] [data-field-id]'),
      (node) => node.getAttribute('data-field-id')
    );
    for (const [alias, valid] of [
      [graph.draft.sidecar.relations.find((entry) => entry.sourceRef != null)!.displayName!, false],
      [
        pending[1]!.querySelector('[data-slot="canvas-relational-node-title"]')!.textContent!,
        false,
      ],
      ['Independent places', true],
    ] as const) {
      const input = container.querySelector<HTMLInputElement>(
        '[data-slot="source-occurrence-alias"]'
      )!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
          input,
          alias
        );
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(
        container.querySelector<HTMLButtonElement>('[data-slot="source-occurrence-update"]')!
          .disabled
      ).toBe(!valid);
    }
    await click('[data-slot="source-occurrence-update"]');
    expect(
      container.querySelector(`[data-operator="read"][data-relation-id="${ids[0]}"]`)!.textContent
    ).toContain('Independent places');
    await act(async () => pending[1]!.click());
    expect(
      container
        .querySelector('[data-canvas-inspector="true"]:not([hidden])')
        ?.getAttribute('data-relation-id')
    ).toBe(ids[1]);
    await click('[data-operator="join"]');
    expect(container.querySelector('[data-slot="source-occurrence-alias"]')).toBeNull();
    await click(`[data-operator="read"][data-relation-id="${ids[0]}"]`);
    expect(
      container.querySelector<HTMLInputElement>('[data-slot="source-occurrence-alias"]')!.value
    ).toBe('Independent places');
    expect(
      Array.from(
        container.querySelectorAll('[data-slot="source-occurrence-outputs"] [data-field-id]'),
        (node) => node.getAttribute('data-field-id')
      )
    ).toEqual(selectedFields);
    expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(2);
    expect(container.querySelector('[data-slot="canvas-relational-tree-append-input"]')).toBeNull();
    expect(apply).not.toHaveBeenCalled();
  });
});
