import type { Edge } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import { getPluginPortMap } from '../../plugins/registry';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';
import { resolveCanvasEdgeCreationTransaction } from './canvasEdgeAdmissionTransaction';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';

const connectedSource = (
  id: string,
  columns: readonly Readonly<{ name: string; type: string }>[]
): CanonicalNode => ({
  id,
  name: id,
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: ['source'],
  metadata: {
    schema: 'dvt',
    tableName: id,
    columns,
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'local-postgres',
        provider: 'postgres',
      },
      sourceObjectId: `relation/dvt/dvt/${id}`,
    },
  },
});

const transform: CanonicalNode = {
  id: 'transform-1',
  name: 'Transform 1',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: ['authoring'],
};

const orders = connectedSource('orders', [
  { name: 'order_id', type: 'integer' },
  { name: 'customer', type: 'text' },
  { name: 'amount', type: 'numeric' },
]);

const outboxColumns = [
  { name: 'id', type: 'text' },
  { name: 'tenant_id', type: 'text' },
  { name: 'run_id', type: 'text' },
  { name: 'shard_id', type: 'integer' },
  { name: 'run_seq', type: 'integer' },
  { name: 'created_at', type: 'timestamp with time zone' },
  { name: 'idempotency_key', type: 'text' },
  { name: 'payload', type: 'jsonb' },
  { name: 'attempts', type: 'integer' },
  { name: 'last_error', type: 'text' },
  { name: 'claimed_at', type: 'timestamp with time zone' },
  { name: 'next_attempt_at', type: 'timestamp with time zone' },
  { name: 'delivered_at', type: 'timestamp with time zone' },
] as const;
const outbox = connectedSource('outbox', outboxColumns);

const draftSession = (): CanvasDraftSession => ({
  syncState: 'editing',
  baseline: { record: null },
  draftRevision: 'rev-source-replacement',
  workingSet: {
    visibleNodeIds: [orders.id, outbox.id, transform.id],
    visibleEdges: [],
    pendingExplicitNodeIds: [],
  },
});

describe('Canvas source replacement', () => {
  it('projects the replacement source catalog after the previous dependency is removed', () => {
    const canonicalNodesById = new Map(
      [orders, outbox, transform].map((node) => [node.id, node] as const)
    );
    const first = resolveCanvasEdgeCreationTransaction({
      canonicalNodesById,
      connection: {
        source: orders.id,
        sourceHandle: null,
        target: transform.id,
        targetHandle: null,
      },
      draftSession: draftSession(),
      edges: [],
      pluginPortMap: getPluginPortMap(),
    });
    if (first.outcome !== 'created')
      throw new Error('Expected the first dependency to be created.');

    const withoutOrders: CanvasDraftSession = {
      ...first.draftSession,
      workingSet: { ...first.draftSession.workingSet, visibleEdges: [] },
    };
    const replacement = resolveCanvasEdgeCreationTransaction({
      canonicalNodesById,
      connection: {
        source: outbox.id,
        sourceHandle: null,
        target: transform.id,
        targetHandle: null,
      },
      draftSession: withoutOrders,
      edges: [] as Edge[],
      pluginPortMap: getPluginPortMap(),
    });
    if (replacement.outcome !== 'created') {
      throw new Error('Expected the replacement dependency to be created.');
    }

    const projectedTransform = replacement.draftSession.localNodeCatalog?.[transform.id];
    if (projectedTransform == null) throw new Error('Expected an authored Transform projection.');
    const presentation = projectCanvasNodePresentationTruth({
      node: projectedTransform,
      nodes: [orders, outbox, projectedTransform],
      edges: replacement.draftSession.workingSet.visibleEdges,
    });

    expect(presentation.columns.visible.map((column) => column.name)).toEqual(
      outboxColumns.map((column) => column.name)
    );
    expect(presentation.columns.visible.every((column) => column.sourceNodeId === outbox.id)).toBe(
      true
    );
  });
});
