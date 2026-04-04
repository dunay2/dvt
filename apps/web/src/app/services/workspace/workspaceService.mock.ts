import {
  mockAuditLog,
  mockDiffChanges,
  mockEdges,
  mockNodes,
  mockPlugins,
  mockRoles,
} from '../../data/mockDbtData';
import type { DbtNode } from '../../types/dbt';
import type {
  ImportSourcesInput,
  ImportSourcesResult,
  SourceImportGrouping,
  WarehouseConnection,
  WarehouseTable,
  WorkspaceGraphSnapshot,
  WorkspaceService,
} from './workspaceService';

const mockConnections: WarehouseConnection[] = [
  { id: 'conn-1', name: 'Production Warehouse', type: 'snowflake', database: 'RAW' },
  { id: 'conn-2', name: 'Analytics DB', type: 'bigquery', database: 'analytics' },
  { id: 'conn-3', name: 'Dev Redshift', type: 'redshift', database: 'dev' },
];

const mockWarehouseTablesByConnectionId: Record<string, WarehouseTable[]> = {
  'conn-1': [
    {
      database: 'RAW',
      schema: 'ERP',
      table: 'ORDERS',
      rowCount: 125000,
      columns: [
        { name: 'order_id', type: 'INTEGER', nullable: false },
        { name: 'customer_id', type: 'INTEGER', nullable: false },
        { name: 'order_date', type: 'DATE', nullable: false },
        { name: 'total_amount', type: 'DECIMAL', nullable: true },
      ],
    },
    {
      database: 'RAW',
      schema: 'ERP',
      table: 'CUSTOMERS',
      rowCount: 45000,
      columns: [
        { name: 'customer_id', type: 'INTEGER', nullable: false },
        { name: 'customer_name', type: 'VARCHAR', nullable: false },
        { name: 'email', type: 'VARCHAR', nullable: true },
      ],
    },
    {
      database: 'RAW',
      schema: 'ERP',
      table: 'PRODUCTS',
      rowCount: 3500,
      columns: [
        { name: 'product_id', type: 'INTEGER', nullable: false },
        { name: 'product_name', type: 'VARCHAR', nullable: false },
        { name: 'price', type: 'DECIMAL', nullable: false },
      ],
    },
    {
      database: 'RAW',
      schema: 'CRM',
      table: 'CONTACTS',
      rowCount: 89000,
      columns: [
        { name: 'contact_id', type: 'INTEGER', nullable: false },
        { name: 'account_id', type: 'INTEGER', nullable: false },
        { name: 'email', type: 'VARCHAR', nullable: true },
      ],
    },
    {
      database: 'RAW',
      schema: 'CRM',
      table: 'ACTIVITIES',
      rowCount: 230000,
      columns: [
        { name: 'activity_id', type: 'INTEGER', nullable: false },
        { name: 'contact_id', type: 'INTEGER', nullable: false },
        { name: 'activity_type', type: 'VARCHAR', nullable: false },
      ],
    },
    {
      database: 'RAW',
      schema: 'MARKETING',
      table: 'CAMPAIGNS',
      rowCount: 1200,
      columns: [
        { name: 'campaign_id', type: 'INTEGER', nullable: false },
        { name: 'campaign_name', type: 'VARCHAR', nullable: false },
        { name: 'channel', type: 'VARCHAR', nullable: false },
      ],
    },
    {
      database: 'RAW',
      schema: 'MARKETING',
      table: 'EVENTS',
      rowCount: 45000,
      columns: [
        { name: 'event_id', type: 'INTEGER', nullable: false },
        { name: 'campaign_id', type: 'INTEGER', nullable: false },
        { name: 'occurred_at', type: 'TIMESTAMP', nullable: false },
      ],
    },
  ],
  'conn-2': [
    {
      database: 'analytics',
      schema: 'public',
      table: 'sessions',
      rowCount: 920000,
      columns: [
        { name: 'session_id', type: 'STRING', nullable: false },
        { name: 'user_id', type: 'STRING', nullable: true },
      ],
    },
  ],
  'conn-3': [
    {
      database: 'dev',
      schema: 'sandbox',
      table: 'sample_orders',
      rowCount: 3000,
      columns: [
        { name: 'id', type: 'INTEGER', nullable: false },
        { name: 'amount', type: 'DECIMAL', nullable: false },
      ],
    },
  ],
};

