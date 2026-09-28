// @vitest-environment jsdom
/** A unary operation is placed before its producer and Output connections. */
import { describe, expect, it, vi } from 'vitest';
import {
  container,
  setupWorkbenchTest,
  sourceNode,
} from './CanvasRelationalTreeWorkbench.test-support';
import {
  connectWorkbenchOutput,
  disconnectWorkbenchOutput,
  dragWorkbenchOperation,
} from './CanvasRelationalTreeWorkbench.gestures.test-support';
import {
  canonicalOutputPort,
  dragElement,
  projectionTarget,
  renderOperationWorkbench,
  stagedOperation,
} from './CanvasRelationalTreeWorkbench.operation-drag.test-support';

describe('Canvas relational-tree unary operation drag', () => {
  setupWorkbenchTest();

  it('places Transform first and links its Input and Output explicitly', async () => {
    const source = sourceNode('customers', 'customers');
    const apply = vi.fn(() => ({ outcome: 'no_changes' as const }));
    await renderOperationWorkbench(projectionTarget(source), [source], apply);

    await dragWorkbenchOperation('transform');
    const transform = stagedOperation('project');
    expect(container.querySelectorAll('[data-operator="project"]')).toHaveLength(2);

    await disconnectWorkbenchOutput(container);
    await dragElement(
      canonicalOutputPort(),
      transform.querySelector<HTMLElement>('[data-slot="canvas-relational-input-port"]')!
    );
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      1
    );
    expect(container.querySelector('[data-slot="canvas-relational-output-edge"]')).toBeNull();

    await connectWorkbenchOutput(
      container,
      transform.querySelector<HTMLElement>('[data-slot="canvas-relational-output-port"]')!
    );
    expect(container.querySelector('[data-slot="canvas-relational-output-edge"]')).not.toBeNull();
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.disabled
    ).toBe(false);
    expect(apply).not.toHaveBeenCalled();
  });
});
