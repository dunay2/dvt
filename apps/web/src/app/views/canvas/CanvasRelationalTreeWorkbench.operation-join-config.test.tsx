// @vitest-environment jsdom
/** Connecting both JOIN inputs produces one configured semantic operation. */
import { describe, expect, it, vi } from 'vitest';
import {
  container,
  setupWorkbenchTest,
  sourceNode,
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

describe('Canvas relational-tree JOIN configuration', () => {
  setupWorkbenchTest();

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