let mockGraphSnapshot: WorkspaceGraphSnapshot = {
  nodes: [...mockNodes],
  edges: [...mockEdges],
};

function cloneGraphSnapshot(snapshot: WorkspaceGraphSnapshot): WorkspaceGraphSnapshot {
  return {
    nodes: snapshot.nodes.map((node) => ({
      ...node,
      tags: [...node.tags],
      dependencies: [...node.dependencies],
      columns: node.columns?.map((column) => ({ ...column })),
      config: node.config ? { ...node.config } : undefined,
    })),
    edges: snapshot.edges.map((edge) => ({ ...edge })),
  };
}

function toSourceNodeId(table: WarehouseTable): string {
  return `src_${table.schema.toLowerCase()}_${table.table.toLowerCase()}`;
}

function buildYamlFileName(table: WarehouseTable, groupingStrategy: SourceImportGrouping): string {
  const groupKey =
    groupingStrategy === 'database' ? table.database.toLowerCase() : table.schema.toLowerCase();
  return `models/sources/src_${groupKey}.yml`;
}

function createImportedSourceNode(
  table: WarehouseTable,
  groupingStrategy: SourceImportGrouping,
  includeColumns: boolean
): DbtNode {
  const schemaLower = table.schema.toLowerCase();
  const tableLower = table.table.toLowerCase();

  return {
    id: toSourceNodeId(table),
    name: toSourceNodeId(table),
    type: 'SOURCE',
    package: 'imported_sources',
    path: buildYamlFileName(table, groupingStrategy),
    tags: ['source', schemaLower],
    status: 'idle',
    description: `Imported source for ${table.database}.${table.schema}.${table.table}`,
    dependencies: [],
    columns: includeColumns
      ? table.columns?.map((column) => ({
          name: column.name,
          type: column.type,
          nullable: column.nullable,
        }))
      : undefined,
    config: {
      sourceName: schemaLower,
      tableName: tableLower,
      database: table.database,
      schema: table.schema,
    },
  };
}

function buildImportResult(
  input: ImportSourcesInput,
  importedNodes: DbtNode[]
): ImportSourcesResult {
  const yamlFiles = new Set<string>();
  for (const table of input.tables) {
    yamlFiles.add(buildYamlFileName(table, input.groupingStrategy));
  }

  return {
    success: true,
    sourcesCreated: importedNodes.length,
    tablesImported: input.tables.length,
    yamlFiles: Array.from(yamlFiles),
    grouping: input.groupingStrategy,
    options: {
      includeColumns: input.includeColumns,
      addTests: input.addTests,
      addFreshness: input.addFreshness,
    },
  };
}

function importMockSources(input: ImportSourcesInput): ImportSourcesResult {
  const existingNodeIds = new Set(mockGraphSnapshot.nodes.map((node) => node.id));
  const importedNodes: DbtNode[] = [];

  for (const table of input.tables) {
    const nodeId = toSourceNodeId(table);
    if (existingNodeIds.has(nodeId)) {
      continue;
    }

    importedNodes.push(
      createImportedSourceNode(table, input.groupingStrategy, input.includeColumns)
    );
    existingNodeIds.add(nodeId);
  }

  mockGraphSnapshot = {
    nodes: [...mockGraphSnapshot.nodes, ...importedNodes],
    edges: [...mockGraphSnapshot.edges],
  };

  return buildImportResult(input, importedNodes);
}

export function createMockWorkspaceService(): WorkspaceService {
  return {
    getGraphSnapshot: async () => cloneGraphSnapshot(mockGraphSnapshot),
    getDiffChanges: async () => mockDiffChanges,
    getPlugins: async () => mockPlugins,
    getRoles: async () => mockRoles,
    getAuditLog: async () => mockAuditLog,
    listWarehouseConnections: async () => mockConnections.map((connection) => ({ ...connection })),
    listWarehouseTables: async (connectionId) =>
      (mockWarehouseTablesByConnectionId[connectionId] ?? []).map((table) => ({
        ...table,
        columns: table.columns?.map((column) => ({ ...column })),
      })),
    importSources: async (input) => importMockSources(input),
  };
}
