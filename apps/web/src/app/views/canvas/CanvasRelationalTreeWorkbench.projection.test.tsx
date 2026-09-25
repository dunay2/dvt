// @vitest-environment jsdom
/** Owned concern: relational workbench projection behavior. */
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
} from './CanvasRelationalTreeWorkbench.test-support';
import { openOperationMenu } from './operation-menu/operationMenu.test-support';

describe('Canvas relational-tree Workbench projection', () => {
  setupWorkbenchTest();
  it('authors a one-Source projection from the same central block', async () => {
    const orders = sourceNode('orders', 'orders');
    const transform = transformNode();
    const applied: CanvasInspectorNodeDraft[] = [];

    await act(async () => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[orders, transform]}
          edges={[edge(orders.id)]}
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
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
        ?.click()
    );
    openOperationMenu(container);
    await act(async () =>
      document
        .querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-projection"]')
        ?.click()
    );
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.click()
    );

    expect(applied).toHaveLength(1);
    expect(applied[0]?.dvt).toMatchObject({
      kind: 'transform',
      mode: 'substrait',
      shape: 'projection',
    });
  });

  it('preserves the local operation, focus and rejection reason when the aggregate rejects Apply', async () => {
    const orders = sourceNode('orders', 'orders');
    const transform = transformNode();
    const workbench = React.createRef<React.ElementRef<typeof CanvasRelationalTreeWorkbench>>();

    await act(async () => {
      root.render(
        <CanvasRelationalTreeWorkbench
          ref={workbench}
          transformNode={transform}
          nodes={[orders, transform]}
          edges={[edge(orders.id)]}
          copy={COPY}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: () => ({ outcome: 'rejected', reason: 'node_unavailable' }),
          }}
        />
      );
    });
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')!
        .click()
    );
    openOperationMenu(container);
    await act(async () =>
      document
        .querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-projection"]')!
        .click()
    );
    const apply = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-relational-tree-apply"]'
    )!;
    apply.focus();

    act(() => apply.click());

    expect(document.activeElement).toBe(apply);
    expect(workbench.current?.hasUnappliedChanges).toBe(true);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('no longer available');
    expect(container.querySelector('[data-operator="project"]')).not.toBeNull();
  });
});
