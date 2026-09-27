// @vitest-environment jsdom
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import { graphJoin, graphModel, graphSource } from './canvasRelationGraph.test-support';
import { source } from './canvasRelationalOperator.test-support';
import { createSourceRelation } from './canvasSourceRelation';
import { createSourceDocument } from './canvasSourceDocument';
import {
  setupWorkbenchTest,
  COPY,
  root,
  container,
  sourceNode,
  transformNode,
  edge,
  dragSourceTo,
} from './CanvasRelationalTreeWorkbench.test-support';
import {
  instantiateWorkbenchSource,
  stageWorkbenchOperation,
} from './CanvasRelationalTreeWorkbench.gestures.test-support';

const find = (slot: string): HTMLElement =>
  container.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!;
const connect = async (producer: HTMLElement, consumer: HTMLElement): Promise<void> => {
  await act(async () => dragSourceTo(producer, consumer));
};
const terminal = (): HTMLElement => find('canvas-relational-output-input-port');
const outputEdge = (): Element | null =>
  container.querySelector('[data-slot="canvas-relational-output-edge"]');
const pendingEdges = (): number =>
  container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]').length;

describe('single-consumer internal connection boundary', () => {
  setupWorkbenchTest();

  it('disconnects a legacy source-to-Output wire without deleting or transforming its source', async () => {
    const producer = graphSource('client');
    const read = createSourceRelation({ source: source('client'), fields: ['customer_id'] }, 1);
    const target = graphModel(createSourceDocument([read], read));
    const apply = vi.fn();
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={target}
          nodes={[producer, target]}
          edges={[{ ...edge(producer.id), targetId: target.id }]}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: apply }}
        />
      )
    );
    expect(outputEdge()).not.toBeNull();
    await act(async () => terminal().click());
    expect(outputEdge()).toBeNull();
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(1);
    expect(container.querySelector('[data-operator="project"]')).toBeNull();
    const producerPort = find('canvas-relational-output-port');
    await connect(producerPort, terminal());
    expect(outputEdge()).toBeNull();
    await stageWorkbenchOperation('inner-join');
    await connect(producerPort, find('canvas-relational-input-port'));
    expect(pendingEdges()).toBe(1);
    expect(apply).not.toHaveBeenCalled();
  });

  it('requires operations between source cards and Output and releases disconnected instances', async () => {
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
    await instantiateWorkbenchSource(find('canvas-relational-tree-source'));
    await instantiateWorkbenchSource(find('canvas-relational-tree-source'));
    await stageWorkbenchOperation('inner-join');
    const reads = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-output-port"]')
    ).filter((port) => port.parentElement?.querySelector('[data-operator="read"]') != null);
    expect(reads).toHaveLength(2);
    const operation = container.querySelector<HTMLElement>('[data-pending-operation="true"]')!;
    const inputs = operation.querySelectorAll<HTMLElement>(
      '[data-slot="canvas-relational-input-port"]'
    );
    const operationOutput = operation.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-output-port"]'
    )!;
    await connect(reads[0]!, terminal());
    expect(outputEdge()).toBeNull();
    await connect(reads[0]!, inputs[1]!);
    await connect(reads[0]!, inputs[0]!);
    expect(pendingEdges()).toBe(1);
    await connect(reads[1]!, inputs[0]!);
    expect(pendingEdges()).toBe(2);
    await connect(operationOutput, terminal());
    expect(outputEdge()).not.toBeNull();
    await stageWorkbenchOperation('projection');
    const next = Array.from(
      container.querySelectorAll<HTMLElement>('[data-pending-operation="true"]')
    ).at(-1)!;
    const nextInput = next.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-input-port"]'
    )!;
    await connect(operationOutput, nextInput);
    expect(pendingEdges()).toBe(2);
    // An old selected producer must not prevent disconnecting an occupied Output.
    await act(async () => reads[0]!.click());
    await act(async () => terminal().click());
    expect(outputEdge()).toBeNull();
    await connect(operationOutput, nextInput);
    expect(pendingEdges()).toBe(3);
    await connect(operationOutput, terminal());
    expect(outputEdge()).toBeNull();
    await act(async () =>
      container
        .querySelector<SVGElement>(
          '[data-slot="canvas-relational-pending-edge-action"][data-port="1"]'
        )!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    );
    expect(pendingEdges()).toBe(2);
    await connect(reads[0]!, inputs[1]!);
    expect(pendingEdges()).toBe(3);
    expect(container.querySelectorAll('[data-pending="true"][data-operator="read"]')).toHaveLength(
      2
    );
  });

  it('counts canonical consumers and keeps terminal disconnection separate from deleting cards', async () => {
    const { document, sources } = graphJoin();
    const target = graphModel(document);
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={target}
          nodes={[...sources, target]}
          edges={sources.map((source) => ({ ...edge(source.id), targetId: target.id }))}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: vi.fn() }}
        />
      )
    );
    await stageWorkbenchOperation('projection');
    const ports = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-output-port"]')
    );
    const source = ports.find(
      (port) => port.parentElement?.querySelector('[data-operator="read"]') != null
    )!;
    const canonicalRoot = ports.find(
      (port) => port.parentElement?.querySelector('[data-operator="join"]') != null
    )!;
    const input = find('canvas-relational-input-port');
    await connect(source, input);
    await connect(canonicalRoot, input);
    expect(pendingEdges()).toBe(0);
    await act(async () =>
      container
        .querySelector<SVGElement>('[data-slot="canvas-relational-output-edge-action"]')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    );
    expect(outputEdge()).toBeNull();
    await connect(source, input);
    expect(pendingEdges()).toBe(0);
    await connect(canonicalRoot, input);
    expect(pendingEdges()).toBe(1);
  });
});
