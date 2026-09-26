// @vitest-environment jsdom
/** Owned concern: relational workbench apply behavior. */
import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
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
      const connect = async (): Promise<void> =>
        act(async () =>
          container
            .querySelector<HTMLButtonElement>('[data-slot="source-occurrence-connect"]')!
            .click()
        );
      const append = async (): Promise<void> => {
        const fields = container.querySelectorAll<HTMLSelectElement>(
          '[data-slot="canvas-relational-tree-existing-field"], [data-slot="canvas-relational-tree-connected-field"]'
        );
        for (const field of fields)
          await act(async () =>
            fireEvent.change(field, {
              target: { value: [...field.options].find((option) => option.value !== '')!.value },
            })
          );
        await act(async () =>
          container
            .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-append-input"]')!
            .click()
        );
      };
      await drop(0);
      await connect();
      openOperationMenu(container);
      expect(
        document.querySelector('[data-slot="dvt-select-operation-projection"]')
      ).not.toBeNull();
      expect(
        document
          .querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')
          ?.getAttribute('aria-disabled')
      ).toBe('true');

      await act(async () =>
        document
          .querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-projection"]')!
          .click()
      );
      expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(1);
      expect(container.querySelector('[data-operator="project"]')).not.toBeNull();
      expect(container.querySelector('[data-operator="join"]')).toBeNull();
      await drop(1);
      await connect();
      openOperationMenu(container);
      expect(document.querySelector('[role="listbox"]')).not.toBeNull();
      expect(document.querySelector('[data-slot="dvt-select-operation-projection"]')).toBeNull();
      const innerJoinOperation = document.querySelector<HTMLButtonElement>(
        '[data-slot="dvt-select-operation-inner-join"]'
      );
      await act(async () => innerJoinOperation!.click());
      await append();
      expect(container.querySelector('[data-operator="join"]')).not.toBeNull();

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
      expect(applied[0]?.dvt).toMatchObject({
        kind: 'transform',
        mode: 'substrait',
        shape: 'inner_join',
      });
    }
  );
});
