// @vitest-environment jsdom
/** Owned concern: relational workbench join-chain behavior. */
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import {
  setupWorkbenchTest,
  COPY,
  sourceNode,
  sourceRef,
  transformNode,
  edge,
  root,
  container,
  dragSourceTo,
} from './CanvasRelationalTreeWorkbench.test-support';
import {
  connectWorkbenchOutput,
  instantiateWorkbenchSource,
  stageWorkbenchOperation,
} from './CanvasRelationalTreeWorkbench.gestures.test-support';
import { createSourceJoin } from './canvasSourceJoin';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';

describe('Canvas relational-tree Workbench join-chain', () => {
  setupWorkbenchTest();
  it('chains staged JOIN producers without mutating the existing semantic JOIN', async () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
    const countries = sourceNode('countries', 'countries');
    const regions = sourceNode('regions', 'regions');
    const transform = applyDvtSubstraitSemanticDocument(
      transformNode(),
      encodeDvtSubstraitSemanticDocument(
        createSourceJoin({
          targetNodeId: 'transform',
          left: {
            source: {
              nodeId: customers.id,
              schema: 'public',
              table: 'customers',
              sourceRef: sourceRef('customers'),
            },
            fields: ['customers_id'],
          },
          right: {
            source: {
              nodeId: orders.id,
              schema: 'public',
              table: 'orders',
              sourceRef: sourceRef('orders'),
            },
            fields: ['orders_id'],
          },
          leftFieldName: 'customers_id',
          rightFieldName: 'orders_id',
        })
      )
    );
    const applied: CanvasInspectorNodeDraft[] = [];

    await act(async () => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[customers, orders, countries, regions, transform]}
          edges={[edge(customers.id), edge(orders.id), edge(countries.id), edge(regions.id)]}
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
    // Initial JOIN creation is covered by the apply test; this case owns chaining.
    expect(container.querySelectorAll('[data-operator="join"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(2);

    await instantiateWorkbenchSource(sourceButtons[2]!);
    const regionsButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
    ).find((button) => button.textContent?.includes('regions'))!;
    await instantiateWorkbenchSource(regionsButton);
    await stageWorkbenchOperation('inner-join');
    await stageWorkbenchOperation('inner-join');

    const operations = Array.from(
      container.querySelectorAll<HTMLElement>('[data-pending-operation="true"]')
    ).filter((card) => card.querySelector('[data-operator="join"]') != null);
    const producers = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-output-port"]')
    );
    const existingRoot = producers.find(
      (port) =>
        !operations.includes(port.parentElement as HTMLElement) &&
        port.parentElement?.querySelector('[data-operator="join"]') != null
    )!;
    const pendingSources = producers.filter(
      (port) =>
        port.parentElement?.querySelector('[data-pending="true"][data-operator="read"]') != null
    );
    const firstInputs = Array.from(
      operations[0]!.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-input-port"]')
    );
    await act(async () =>
      container
        .querySelector<SVGElement>('[data-slot="canvas-relational-output-edge-action"]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    );
    await act(async () => dragSourceTo(existingRoot, firstInputs[0]!));
    await act(async () => dragSourceTo(pendingSources[0]!, firstInputs[1]!));
    const secondInputs = Array.from(
      operations[1]!.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-input-port"]')
    );
    await act(async () =>
      dragSourceTo(
        operations[0]!.querySelector<HTMLElement>('[data-slot="canvas-relational-output-port"]')!,
        secondInputs[0]!
      )
    );
    await act(async () => dragSourceTo(pendingSources[1]!, secondInputs[1]!));
    await connectWorkbenchOutput(
      container,
      operations[1]!.querySelector<HTMLElement>('[data-slot="canvas-relational-output-port"]')!
    );

    expect(container.querySelectorAll('[data-operator="join"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      4
    );
    expect(container.querySelectorAll('[data-slot="canvas-relational-tree-output"]')).toHaveLength(
      1
    );
    expect(applied).toHaveLength(0);

    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.click()
    );
    expect(applied).toHaveLength(1);
    expect(applied[0]?.dvt).toMatchObject({ mode: 'substrait', shape: 'inner_join' });
    expect(applied[0]?.relationalAuthoringDraft).toMatchObject({
      sources: [{ sourceNodeId: countries.id }, { sourceNodeId: regions.id }],
      operations: [{ operation: 'inner_join' }, { operation: 'inner_join' }],
    });
  });
});
