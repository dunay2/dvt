import { describe, expect, it } from 'vitest';

import { getPluginPortMap } from '../../plugins/registry';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  resolveCanvasEdgeCreationTransaction,
  resolveCanvasEdgeReconnectTransaction,
} from './canvasEdgeAdmissionTransaction';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import { createSourceRelation, toSourceRelationInput } from './canvasSourceRelation';
import { createSourceDocument } from './canvasSourceDocument';
import { resolveCanvasSubstraitGraphBindings } from './canvasSubstraitGraphBindings';

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
  it.each(['replace', 'reconnect'] as const)(
    'does not rewrite an authored Read on dependency %s',
    async (intent) => {
      const oldEdge = { sourceId: orders.id, targetId: transform.id };
      const input = resolveCanvasDvtCompositionInputs({
        nodes: [orders, transform],
        edges: [oldEdge],
        targetNodeId: transform.id,
      })[0]!;
      const read = createSourceRelation(toSourceRelationInput(input), 1);
      const authored = applyDvtSubstraitSemanticDocument(
        transform,
        encodeDvtSubstraitSemanticDocument(createSourceDocument([read], read))
      );
      const nodes = [orders, outbox, authored];
      const snapshot = structuredClone(authored);
      const edge = { id: 'dependency', source: orders.id, target: authored.id };
      const args = {
        canonicalNodesById: new Map(nodes.map((node) => [node.id, node])),
        connection: {
          source: outbox.id,
          sourceHandle: null,
          target: authored.id,
          targetHandle: null,
        },
        draftSession: {
          ...draftSession(),
          localNodeCatalog: { [authored.id]: authored },
          workingSet: {
            ...draftSession().workingSet,
            visibleEdges: intent === 'reconnect' ? [oldEdge] : [],
          },
        },
        edges: intent === 'reconnect' ? [edge] : [],
        pluginPortMap: getPluginPortMap(),
      };
      const result =
        intent === 'reconnect'
          ? resolveCanvasEdgeReconnectTransaction({ ...args, edge })
          : await resolveCanvasEdgeCreationTransaction(args);
      if (result.outcome === 'noop') throw new Error('Expected admitted dependency');
      expect(result.draftSession.localNodeCatalog?.[authored.id]).toBe(authored);
      expect(authored).toEqual(snapshot);
      const graph = { node: authored, nodes, edges: result.draftSession.workingSet.visibleEdges };
      expect(() => resolveCanvasSubstraitGraphBindings(graph)).toThrow();
      const presentation = await projectCanvasNodePresentationTruth(graph);
      expect(presentation.relationalComposition?.state).toBe('incomplete');
      expect(presentation.columns.inherited.map((column) => column.name)).toEqual(
        outboxColumns.map((column) => column.name)
      );
    }
  );
});
