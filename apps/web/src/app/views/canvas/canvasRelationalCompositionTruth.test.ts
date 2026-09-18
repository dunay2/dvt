import type { ConnectedSourceRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createDvtSubstraitStringInnerJoinDraft,
  encodeDvtSubstraitInnerJoinDocument,
} from './canvasDvtSubstraitJoinComposition';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { resolveCanvasRelationalCompositionTruth } from './canvasRelationalCompositionTruth';

function source(name: string): CanonicalNode {
  const sourceRef: ConnectedSourceRef = {
    schemaVersion: 'connected-source-ref.v1',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'warehouse-main',
      provider: 'postgres',
    },
    sourceObjectId: `raw.${name}`,
  };
  return {
    id: `source-${name}`,
    name,
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      schema: 'raw',
      tableName: name,
      connectedSourceRef: sourceRef,
      columns: [{ name: 'id', type: 'text' }],
    },
  };
}

function transform(): CanonicalNode {
  return {
    id: 'transform-composition',
    name: 'Composition',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {},
  };
}

function sourceRef(node: CanonicalNode): ConnectedSourceRef {
  return node.metadata!.connectedSourceRef as ConnectedSourceRef;
}

function edge(node: CanonicalNode): Pick<CanonicalEdge, 'sourceId' | 'targetId'> {
  return { sourceId: node.id, targetId: 'transform-composition' };
}

function canonicalJoin(left: CanonicalNode, right: CanonicalNode): CanonicalNode {
  return applyDvtSubstraitSemanticDocument(
    transform(),
    encodeDvtSubstraitInnerJoinDocument(
      createDvtSubstraitStringInnerJoinDraft({
        left: {
          source: {
            nodeId: left.id,
            schema: 'raw',
            table: left.name,
            sourceRef: sourceRef(left),
          },
          fields: ['id'],
          fieldTypes: ['string'],
        },
        right: {
          source: {
            nodeId: right.id,
            schema: 'raw',
            table: right.name,
            sourceRef: sourceRef(right),
          },
          fields: ['id'],
          fieldTypes: ['string'],
        },
        leftFieldName: 'id',
        rightFieldName: 'id',
        targetNodeId: 'transform-composition',
      })
    )
  );
}

describe('resolveCanvasRelationalCompositionTruth', () => {
  const orders = source('orders');
  const clients = source('clients');
  const details = source('details');

  it('keeps one input in the unchanged single-input state', () => {
    expect(
      resolveCanvasRelationalCompositionTruth({
        node: transform(),
        nodes: [orders, transform()],
        edges: [edge(orders)],
      })
    ).toEqual({ state: 'single-input', connectedInputCount: 1 });
  });

  it('marks every connected operand as pending before an operation is selected', () => {
    expect(
      resolveCanvasRelationalCompositionTruth({
        node: transform(),
        nodes: [orders, clients, transform()],
        edges: [edge(orders), edge(clients)],
      })
    ).toEqual({ state: 'pending', connectedInputCount: 2, pendingInputCount: 2 });
  });

  it('recognizes an explicitly authored canonical JOIN', () => {
    const join = canonicalJoin(orders, clients);
    expect(
      resolveCanvasRelationalCompositionTruth({
        node: join,
        nodes: [orders, clients, join],
        edges: [edge(orders), edge(clients)],
      })
    ).toEqual({ state: 'canonical', connectedInputCount: 2, operation: 'inner_join' });
  });

  it('keeps the canonical JOIN while exposing a third input as pending', () => {
    const join = canonicalJoin(orders, clients);
    expect(
      resolveCanvasRelationalCompositionTruth({
        node: join,
        nodes: [orders, clients, details, join],
        edges: [edge(orders), edge(clients), edge(details)],
      })
    ).toEqual({
      state: 'pending',
      connectedInputCount: 3,
      pendingInputCount: 1,
      canonicalOperation: 'inner_join',
    });
  });

  it('fails closed when a canonical operand is disconnected', () => {
    const join = canonicalJoin(orders, clients);
    expect(
      resolveCanvasRelationalCompositionTruth({
        node: join,
        nodes: [orders, clients, join],
        edges: [edge(orders)],
      })
    ).toEqual({
      state: 'incomplete',
      connectedInputCount: 1,
      missingInputCount: 1,
      canonicalOperation: 'inner_join',
    });
  });
});
