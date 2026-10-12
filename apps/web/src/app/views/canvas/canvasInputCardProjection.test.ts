import { describe, expect, it } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import {
  projectGraphNodeCardInputs,
  selectGraphNodeCardColumns,
} from './canvasGraphNodeColumnProjection';
import { projectCanvasColumnLineage } from './canvasColumnLineageProjection';
import { createCanvasColumnHandleId } from './canvasColumnHandleIdentity';
import { canvasInputSlotId } from './canvasInputBindings';

const producer = (id: string): CanonicalNode => ({
  id,
  name: id,
  kind: 'dvt:source',
  role: 'input',
  pluginId: 'dvt',
  status: 'idle',
  tags: [],
  metadata: {
    columns: [
      { name: 'shared', type: 'text' },
      { name: 'value', type: 'text' },
    ],
  },
});
const first = producer('first');
const second = producer('second');
const consumer: CanonicalNode = {
  id: 'consumer',
  name: 'consumer',
  kind: 'dvt:transform',
  role: 'transform',
  pluginId: 'dvt',
  status: 'idle',
  tags: [],
};
const nodes = [first, second, consumer];
const edges = [first, second].map((node) => ({ sourceId: node.id, targetId: consumer.id }));

describe('consumer card input publication boundary', () => {
  it('shows both producers as Input but does not invent Output for an incomplete model', async () => {
    const truth = await projectCanvasNodePresentationTruth({ node: consumer, nodes, edges });
    const inputs = projectGraphNodeCardInputs(truth, consumer.id);
    expect(inputs).toHaveLength(4);
    expect(new Set(inputs.map((column) => column.id)).size).toBe(4);
    expect(inputs.every((column) => column.sourceHandleId == null && column.output == null)).toBe(
      true
    );
    expect(selectGraphNodeCardColumns(truth)).toEqual([]);
    expect(truth.columns.state).toBe('unconfigured');
    expect(consumer.metadata).toBeUndefined();
  });
  it('draws every producer field to its Input slot, including the second producer', async () => {
    const truth = await projectCanvasNodePresentationTruth({ node: consumer, nodes, edges });
    const lines = projectCanvasColumnLineage({
      nodes,
      edges,
      expandedNodeIds: new Set(nodes.map((node) => node.id)),
      presentations: new Map([[consumer.id, truth]]),
    });
    expect(lines).toHaveLength(4);
    const inputId = canvasInputSlotId(second.id, 'shared');
    expect(lines.find((line) => line.data?.outputId === inputId)).toMatchObject({
      source: second.id,
      target: consumer.id,
      targetHandle: createCanvasColumnHandleId({
        direction: 'target',
        nodeId: consumer.id,
        columnId: inputId,
      }),
      data: { sourceFieldId: 'shared', removable: true },
    });
    expect(
      projectGraphNodeCardInputs(truth, consumer.id).find((column) => column.id === inputId)
        ?.targetHandleId
    ).toBe(lines.find((line) => line.data?.outputId === inputId)?.targetHandle);
  });
  it('honors persisted field bindings and preserves missing input identity without producing output', async () => {
    const inputId = 'stable-slot';
    const truth = await projectCanvasNodePresentationTruth({
      node: consumer,
      nodes,
      edges: [
        {
          sourceId: second.id,
          targetId: consumer.id,
          metadata: {
            inputBindings: {
              version: 'v1',
              fields: [{ inputId, producerFieldId: 'removed-field' }],
            },
          },
        },
      ],
    });
    expect(truth.inputBindings).toEqual([
      {
        inputId,
        source: { nodeId: second.id, columnId: 'removed-field' },
        name: 'removed-field',
        type: 'unknown',
        state: 'unresolved',
      },
    ]);
    expect(projectGraphNodeCardInputs(truth, consumer.id)[0]?.id).toBe(inputId);
    expect(selectGraphNodeCardColumns(truth)).toEqual([]);
  });
});
