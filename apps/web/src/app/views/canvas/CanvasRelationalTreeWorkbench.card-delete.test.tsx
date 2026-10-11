// @vitest-environment jsdom
/** Owned concern: keyboard deletion requires consent before removing connected cards. */
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import {
  connectStagedWorkbenchUnaryOperation,
  instantiateWorkbenchSource,
  stageWorkbenchOperation,
} from './CanvasRelationalTreeWorkbench.gestures.test-support';
import {
  container,
  COPY,
  edge,
  root,
  setupWorkbenchTest,
  sourceNode,
  transformNode,
} from './CanvasRelationalTreeWorkbench.test-support';

describe('Canvas relational-tree card deletion', () => {
  setupWorkbenchTest();

  it('confirms keyboard deletion before removing the card and its connections', async () => {
    const source = sourceNode('customers', 'customers');
    const target = transformNode();
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={target}
          nodes={[source, target]}
          edges={[edge(source.id)]}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: vi.fn() }}
        />
      )
    );
    await instantiateWorkbenchSource(
      container.querySelector<HTMLElement>('[data-slot="canvas-relational-tree-source"]')!
    );
    await stageWorkbenchOperation('projection');
    await connectStagedWorkbenchUnaryOperation();
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      1
    );
    const sourceCard = container.querySelector<HTMLButtonElement>(
      '[data-pending="true"][data-operator="read"]'
    )!;
    await act(async () => {
      sourceCard.focus();
      sourceCard.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true })
      );
    });
    expect(container.querySelector('[data-pending="true"][data-operator="read"]')).toBe(sourceCard);
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      1
    );
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-card-removal-confirm"]')!
        .click()
    );
    expect(container.querySelector('[data-pending="true"][data-operator="read"]')).toBeNull();
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      0
    );
    expect(container.querySelector('[data-pending-operation="true"]')).not.toBeNull();
  });
});
