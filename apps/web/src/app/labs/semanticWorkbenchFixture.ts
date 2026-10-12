import type { CanonicalEdge, CanonicalNode } from '../types/canonical';
import { createSourceJoin } from '../views/canvas/canvasSourceJoin';
import { encodeDvtSubstraitSemanticDocument } from '../views/canvas/canvasDvtSubstraitSemanticDocument';
import { allocateDvtRelationId } from '@dvt/contracts';
import { deriveRelationSchema, deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { createCanonicalComposition } from '../views/canvas/canvasCanonicalComposition';
import { createSourceDocument } from '../views/canvas/canvasSourceDocument';
import {
  createSourceRelation,
  type ConnectedRelationSource,
} from '../views/canvas/canvasSourceRelation';
import type { DvtSubstraitJoinDataType } from '@dvt/postgres-projection';
import { applyDvtSubstraitSemanticDocument } from '../views/canvas/canvasDvtTransformAuthoringAuthority';
import clientFixture from './fixtures/client.json';
import orderDetailsFixture from './fixtures/order-details.json';
import ordersFixture from './fixtures/orders.json';
import { loadSemanticWorkbenchDataset } from './semanticWorkbenchDataset';

const SUBSTRAIT_TYPE_BY_DATASET_TYPE = {
  integer: 'i64',
  numeric: 'fp64',
  text: 'string',
  boolean: 'bool',
  timestamp: 'precisionTimestampTz',
} as const satisfies Record<
  ReturnType<typeof loadSemanticWorkbenchDataset>['columns'][number]['type'],
  DvtSubstraitJoinDataType
>;

const BASE_TRANSFORM: CanonicalNode = {
  id: 'lab-transform-orders-client',
  name: 'Orders + Client + Details',
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
    orderDetails?: unknown;
  } = {}
) {
  type Dataset = ReturnType<typeof loadSemanticWorkbenchDataset>;
  const orders = loadSemanticWorkbenchDataset(input.orders ?? ordersFixture);
  const clients = loadSemanticWorkbenchDataset(input.client ?? clientFixture);
  const orderDetails = loadSemanticWorkbenchDataset(input.orderDetails ?? orderDetailsFixture);
  const clientIds = new Set(clients.rows.map((row) => row.client_id));
  orders.rows.forEach((row) => {
    if (!clientIds.has(row.client_id)) {
      throw new Error(
        `orders.client_id references missing client.client_id value "${String(row.client_id)}".`
      );
    }
  });
  const orderIds = new Set(orders.rows.map((row) => row.order_id));
  orderDetails.rows.forEach((row) => {
    if (!orderIds.has(row.order_id)) {
      throw new Error(
        `order_details.order_id references missing orders.order_id value "${String(row.order_id)}".`
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
  const buildJoinSource = (node: CanonicalNode, dataset: Dataset): ConnectedRelationSource => ({
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

  const sources = [
    buildSourceNode(orders),
    buildSourceNode(clients),
    buildSourceNode(orderDetails),
  ] as const;
  const join = createSourceJoin({
    left: {
      source: buildJoinSource(sources[0], orders),
      fields: orders.columns.map((column) => column.name),
      fieldTypes: orders.columns.map((column) => SUBSTRAIT_TYPE_BY_DATASET_TYPE[column.type]),
      fieldNullabilities: orders.columns.map((column) => column.nullable === true),
    },
    right: {
      source: buildJoinSource(sources[1], clients),
      fields: clients.columns.map((column) => column.name),
      fieldTypes: clients.columns.map((column) => SUBSTRAIT_TYPE_BY_DATASET_TYPE[column.type]),
      fieldNullabilities: clients.columns.map((column) => column.nullable === true),
    },
    leftFieldName: 'client_id',
    rightFieldName: 'client_id',
    targetNodeId: BASE_TRANSFORM.id,
  });
  const { index, schemas } = deriveSubstraitSchemas(join);
  const left = index.relations.get(index.rootId)!;
  const right = createSourceRelation(
    {
      source: buildJoinSource(sources[2], orderDetails),
      fields: orderDetails.columns.map((column) => column.name),
      fieldTypes: orderDetails.columns.map((column) => SUBSTRAIT_TYPE_BY_DATASET_TYPE[column.type]),
      fieldNullabilities: orderDetails.columns.map((column) => column.nullable === true),
    },
    4
  );
  const composed = createCanonicalComposition({
    plan: join.plan,
    binding: { relationId: allocateDvtRelationId(), relAnchor: 5, displayName: 'join' },
    inputs: [left, right],
    schemas: [
      schemas.get(index.rootId)!,
      deriveRelationSchema({ ...right, inputs: [], consumers: [] }, []),
    ],
    operation: 'inner_join',
    predicate: {
      leftFieldId: left.fields.find((field) => field.displayName === 'order_id')!.fieldId,
      rightFieldId: right.fields.find((field) => field.displayName === 'order_id')!.fieldId,
    },
  });
  const document = createSourceDocument(
    [...index.relations.values(), right, composed],
    composed,
    composed.extensions
  );
  const transform = applyDvtSubstraitSemanticDocument(
    BASE_TRANSFORM,
    encodeDvtSubstraitSemanticDocument(document)
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
