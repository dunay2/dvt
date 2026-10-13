/**
 * Owned concern: prove dependency Input projection without fabricating model publication.
 * @baseline ADR-0064 / GH-3628: producer names do not substitute for lost identities.
 * @decision Retain exact implicit stale slots and preserve explicit saved slot identities.
 * @consequence Unresolved bindings remain addressable without becoming available outputs.
 * @version 1.1.0
 */
import { describe, expect, it } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import {
  projectGraphNodeCardInputs,
  selectGraphNodeCardColumns,
} from './canvasGraphNodeColumnProjection';
import { projectCanvasColumnLineage } from './canvasColumnLineageProjection';
import { createCanvasColumnHandleId } from './canvasColumnHandleIdentity';
import { canvasInputSlotId, projectCanvasInputBindings } from './canvasInputBindings';
import { createProducerInput } from '@dvt/substrait-analysis';
import {
  createDvtSubstraitProjectionDraft,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';
import { SOURCE } from './canvasOutputProjection.test-support';
import { createSourceDocument } from './canvasSourceDocument';

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
  it('retains exact missing implicit model slots without matching newly published names', () => {
    const producerDocument = createDvtSubstraitProjectionDraft({
      source: resolveDvtSubstraitProjectionSource(SOURCE)!,
      targetNodeId: 'publisher',
      outputs: [{ fieldId: 'lost-identity', name: 'customer', sourceFieldName: 'customer' }],
    });
    const read = createProducerInput(
      { nodeId: 'publisher', name: 'Publisher', document: producerDocument },
      1
    );
    const sidecar = createSourceDocument([read], read).sidecar;
    const args = {
      targetNodeId: consumer.id,
      edges: [{ sourceId: 'publisher', targetId: consumer.id }],
      producers: new Map([
        ['publisher', [{ columnId: 'new-identity', name: 'customer', type: 'text' }]],
      ]),
      retainedSidecar: sidecar,
    };
    const result = projectCanvasInputBindings(args);
    expect(result).toContainEqual({
      inputId: canvasInputSlotId('publisher', 'lost-identity'),
      source: { nodeId: 'publisher', columnId: 'lost-identity' },
      name: 'customer',
      type: 'unknown',
      state: 'unresolved',
    });
    expect(result).toContainEqual({
      inputId: canvasInputSlotId('publisher', 'new-identity'),
      source: { nodeId: 'publisher', columnId: 'new-identity' },
      name: 'customer',
      type: 'text',
      state: 'available',
    });
    expect(
      projectCanvasInputBindings({
        ...args,
        edges: [
          {
            ...args.edges[0]!,
            inputBindings: {
              version: 'v1',
              fields: [{ inputId: 'saved-slot', producerFieldId: 'lost-identity' }],
            },
          },
        ],
      })
    ).toEqual([{ ...result[1]!, inputId: 'saved-slot' }]);
  });
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
