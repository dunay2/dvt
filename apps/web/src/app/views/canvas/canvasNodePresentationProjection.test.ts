import type { ConnectedSourceRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  applyDvtSubstraitProjectionFunction,
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
  resolveDvtSubstraitColumnFunctions,
} from './canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';

const SOURCE_REF: ConnectedSourceRef = {
  schemaVersion: 'connected-source-ref.v1',
  connectionRef: {
    schemaVersion: 'connection-ref.v1',
    connectionId: 'warehouse-main',
    provider: 'postgres',
  },
  sourceObjectId: 'raw.orders',
};

const SOURCE: CanonicalNode = {
  id: 'source-orders',
  name: 'orders',
  pluginId: 'dvt',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    schema: 'raw',
    tableName: 'orders',
    connectedSourceRef: SOURCE_REF,
    columns: [
      { name: 'order_id', type: 'integer' },
      { name: 'customer', type: 'text' },
      { name: 'amount', type: 'numeric' },
    ],
  },
};

function buildCanonicalTransform(): CanonicalNode {
  const draft = createDvtSubstraitProjectionDraft({
    source: {
      nodeId: SOURCE.id,
      schema: 'raw',
      table: 'orders',
      sourceRef: SOURCE_REF,
      fields: [
        { name: 'order_id', dataType: 'integer' },
        { name: 'customer', dataType: 'text' },
        { name: 'amount', dataType: 'numeric' },
      ],
    },
    targetNodeId: 'transform-orders',
    outputs: [{ fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'customer' }],
  });
  const trim = resolveDvtSubstraitColumnFunctions({ dataType: 'text', provider: 'postgres' }).find(
    (entry) => entry.name === 'trim'
  );
  if (trim == null) throw new Error('Expected admitted trim capability.');
  const document = encodeDvtSubstraitProjectionDocument(
    applyDvtSubstraitProjectionFunction(draft, {
      fieldId: 'output:order_id',
      capabilityId: trim.capabilityId,
      alias: 'customer_clean',
      dataType: 'text',
      provider: 'postgres',
    })
  );
  return applyDvtSubstraitSemanticDocument(
    {
      id: 'transform-orders',
      name: 'Transform orders',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {},
    },
    document
  );
}

describe('projectCanvasNodePresentationTruth', () => {
  it('projects canonical code and transformed columns from Substrait authority', () => {
    const transform = buildCanonicalTransform();
    const truth = projectCanvasNodePresentationTruth({
      node: transform,
      nodes: [SOURCE, transform],
      edges: [{ sourceId: SOURCE.id, targetId: transform.id }],
    });

    expect(truth.code).toMatchObject({ kind: 'canonical', language: 'json' });
    expect(truth.columns.visible).toEqual([
      expect.objectContaining({ name: 'order_id', provenance: 'inherited' }),
      expect.objectContaining({
        name: 'customer_clean',
        provenance: 'declared',
        sourceFieldName: 'customer',
        operations: ['trim'],
      }),
      expect.objectContaining({ name: 'amount', provenance: 'inherited' }),
    ]);
  });

  it('projects only a direct upstream schema and keeps declared outputs authoritative', () => {
    const transform: CanonicalNode = {
      ...buildCanonicalTransform(),
      metadata: {},
    };
    const sink: CanonicalNode = {
      id: 'sink-orders',
      name: 'Orders sink',
      pluginId: 'dvt',
      kind: 'dvt:sink',
      role: 'output',
      status: 'idle',
      tags: [],
      metadata: {},
    };
    const edges: CanonicalEdge[] = [
      { sourceId: SOURCE.id, targetId: transform.id },
      { sourceId: transform.id, targetId: sink.id },
    ];

    expect(
      projectCanvasNodePresentationTruth({ node: sink, nodes: [SOURCE, transform, sink], edges })
        .columns.visible
    ).toEqual([
      expect.objectContaining({ name: 'order_id', type: 'integer' }),
      expect.objectContaining({ name: 'customer', type: 'text' }),
      expect.objectContaining({ name: 'amount', type: 'numeric' }),
    ]);

    const declaredSink = {
      ...sink,
      metadata: { columns: [{ name: 'declared_id', type: 'uuid' }] },
    };
    expect(
      projectCanvasNodePresentationTruth({
        node: declaredSink,
        nodes: [SOURCE, transform, declaredSink],
        edges,
      }).columns.visible
    ).toEqual([expect.objectContaining({ name: 'declared_id', provenance: 'declared' })]);
  });
});
