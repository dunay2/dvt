import type { CanonicalEdge, CanonicalNode } from '../types/canonical';
import {
  createDvtSubstraitStringInnerJoinDraft,
  encodeDvtSubstraitInnerJoinDocument,
  type DvtSubstraitJoinSource,
} from '../views/canvas/canvasDvtSubstraitJoinComposition';
import { applyDvtSubstraitSemanticDocument } from '../views/canvas/canvasDvtTransformAuthoringAuthority';
import clientFixture from './fixtures/client.json';
import ordersFixture from './fixtures/orders.json';
import { loadSemanticWorkbenchDataset } from './semanticWorkbenchDataset';

const BASE_TRANSFORM: CanonicalNode = {
  id: 'lab-transform-orders-client',
  name: 'Orders + Client',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: ['semantic-workbench'],
  metadata: {},
};

export function buildSemanticWorkbenchFixture(
  input: {
    orders?: unknown;
    client?: unknown;
  } = {}
) {
  type Dataset = ReturnType<typeof loadSemanticWorkbenchDataset>;
  const orders = loadSemanticWorkbenchDataset(input.orders ?? ordersFixture);
  const clients = loadSemanticWorkbenchDataset(input.client ?? clientFixture);
  const clientIds = new Set(clients.rows.map((row) => row.client_id));
  orders.rows.forEach((row) => {
    if (!clientIds.has(row.client_id)) {
      throw new Error(
        `orders.client_id references missing client.client_id value "${String(row.client_id)}".`
      );
    }
  });

  const buildSourceNode = (dataset: Dataset): CanonicalNode => {
    const logicalPayloadBytes = new TextEncoder().encode(JSON.stringify(dataset.rows)).byteLength;
    return {
      id: `lab-source-${dataset.tableName}`,
      name: dataset.displayName,
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: ['semantic-workbench', 'json-fixture'],
      metadata: {
        schema: dataset.schema,
        tableName: dataset.tableName,
        sampleRows: dataset.rows,
        sourceMetricEvidence: {
          observedAt: dataset.observedAt,
          observationScope: { kind: 'snapshot' },
          rowCount: {
            value: dataset.rows.length,
            provenance: 'measured',
            method: 'data-scan',
            confidence: 'exact',
          },
          byteSize: {
            value: logicalPayloadBytes,
            provenance: 'measured',
            method: 'data-scan',
            confidence: 'exact',
            basis: 'logical-payload',
          },
        },
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'semantic-workbench-local-json',
            provider: 'postgres',
          },
          sourceObjectId: `${dataset.schema}.${dataset.tableName}`,
        },
        columns: dataset.columns,
      },
    };
  };
  const buildJoinSource = (node: CanonicalNode, dataset: Dataset): DvtSubstraitJoinSource => ({
    nodeId: node.id,
    schema: dataset.schema,
    table: dataset.tableName,
    sourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'semantic-workbench-local-json',
        provider: 'postgres',
      },
      sourceObjectId: `${dataset.schema}.${dataset.tableName}`,
    },
  });

  const sources = [buildSourceNode(orders), buildSourceNode(clients)] as const;
  const join = createDvtSubstraitStringInnerJoinDraft({
    left: {
      source: buildJoinSource(sources[0], orders),
      fields: orders.columns.map((column) => column.name),
    },
    right: {
      source: buildJoinSource(sources[1], clients),
      fields: clients.columns.map((column) => column.name),
    },
    leftFieldName: 'client_id',
    rightFieldName: 'client_id',
    targetNodeId: BASE_TRANSFORM.id,
  });
  const transform = applyDvtSubstraitSemanticDocument(
    BASE_TRANSFORM,
    encodeDvtSubstraitInnerJoinDocument(join)
  );
  const edges: readonly CanonicalEdge[] = sources.map((source) => ({
    id: `${source.id}-${transform.id}`,
    sourceId: source.id,
    targetId: transform.id,
    relation: 'lineage',
  }));
  return Object.freeze({
    sources: Object.freeze(sources),
    transform,
    edges: Object.freeze(edges),
  });
}

export const {
  sources: SEMANTIC_WORKBENCH_SOURCE,
  transform: SEMANTIC_WORKBENCH_TRANSFORM,
  edges: SEMANTIC_WORKBENCH_EDGE,
} = buildSemanticWorkbenchFixture();
