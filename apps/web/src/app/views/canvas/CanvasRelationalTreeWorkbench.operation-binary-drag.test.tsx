// @vitest-environment jsdom
/** A binary operation accepts each producer only through its explicit Input ports. */
import { describe, expect, it, vi } from 'vitest';
import {
  container,
  setupWorkbenchTest,
  sourceNode,
} from './CanvasRelationalTreeWorkbench.test-support';
import {
  disconnectWorkbenchOutput,
  dragWorkbenchOperation,
  removeWorkbenchConnection,
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

describe('Canvas relational-tree binary operation drag', () => {
  setupWorkbenchTest();

  it('connects and removes explicit left and right Input relations', async () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
    const apply = vi.fn(() => ({ outcome: 'no_changes' as const }));
    await renderOperationWorkbench(projectionTarget(customers), [customers, orders], apply);

    await dragWorkbenchOperation('cross-join');
    await instantiateSource('orders');
    const operation = stagedOperation('cross');
    const [left, right] = Array.from(
      operation.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-input-port"]')
    );
    await disconnectWorkbenchOutput(container);
    await dragElement(canonicalOutputPort(), left!);
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      1
    );
    await dragElement(pendingSourceOutputPorts()[0]!, right!);
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      2
    );

    const first = container.querySelector<SVGElement>(
      '[data-slot="canvas-relational-pending-edge-action"][data-port="0"]'
    )!;
    await removeWorkbenchConnection(first);
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      1
    );
    expect(apply).not.toHaveBeenCalled();
  });
});
