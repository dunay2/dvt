// @vitest-environment jsdom
/** Owned concern: relational workbench apply behavior. */
import React, { act } from 'react';
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

describe('Canvas relational-tree Workbench apply', () => {
  setupWorkbenchTest();
  it.each(['cancel', 'apply'] as const)(
    'authors centrally and persists only on %s',
    async (action) => {
      const customers = sourceNode('customers', 'customers');
      const orders = sourceNode('orders', 'orders');
      const transform = transformNode();
      const applied: CanvasInspectorNodeDraft[] = [];

      await act(async () => {
        root.render(
          <CanvasRelationalTreeWorkbench
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
      await connectWorkbenchOutput(
        container,
        join.querySelector<HTMLElement>('[data-slot="canvas-relational-output-port"]')!
      );

      await act(async () =>
        container
          .querySelector<HTMLButtonElement>(`[data-slot="canvas-relational-tree-${action}"]`)!
          .click()
      );
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
      expect(saved).toMatchObject({
        sources: [{ sourceNodeId: customers.id }, { sourceNodeId: orders.id }],
        operations: [{ operation: 'inner_join' }],
      });
      expect(saved?.outputRelationId).toBe(saved?.operations[0]?.relationId);
    }
  );
});
