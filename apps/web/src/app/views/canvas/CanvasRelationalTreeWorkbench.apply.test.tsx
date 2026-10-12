// @vitest-environment jsdom
/** Owned concern: relational workbench apply behavior. */
import React, { act, createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import {
  setupWorkbenchTest,
  COPY,
  sourceNode,
  transformNode,
  edge,
  root,
  container,
  dragSourceTo,
} from './CanvasRelationalTreeWorkbench.test-support';
import { openOperationMenu } from './operation-menu/operationMenu.test-support';
import { connectWorkbenchOutput } from './CanvasRelationalTreeWorkbench.gestures.test-support';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import type { CanvasRelationalTreeWorkbenchHandle } from './CanvasRelationalTreeWorkbench';

describe('Canvas relational-tree Workbench apply', () => {
  setupWorkbenchTest();
  it.each(['cancel', 'apply'] as const)(
    'authors centrally and persists only on %s',
    async (action) => {
      const customers = sourceNode('customers', 'customers');
      const orders = sourceNode('orders', 'orders');
      const transform = transformNode();
      const applied: CanvasInspectorNodeDraft[] = [];
      const workbench = createRef<CanvasRelationalTreeWorkbenchHandle>();

      await act(async () => {
        root.render(
          <CanvasRelationalTreeWorkbench
            ref={workbench}
            transformNode={transform}
            nodes={[customers, orders, transform]}
            edges={[edge(customers.id), edge(orders.id)]}
            copy={COPY}
            authoring={{
              canEditNode: true,
              onApplyNodeDraft: (_nodeId, draft) => {
                applied.push(draft);
                return { outcome: 'no_changes' };
              },
            }}
          />
        );
      });

      const sourceButtons = Array.from(
        container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
      );
      expect(sourceButtons.every((button) => !button.disabled)).toBe(true);
      expect(sourceButtons.every((button) => button.draggable)).toBe(true);
      expect(container.querySelector('[data-slot="canvas-relational-tree-authoring"]')).toBeNull();
      expect(
        container.querySelector('[data-slot="canvas-relational-tree-block-canvas"]')
      ).not.toBeNull();
      expect(
        container.querySelector('[data-slot="canvas-relational-tree-operation-shelf"]')
      ).not.toBeNull();
      expect(
        container.querySelector('[data-slot="canvas-relational-tree-operation-panel"]')
      ).toBeNull();

      expect(container.querySelector('[data-slot="canvas-relational-tree-input-slot"]')).toBeNull();
      const drop = async (ordinal: number): Promise<void> =>
        act(async () =>
          dragSourceTo(
            sourceButtons[ordinal]!,
            container.querySelector<HTMLElement>(
              '[data-slot="canvas-relational-tree-draft-viewport"]'
            )!
          )
        );
      await drop(0);
      await drop(1);
      openOperationMenu(container);
      await act(async () =>
        document
          .querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')!
          .click()
      );
      const join = Array.from(
        container.querySelectorAll<HTMLElement>('[data-pending-operation="true"]')
      ).find((card) => card.querySelector('[data-operator="join"]') != null)!;
      const joinCard = join.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-relational-tree-node"]'
      )!;
      await act(async () => joinCard.click());
      expect(
        container.querySelector('[data-slot="canvas-staged-operation-inspector"]')
      ).not.toBeNull();
      const pendingSource = container.querySelector<HTMLButtonElement>(
        '[data-pending="true"][data-operator="read"]'
      )!;
      await act(async () => pendingSource.click());
      expect(container.querySelector('[data-slot="source-occurrence-alias"]')).not.toBeNull();
      expect(container.querySelector('[data-slot="canvas-staged-operation-inspector"]')).toBeNull();
      await act(async () => joinCard.click());
      expect(
        container.querySelector('[data-slot="canvas-staged-operation-inspector"]')
      ).not.toBeNull();
      const producers = Array.from(
        container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-output-port"]')
      ).filter(
        (port) =>
          port.parentElement?.querySelector('[data-pending="true"][data-operator="read"]') != null
      );
      const inputs = Array.from(
        join.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-input-port"]')
      );
      await act(async () => dragSourceTo(producers[1]!, inputs[1]!));
      await act(async () => dragSourceTo(producers[0]!, inputs[0]!));
      await act(async () => Promise.resolve());
      expect(
        container.querySelector('[data-slot="canvas-relational-tree-join-type"]')
      ).not.toBeNull();
      expect(
        container.querySelector('[data-slot="dvt-substrait-join-predicate-editors"]')
      ).not.toBeNull();
      expect(
        container.querySelector('[data-slot="semantic-workbench-join-condition-row"]')
      ).not.toBeNull();
      await connectWorkbenchOutput(
        container,
        join.querySelector<HTMLElement>('[data-slot="canvas-relational-output-port"]')!
      );

      const cards = Array.from(
        container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-tree-node"]')
      );
      expect(cards).toHaveLength(3);
      expect(
        cards.every(
          (card) => card.closest('li')?.querySelector('[data-slot="canvas-node-execute"]') != null
        )
      ).toBe(true);

      const actionButton = container.querySelector<HTMLButtonElement>(
        `[data-slot="canvas-relational-tree-${action}"]`
      )!;
      if (action === 'apply') {
        expect(workbench.current).toMatchObject({ hasUnappliedChanges: true, canApply: true });
        expect(actionButton.disabled).toBe(false);
      }
      await act(async () => actionButton.click());
      if (action === 'cancel') {
        expect(applied).toHaveLength(0);
        expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(0);
        expect(
          container.querySelector('[data-slot="canvas-relational-tree-output"]')
        ).not.toBeNull();
        return;
      }

      expect(applied).toHaveLength(1);
      const saved = applied[0]?.relationalAuthoringDraft;
      expect(saved).toEqual({
        version: 'v1',
        sources: [],
        operations: [],
        positions: expect.any(Object),
      });
      expect(Object.keys(saved!.positions).length).toBeGreaterThan(0);
      const persisted = applyCanvasInspectorNodeDraft(transform, applied[0]!);
      await act(async () => {
        root.render(
          <CanvasRelationalTreeWorkbench
            ref={workbench}
            transformNode={persisted}
            nodes={[customers, orders, persisted]}
            edges={[edge(customers.id), edge(orders.id)]}
            copy={COPY}
            authoring={{
              canEditNode: true,
              onApplyNodeDraft: () => ({ outcome: 'no_changes' }),
            }}
          />
        );
        await Promise.resolve();
      });
      expect(workbench.current).toMatchObject({ hasUnappliedChanges: false, canApply: false });
      expect(
        container.querySelector('[data-slot="canvas-relational-tree-inspection"]')
      ).not.toBeNull();
      expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(0);
      expect(container.querySelectorAll('[data-operator="join"]')).toHaveLength(1);
      expect(
        Array.from(
          container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-tree-source"]')
        ).every((source) => source.title.includes('Participating'))
      ).toBe(true);
    }
  );
});
