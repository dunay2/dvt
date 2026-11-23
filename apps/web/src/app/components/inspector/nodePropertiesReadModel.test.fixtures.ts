/** Reusable canonical Inspector fixtures; every assertion remains in its test. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasNodePresentationTruth } from '../canvas/canvasNodePresentationTruth.contract';
import { selectGraphNodeCardColumns } from '../../views/canvas/canvasGraphNodeColumnProjection';
import { buildNodePropertiesReadModel } from './nodePropertiesReadModel';
import type { NodePropertySection } from './nodePropertiesContracts';

export const presentationCopy = {
  columnsLabel: 'Columns',
  declaredColumnsDetailTemplate: 'Inherited: 0 · Declared: {count}',
  inheritedColumnsDetailTemplate: 'Inherited: {count} · Declared: 0',
  mixedColumnsDetailTemplate: 'Inherited: {available} · Declared: {declared}',
  noColumnsDetail: 'Inherited: 0 · Declared: 0',
  codeLabel: 'Code',
  workspaceCodeDetailTemplate: 'Code lives at {path}.',
  generatedCodeDetailTemplate: 'Generated code at {path}.',
  codeUnavailableMessage: 'No code.',
} as const;

export const expectedSectionIds = [
  'general',
  'columns',
  'inputs-outputs',
  'tests',
  'keys',
  'indexes',
  'foreign-keys',
  'constraints',
  'comments',
  'code',
  'summary',
] as const;

export const downstreamNode: CanonicalNode = {
  id: 'transform-orders',
  name: 'Clean Orders',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
};

export const graphEdges: readonly CanonicalEdge[] = [
  {
    id: 'edge-source-transform',
    sourceId: 'src-orders',
    targetId: downstreamNode.id,
    relation: 'lineage',
  },
];

export function buildSourceNode(overrides: Partial<CanonicalNode> = {}): CanonicalNode {
  return {
    id: 'src-orders',
    name: 'Orders Source',
    description: 'Imported source for analytics.raw.orders',
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['source', 'raw'],
    path: 'models/sources/src_orders.yml',
    metadata: {
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-prod',
          provider: 'postgres',
        },
        sourceObjectId: 'relation/analytics/raw/orders',
      },
      connectionName: 'Production warehouse',
      sourceName: 'warehouse_prod_analytics_raw',
      database: 'analytics',
      schema: 'raw',
      tableName: 'orders',
      rowCount: 1500,
      byteSize: 4096000,
      owner: 'data-platform',
      sql: 'select * from analytics.raw.orders',
      columns: [
        {
          name: 'order_id',
          type: 'number',
          nullable: false,
          primaryKey: true,
          description: 'Warehouse order identifier',
        },
        { name: 'customer_id', type: 'number', nullable: false },
      ],
      indexes: [{ name: 'idx_orders_customer', type: 'btree', columns: ['customer_id'] }],
      foreignKeys: [
        {
          name: 'fk_orders_customer',
          localColumns: ['customer_id'],
          referencedTable: 'customers',
          referencedColumns: ['customer_id'],
        },
      ],
      constraints: [{ name: 'ck_orders_amount', expression: 'amount >= 0' }],
    },
    ...overrides,
  };
}

const declared = ['customer', 'amount', 'client_id'].map((name) => ({
  name,
  type: 'text',
  provenance: 'declared' as const,
  selected: true,
}));

const available = ['country', 'order_id', 'client_id_2'].map((name) => ({
  name,
  type: 'text',
  provenance: 'inherited' as const,
  selected: false,
}));

const node: CanonicalNode = {
  id: 'native-model',
  name: 'Model 1',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: { columns: [...declared, ...available] },
};

export function inspectNativeOutput(
  state: CanvasNodePresentationTruth['columns']['state'],
  output = declared
): Readonly<{
  section: NodePropertySection;
  card: ReturnType<typeof selectGraphNodeCardColumns>;
}> {
  const truth: CanvasNodePresentationTruth = {
    inputBindings: [],
    columns: {
      state,
      declared: output,
      inherited: available,
      visible: [...output, ...available],
      declaredCount: output.length,
      inheritedCount: available.length,
      visibleCount: output.length + available.length,
      visibleProvenance: 'mixed',
    },
    code: { kind: 'unavailable' },
  };
  const section = buildNodePropertiesReadModel({
    node,
    nodes: [node],
    edges: [],
    presentationCopy,
    presentationTruth: truth,
  }).sections.find(({ id }) => id === 'columns')!;
  return { section, card: selectGraphNodeCardColumns(truth) };
}
