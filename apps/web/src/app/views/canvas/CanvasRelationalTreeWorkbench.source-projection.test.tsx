// @vitest-environment jsdom
/** Source occurrences connect to explicit operations and remain unavailable in read-only mode. */
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import {
  dropWorkbenchSource,
  stageWorkbenchOperation,
} from './CanvasRelationalTreeWorkbench.gestures.test-support';
import {
  COPY,
  container,
  dragSourceTo,
  edge,
  root,
  setupWorkbenchTest,
  sourceNode,
  transformNode,
} from './CanvasRelationalTreeWorkbench.test-support';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';

describe('Canvas relational-tree source projection', () => {
  setupWorkbenchTest();

  it('connects a dropped instance without replacing its identity', async () => {
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
    await dropWorkbenchSource(source.id);
    const id = container.querySelector('[data-pending="true"]')?.getAttribute('data-relation-id');
    await stageWorkbenchOperation('projection');
    const projection = container.querySelector<HTMLElement>('[data-pending-operation="true"]')!;
    const producer = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-output-port"]')
    ).find((port) => port.parentElement?.querySelector('[data-pending="true"]') != null)!;
    await act(async () =>
      dragSourceTo(
        producer,
        projection.querySelector<HTMLElement>('[data-slot="canvas-relational-input-port"]')!
      )
    );
    expect(
      container.querySelector('[data-operator="read"]')?.getAttribute('data-relation-id')
    ).toBe(id);
    expect(container.querySelector('[data-operator="project"]')).not.toBeNull();
  });

  it('rejects catalogue drops in a read-only model', async () => {
    const graph = occurrenceGraph();
    const apply = vi.fn();
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={graph.targetNode}
          nodes={graph.nodes}
          edges={graph.edges}
          copy={COPY}
          authoring={{ canEditNode: false, onApplyNodeDraft: apply }}
        />
      )
    );
    expect(
      container
        .querySelector('[data-slot="canvas-relational-tree-source"]')
        ?.getAttribute('draggable')
    ).toBe('false');
    await dropWorkbenchSource(graph.source.id);
    expect(container.querySelector('[data-slot="source-occurrence-add"]')).toBeNull();
    expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(0);
    expect(apply).not.toHaveBeenCalled();
  });
});
