import type { ConnectedSourceRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { readCanvasDependencyEdgeData } from './canvasDependencyEdgeModel';
import { projectCanvasViewportEdges } from './canvasViewportEdgeProjection';

function source(id: string): CanonicalNode {
  const sourceRef: ConnectedSourceRef = {
    schemaVersion: 'connected-source-ref.v1',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'warehouse-main',
      provider: 'postgres',
    },
    sourceObjectId: `raw.${id}`,
  };
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      schema: 'raw',
      tableName: id,
      connectedSourceRef: sourceRef,
      columns: [{ name: 'id', type: 'text' }],
    },
  };
}

describe('Canvas viewport edge projection', () => {
  it('correlates two pending inputs while preserving two real dependency edges', () => {
    const orders = source('orders');
    const clients = source('clients');
    const model: CanonicalNode = {
      id: 'model',
      name: 'Model',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {},
    };
    const visibleEdges = [
      { sourceId: orders.id, targetId: model.id },
      { sourceId: clients.id, targetId: model.id },
    ];

    const projected = projectCanvasViewportEdges({
      visibleEdges,
      allowedNodeIds: new Set([orders.id, clients.id, model.id]),
      canonicalEdgeIdBySignature: new Map(),
      canonicalEdgeBySignature: new Map(),
      canonicalNodesById: new Map([orders, clients, model].map((node) => [node.id, node])),
      locale: 'es',
    });
    const composition = projected.map(
      (edge) => readCanvasDependencyEdgeData(edge.data)?.composition
    );

    expect(projected).toHaveLength(2);
    expect(composition.every((member) => member?.state === 'pending')).toBe(true);
    expect(composition.every((member) => member?.label === 'RELACIONAR / COMPONER')).toBe(true);
    expect(composition.filter((member) => member?.role === 'trunk-owner')).toHaveLength(1);
    expect(projected.every((edge) => edge.ariaLabel?.includes('RELACIONAR / COMPONER'))).toBe(true);
  });
});
