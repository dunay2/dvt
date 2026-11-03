// @vitest-environment jsdom
/** Owned concern: relational workbench join-chain behavior. */
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import {
  setupWorkbenchTest,
  sourceNode,
  sourceRef,
  transformNode,
  edge,
  container,
  dragSourceTo,
} from './CanvasRelationalTreeWorkbench.test-support';
import { connectWorkbenchOutput } from './CanvasRelationalTreeWorkbench.gestures.test-support';
import { createSourceJoin } from './canvasSourceJoin';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import { createPendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { createCanvasStagedOperation } from './canvasStagedOperation';
import { createCanvasRelationalAuthoringDraft } from './canvasRelationalAuthoringDraft';
import {
  canonicalOutputPort,
  pendingSourceOutputPorts,
  renderOperationWorkbench,
} from './CanvasRelationalTreeWorkbench.operation-drag.test-support';

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
    const sources = [customers, orders, countries, regions];
    const pendingSources = resolveCanvasDvtCompositionInputs({
      nodes: [...sources, transform],
      edges: sources.map((source) => edge(source.id)),
      targetNodeId: transform.id,
    })
      .filter((input) => input.nodeId === countries.id || input.nodeId === regions.id)
      .map(createPendingSourceOccurrence);
    const pendingJoins = [
      createCanvasStagedOperation('inner_join'),
      createCanvasStagedOperation('inner_join'),
    ];
    const placedIds = [
      ...pendingSources.map((source) => source.read.binding.relationId),
      ...pendingJoins.map((operation) => operation.id),
    ];
    transform.metadata = {
      ...transform.metadata,
      relationalAuthoringDraft: createCanvasRelationalAuthoringDraft({
        sources: pendingSources,
        operations: pendingJoins,
        outputRelationId: null,
        positions: new Map(placedIds.map((id, index) => [id, { x: 200 * index, y: 100 }])),
      }),
    };
    const before = JSON.stringify(transform);
    const applied: CanvasInspectorNodeDraft[] = [];

    await renderOperationWorkbench(transform, sources, (_nodeId, draft) => {
      applied.push(draft);
      return { outcome: 'no_changes' };
    });

    // Source creation, staging and disconnection have their own gesture tests.
    // This case owns connecting two pending JOINs to an unchanged applied JOIN.
    const operations = Array.from(
      container.querySelectorAll<HTMLElement>('[data-pending-operation="true"]')
    ).filter((card) => card.querySelector('[data-operator="join"]') != null);
    const existingRoot = canonicalOutputPort();
    const pendingSourcePorts = pendingSourceOutputPorts();
    const firstInputs = Array.from(
      operations[0]!.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-input-port"]')
    );
    expect(operations).toHaveLength(2);
    expect(pendingSourcePorts).toHaveLength(2);
    expect(
      container.querySelector('[data-slot="canvas-relational-output-edge-action"]')
    ).toBeNull();
    await act(async () => dragSourceTo(existingRoot, firstInputs[0]!));
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      1
    );
    await act(async () => dragSourceTo(pendingSourcePorts[0]!, firstInputs[1]!));
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      2
    );
    const secondInputs = Array.from(
      operations[1]!.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-input-port"]')
    );
    await act(async () =>
      dragSourceTo(
        operations[0]!.querySelector<HTMLElement>('[data-slot="canvas-relational-output-port"]')!,
        secondInputs[0]!
      )
    );
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      3
    );
    await act(async () => dragSourceTo(pendingSourcePorts[1]!, secondInputs[1]!));
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
    expect(JSON.stringify(transform)).toBe(before);

    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.click()
    );
    expect(applied).toHaveLength(1);
    expect(applied[0]?.dvt).toMatchObject({ mode: 'substrait', shape: 'inner_join' });
    expect(applied[0]?.relationalAuthoringDraft).toEqual({
      version: 'v1',
      sources: [],
      operations: [],
      positions: expect.any(Object),
    });
    expect(Object.keys(applied[0]!.relationalAuthoringDraft!.positions).length).toBeGreaterThan(0);
    expect(JSON.stringify(transform)).toBe(before);
  });
});
