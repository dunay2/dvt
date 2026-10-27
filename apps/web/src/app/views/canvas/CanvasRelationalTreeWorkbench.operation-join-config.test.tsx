// @vitest-environment jsdom
/** Connecting both JOIN inputs produces one configured semantic operation. */
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  container,
  setupWorkbenchTest,
  sourceNode,
  transformNode,
  edge,
} from './CanvasRelationalTreeWorkbench.test-support';
import {
  disconnectWorkbenchOutput,
  dragWorkbenchOperation,
} from './CanvasRelationalTreeWorkbench.gestures.test-support';
import {
  canonicalOutputPort,
  dragElement,
  instantiateSource,
  pendingSourceOutputPorts,
  projectionTarget,
  renderOperationWorkbench,
  stagedOperation,
} from './CanvasRelationalTreeWorkbench.operation-drag.test-support';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import { createPendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { configureCanvasStagedComposition } from './canvasStagedCompositionConfiguration';
import { createCanvasRelationalAuthoringDraft } from './canvasRelationalAuthoringDraft';

describe('Canvas relational-tree JOIN configuration', () => {
  setupWorkbenchTest();

  it('Cancel restores the saved pending JOIN and its retained condition without writing', async () => {
    const sources = [sourceNode('customers', 'customers'), sourceNode('orders', 'orders')];
    const model = transformNode();
    const inputs = resolveCanvasDvtCompositionInputs({
      targetNodeId: model.id,
      nodes: [...sources, model],
      edges: sources.map((source) => edge(source.id)),
    });
    const [left, previousRight, right] = [inputs[0]!, inputs[0]!, inputs[1]!].map(
      createPendingSourceOccurrence
    );
    const previous = configureCanvasStagedComposition(
      {
        id: 'pending-operation:retained-join',
        operation: 'inner_join',
        inputs: [left!.read.binding.relationId, previousRight!.read.binding.relationId],
      },
      inputs,
      [left!, previousRight!],
      []
    );
    const draft = createCanvasRelationalAuthoringDraft({
      sources: [left!, right!],
      operations: [
        {
          id: previous.id,
          operation: 'inner_join',
          inputs: [left!.read.binding.relationId, right!.read.binding.relationId],
          configurationDocument: previous.semanticDocument!,
        },
      ],
      outputRelationId: previous.id,
      positions: new Map(),
    });
    const target = { ...model, metadata: { ...model.metadata, relationalAuthoringDraft: draft } };
    const before = JSON.stringify(target);
    const apply = vi.fn(() => ({ outcome: 'no_changes' as const }));
    await renderOperationWorkbench(target, sources, apply);
    await act(async () =>
      stagedOperation('join').querySelector<HTMLButtonElement>('[data-operator="join"]')!.click()
    );
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-staged-operation-reconfigure"]')!
        .click()
    );
    expect(
      container.querySelector('[data-slot="dvt-substrait-join-predicate-editors"]')
    ).not.toBeNull();
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-cancel"]')!
        .click()
    );
    expect(container.querySelectorAll('[data-pending-operation="true"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-pending="true"][data-operator="read"]')).toHaveLength(
      2
    );
    expect(apply).not.toHaveBeenCalled();
    expect(JSON.stringify(target)).toBe(before);
  });

  it('configures a staged JOIN after both producers are connected', async () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
    const apply = vi.fn(() => ({ outcome: 'no_changes' as const }));
    await renderOperationWorkbench(projectionTarget(customers), [customers, orders], apply);

    await dragWorkbenchOperation('inner-join');
    await instantiateSource('orders');
    const operation = stagedOperation('join');
    const [left, right] = Array.from(
      operation.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-input-port"]')
    );
    await dragElement(pendingSourceOutputPorts()[0]!, right!);
    await disconnectWorkbenchOutput(container);
    await dragElement(canonicalOutputPort(), left!);

    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      2
    );
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-append-join-input"]')
    ).toBeNull();
    expect(container.querySelectorAll('[data-pending="true"][data-operator="read"]')).toHaveLength(
      0
    );
    expect(apply).not.toHaveBeenCalled();
  });
});
