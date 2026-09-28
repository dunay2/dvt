// @vitest-environment jsdom
/** Producers can wire in either JOIN-port order and then feed a consumer operation. */
import { describe, expect, it, vi } from 'vitest';
import {
  container,
  setupWorkbenchTest,
  sourceNode,
  transformNode,
} from './CanvasRelationalTreeWorkbench.test-support';
import { dragWorkbenchOperation } from './CanvasRelationalTreeWorkbench.gestures.test-support';
import {
  dragElement,
  instantiateSource,
  pendingSourceOutputPorts,
  renderOperationWorkbench,
  stagedOperation,
} from './CanvasRelationalTreeWorkbench.operation-drag.test-support';

describe('Canvas relational-tree operation chain', () => {
  setupWorkbenchTest();

  it('connects producers without prior selection and chains the JOIN output', async () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
    await renderOperationWorkbench(transformNode(), [customers, orders], vi.fn());

    await dragWorkbenchOperation('inner-join');
    await dragWorkbenchOperation('aggregate');
    await instantiateSource('customers');
    await instantiateSource('orders');

    const join = stagedOperation('join');
    const [left, right] = Array.from(
      join.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-input-port"]')
    );
    const producers = pendingSourceOutputPorts();
    expect(producers.every((port) => port.getAttribute('aria-pressed') === 'false')).toBe(true);
    await dragElement(producers[1]!, right!);
    await dragElement(producers[0]!, left!);

    const aggregate = stagedOperation('aggregate');
    await dragElement(
      join.querySelector<HTMLElement>('[data-slot="canvas-relational-output-port"]')!,
      aggregate.querySelector<HTMLElement>('[data-slot="canvas-relational-input-port"]')!
    );
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      3
    );
    expect(container.querySelectorAll('[data-pending="true"][data-operator="read"]')).toHaveLength(
      0
    );
  });
});
