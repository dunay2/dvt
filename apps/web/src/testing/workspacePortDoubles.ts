/** Owned concern: provide test-only workspace capability ports backed by fixture state. */
import { buildRelationalSourceObjectId } from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';

import {
  mockAuditLog,
  mockDiffChanges,
  mockEdges,
  mockNodes,
  mockPlugins,
  mockRoles,
} from './fixtures/mockDbtData';
import type { DbtNode } from '../app/types/dbt';
import {
  buildSourceImportRegistryPath,
  toStableSourceImportIdentifierPart,
} from '../app/components/sourceImportWizard/sourceImportWizardModel';
import type {
  FileContent,
  ImportSourcesInput,
  ImportSourcesResult,
  IWarehouseSourceImportPort,
  IWorkspaceAdminReadPort,
  IWorkspaceDiffQueryPort,
  IWorkspaceFileContentCommandPort,
  IWorkspaceFileHistoryQueryPort,
  IWorkspaceFilesQueryPort,
  IWorkspaceGraphSnapshotQueryPort,
  IWorkspacePluginCatalogQueryPort,
  SourceObjectMetricEvidence,
  SourceObjectColumn,
  RelationalSourceObject,
  SourceImportGrouping,
  WarehouseConnection,
  WorkspaceFileEntry,
  WorkspaceFileHistoryEntry,
  WorkspaceGraphSnapshot,
} from '../app/ports/workspace';
import {
  WorkspaceFileLoadError,
  WorkspaceFileRevisionConflictError,
} from '../app/services/workspace/workspaceErrors';

export const mockGraphDraftAuthoringAuthority = {
  kind: 'resolved',
  binding: {
    schemaVersion: 'canvas-authoring-authority-binding.v1',
    canvasId: 'main-canvas',
    authority: { kind: 'graph-draft' },
  },
} as const;

const mockConnections: WarehouseConnection[] = [
  { id: 'conn-1', name: 'Production Postgres', type: 'postgres', database: 'RAW' },
  { id: 'conn-2', name: 'Analytics Postgres', type: 'postgres', database: 'analytics' },
  { id: 'conn-3', name: 'Dev Postgres', type: 'postgres', database: 'dev' },
];

function sourceMetricEvidence(rowCount: number, byteSize: number): SourceObjectMetricEvidence {
  return {
    observedAt: '2026-07-10T21:00:00.000Z',
    observationScope: { kind: 'snapshot' },
    rowCount: {
      value: rowCount,
      provenance: 'estimated',
      method: 'provider-statistics',
      confidence: 'medium',
    },
    byteSize: {
      value: byteSize,
      provenance: 'measured',
      method: 'provider-storage-metadata',
      confidence: 'exact',
      basis: 'physical-allocation',
    },
  };
}

type MockRelationDefinition = Readonly<{
  database: string;
  schema: string;
  table: string;
  metricEvidence: SourceObjectMetricEvidence;
  columns?: readonly SourceObjectColumn[];
}>;

const mockRelationDefinitionsByConnectionId: Record<string, MockRelationDefinition[]> = {
  'conn-1': [
    {
      database: 'RAW',
      schema: 'ERP',
      table: 'ORDERS',
      metricEvidence: sourceMetricEvidence(125000, 18_200_000),
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
      metricEvidence: sourceMetricEvidence(45000, 8_700_000),
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
      metricEvidence: sourceMetricEvidence(3500, 1_100_000),
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
      metricEvidence: sourceMetricEvidence(89000, 12_400_000),
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
      metricEvidence: sourceMetricEvidence(230000, 42_000_000),
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
      metricEvidence: sourceMetricEvidence(1200, 640_000),
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
      metricEvidence: sourceMetricEvidence(45000, 6_800_000),
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
      metricEvidence: sourceMetricEvidence(920000, 128_000_000),
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
      metricEvidence: sourceMetricEvidence(3000, 920_000),
      columns: [
        { name: 'id', type: 'INTEGER', nullable: false },
        { name: 'amount', type: 'DECIMAL', nullable: false },
      ],
    },
  ],
};

const defaultGraphSnapshot: WorkspaceGraphSnapshot = {
  nodes: [...mockNodes],
  edges: [...mockEdges],
  authoringAuthority: mockGraphDraftAuthoringAuthority,
};

function cloneGraphSnapshot(snapshot: WorkspaceGraphSnapshot): WorkspaceGraphSnapshot {
  return {
    authoringAuthority: snapshot.authoringAuthority,
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

function cloneWorkspaceFileEntries(entries: WorkspaceFileEntry[]): WorkspaceFileEntry[] {
  return entries.map((entry) => ({
    ...entry,
    children: entry.children ? cloneWorkspaceFileEntries(entry.children) : undefined,
  }));
}

function cloneFileContent(file: FileContent): FileContent {
  return { ...file };
}

function cloneFileContents(fileContents: Record<string, FileContent>): Record<string, FileContent> {
  return Object.fromEntries(
    Object.entries(fileContents).map(([path, file]) => [path, cloneFileContent(file)])
  );
}

function ensureWorkspaceDirectoryChildren(directory: WorkspaceFileEntry): WorkspaceFileEntry[] {
  directory.children ??= [];
  return directory.children;
}

export interface MockWorkspaceState {
  graphSnapshot: WorkspaceGraphSnapshot;
  fileTree: WorkspaceFileEntry[];
  fileContents: Record<string, FileContent>;
  fileHistory: Record<string, WorkspaceFileHistoryEntry[]>;
}

export function createMockWorkspaceState(): MockWorkspaceState {
  return {
    graphSnapshot: cloneGraphSnapshot(defaultGraphSnapshot),
    fileTree: createDefaultWorkspaceFileTree(),
    fileContents: cloneFileContents(defaultFileContents),
    fileHistory: {},
  };
}

function ensureWorkspaceFileEntry(entries: WorkspaceFileEntry[], path: string): void {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) {
    return;
  }

  let currentEntries = entries;
  let currentPath = '';

  for (const segment of segments.slice(0, -1)) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    let directory = currentEntries.find(
      (entry) => entry.kind === 'directory' && entry.path === currentPath
    );

    if (!directory) {
      directory = {
        path: currentPath,
        name: segment,
        kind: 'directory',
        children: [],
      };
      currentEntries.push(directory);
    }

    currentEntries = ensureWorkspaceDirectoryChildren(directory);
  }

  const fileName = segments.at(-1) ?? path;
  if (currentEntries.some((entry) => entry.path === path)) {
    return;
  }

  currentEntries.push({
    path,
    name: fileName,
    kind: 'file',
  });
}

function createDefaultWorkspaceFileTree(): WorkspaceFileEntry[] {
  const fileTree = cloneWorkspaceFileEntries(mockFileTree);
  for (const path of Object.keys(defaultFileContents)) {
    ensureWorkspaceFileEntry(fileTree, path);
  }
  return fileTree;
}

function toSourceNodeId(sourceObject: RelationalSourceObject): string {
  return `src_${toStableSourceImportIdentifierPart(sourceObject.locator.schema)}_${toStableSourceImportIdentifierPart(
    sourceObject.locator.name
  )}`;
}

function buildYamlFileName(
  sourceObject: RelationalSourceObject,
  groupingStrategy: SourceImportGrouping
): string {
  return buildSourceImportRegistryPath(sourceObject, groupingStrategy);
}

function createImportedSourceNode(
  sourceObject: RelationalSourceObject,
  groupingStrategy: SourceImportGrouping,
  includeColumns: boolean
): DbtNode {
  const schemaLower = sourceObject.locator.schema.toLowerCase();
  const tableLower = sourceObject.locator.name.toLowerCase();

  return {
    id: toSourceNodeId(sourceObject),
    name: toSourceNodeId(sourceObject),
    type: 'SOURCE',
    package: 'imported_sources',
    path: buildYamlFileName(sourceObject, groupingStrategy),
    tags: ['source', schemaLower],
    status: 'idle',
    description: `Imported source for ${sourceObject.locator.catalog}.${sourceObject.locator.schema}.${sourceObject.locator.name}`,
    dependencies: [],
    metadata: {
      sourceObjectId: sourceObject.objectId,
      database: sourceObject.locator.catalog,
      schema: sourceObject.locator.schema,
      tableName: tableLower,
      sourceMetricEvidence: sourceObject.metricEvidence,
      ...(includeColumns && sourceObject.columns
        ? {
            columns: sourceObject.columns.map((column) => ({
              name: column.name,
              type: column.type,
              nullable: column.nullable,
            })),
          }
        : {}),
    },
    columns: includeColumns
      ? sourceObject.columns?.map((column) => ({
          name: column.name,
          type: column.type,
          nullable: column.nullable,
        }))
      : undefined,
    config: {
      sourceName: schemaLower,
      tableName: tableLower,
      database: sourceObject.locator.catalog,
      schema: sourceObject.locator.schema,
    },
  };
}

function buildImportResult(
  input: ImportSourcesInput,
  selectedSourceObjects: readonly RelationalSourceObject[],
  _importedNodes: DbtNode[]
): ImportSourcesResult {
  const yamlFiles = new Set<string>();
  for (const sourceObject of selectedSourceObjects) {
    yamlFiles.add(buildYamlFileName(sourceObject, input.groupingStrategy));
  }
  const importedNodeIds = selectedSourceObjects.map(toSourceNodeId);

  return {
    schemaVersion: 'source-import-result.v2',
    success: true,
    idempotencyKey: input.idempotencyKey,
    authorityBinding: {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: input.canvasId,
      authority: { kind: 'graph-draft' },
    },
    sourcesCreated: yamlFiles.size,
    objectsImported: input.objects.length,
    yamlFiles: Array.from(yamlFiles),
    grouping: input.groupingStrategy,
    options: {
      includeColumns: input.includeColumns,
      addTests: input.addTests,
      addFreshness: input.addFreshness,
    },
    outcome: {
      kind: 'graph-draft',
      draftRevision: 'mock-source-import-revision',
      importedNodeIds,
    },
  };
}

function importMockSources(
  state: MockWorkspaceState,
  input: ImportSourcesInput
): ImportSourcesResult {
  const existingNodeIds = new Set(state.graphSnapshot.nodes.map((node) => node.id));
  const importedNodes: DbtNode[] = [];
  const availableSourceObjects = (
    mockRelationDefinitionsByConnectionId[input.connectionId] ?? []
  ).map(toMockSourceObject);
  const selectedSourceObjects: RelationalSourceObject[] = [];

  for (const selection of input.objects) {
    const sourceObject = availableSourceObjects.find(
      (candidate) => candidate.objectId === selection.objectId
    );
    if (sourceObject == null) {
      continue;
    }
    selectedSourceObjects.push(sourceObject);
    const nodeId = toSourceNodeId(sourceObject);
    if (existingNodeIds.has(nodeId)) {
      continue;
    }

    importedNodes.push(
      createImportedSourceNode(sourceObject, input.groupingStrategy, input.includeColumns)
    );
    existingNodeIds.add(nodeId);
  }

  state.graphSnapshot = {
    authoringAuthority: state.graphSnapshot.authoringAuthority,
    nodes: [...state.graphSnapshot.nodes, ...importedNodes],
    edges: [...state.graphSnapshot.edges],
  };

  return buildImportResult(input, selectedSourceObjects, importedNodes);
}

function toMockSourceObject(definition: MockRelationDefinition): RelationalSourceObject {
  const locator = {
    kind: 'relation' as const,
    catalog: definition.database,
    schema: definition.schema,
    name: definition.table,
    relationType: 'table' as const,
  };
  return {
    objectId: buildRelationalSourceObjectId(locator),
    displayName: definition.table,
    locator,
    metricEvidence: definition.metricEvidence,
    ...(definition.columns ? { columns: [...definition.columns] } : {}),
  };
}

const mockFileTree: WorkspaceFileEntry[] = [
  {
    path: 'models',
    name: 'models',
    kind: 'directory',
    children: [
      {
        path: 'models/staging',
        name: 'staging',
        kind: 'directory',
        children: [
          { path: 'models/staging/stg_orders.sql', name: 'stg_orders.sql', kind: 'file' },
          { path: 'models/staging/stg_customers.sql', name: 'stg_customers.sql', kind: 'file' },
        ],
      },
      {
        path: 'models/marts',
        name: 'marts',
        kind: 'directory',
        children: [{ path: 'models/marts/dim_store.sql', name: 'dim_store.sql', kind: 'file' }],
      },
    ],
  },
  {
    path: 'target',
    name: 'target',
    kind: 'directory',
    children: [
      { path: 'target/manifest.json', name: 'manifest.json', kind: 'file' },
      { path: 'target/run_results.json', name: 'run_results.json', kind: 'file' },
      { path: 'target/catalog.json', name: 'catalog.json', kind: 'file' },
    ],
  },
  {
    path: 'pipelines',
    name: 'pipelines',
    kind: 'directory',
    children: [
      { path: 'pipelines/sales_pipeline.yaml', name: 'sales_pipeline.yaml', kind: 'file' },
    ],
  },
  { path: 'README.md', name: 'README.md', kind: 'file' },
];

const defaultFileContentSeeds: Record<string, Omit<FileContent, 'contentSha256'>> = {
  'models/staging/stg_orders.sql': {
    path: 'models/staging/stg_orders.sql',
    name: 'stg_orders.sql',
    language: 'sql',
    content: [
      'WITH source AS (',
      '    SELECT * FROM {{ source("erp", "orders") }}',
      '),',
      '',
      'renamed AS (',
      '    SELECT',
      '        order_id,',
      '        customer_id,',
      '        order_date,',
      '        total_amount',
      '    FROM source',
      ')',
      '',
      'SELECT * FROM renamed',
    ].join('\n'),
    lastModified: '2026-04-05T14:22:00.000Z',
  },
  'models/staging/stg_customers.sql': {
    path: 'models/staging/stg_customers.sql',
    name: 'stg_customers.sql',
    language: 'sql',
    content: [
      'WITH source AS (',
      '    SELECT * FROM {{ source("erp", "customers") }}',
      '),',
      '',
      'renamed AS (',
      '    SELECT',
      '        customer_id,',
      '        customer_name,',
      '        email',
      '    FROM source',
      ')',
      '',
      'SELECT * FROM renamed',
    ].join('\n'),
    lastModified: '2026-04-05T12:10:00.000Z',
  },
  'models/marts/dim_store.sql': {
    path: 'models/marts/dim_store.sql',
    name: 'dim_store.sql',
    language: 'sql',
    content: [
      'SELECT',
      '    o.order_id,',
      '    c.customer_name,',
      '    o.order_date,',
      '    o.total_amount',
      'FROM {{ ref("stg_orders") }} AS o',
      'JOIN {{ ref("stg_customers") }} AS c',
      '    ON o.customer_id = c.customer_id',
    ].join('\n'),
    lastModified: '2026-04-06T09:00:00.000Z',
  },
  'models/marts/fct_sales.sql': {
    path: 'models/marts/fct_sales.sql',
    name: 'fct_sales.sql',
    language: 'sql',
    content: [
      'SELECT',
      '    o.order_id,',
      '    o.customer_id,',
      '    o.order_date,',
      '    s.store_id,',
      '    o.total_amount',
      'FROM {{ ref("stg_orders") }} AS o',
      'LEFT JOIN {{ ref("dim_store") }} AS s',
      '    ON o.store_id = s.store_id',
    ].join('\n'),
    lastModified: '2026-04-06T09:10:00.000Z',
  },
  'pipelines/sales_pipeline.yaml': {
    path: 'pipelines/sales_pipeline.yaml',
    name: 'sales_pipeline.yaml',
    language: 'yaml',
    content: [
      'name: sales_pipeline',
      'version: "1.0"',
      '',
      'steps:',
      '  - id: extract_orders',
      '    type: source',
      '    source: erp.orders',
      '',
      '  - id: stage_orders',
      '    type: sql',
      '    file: models/staging/stg_orders.sql',
      '    depends_on: [extract_orders]',
      '',
      '  - id: build_dim_store',
      '    type: sql',
      '    file: models/marts/dim_store.sql',
      '    depends_on: [stage_orders]',
    ].join('\n'),
    lastModified: '2026-04-04T16:30:00.000Z',
  },
  'target/manifest.json': {
    path: 'target/manifest.json',
    name: 'manifest.json',
    language: 'json',
    content: JSON.stringify(
      {
        metadata: {
          dbt_schema_version: 'https://schemas.getdbt.com/dbt/manifest/v11.json',
          dbt_version: '1.8.0',
          generated_at: '2026-04-06T09:30:00.000Z',
        },
        nodes: {
          'model.dbt_analytics.fct_sales': {
            unique_id: 'model.dbt_analytics.fct_sales',
            name: 'fct_sales',
            resource_type: 'model',
            path: 'models/marts/fct_sales.sql',
          },
        },
      },
      null,
      2
    ),
    lastModified: '2026-04-06T09:30:00.000Z',
  },
  'target/run_results.json': {
    path: 'target/run_results.json',
    name: 'run_results.json',
    language: 'json',
    content: JSON.stringify(
      {
        metadata: {
          dbt_schema_version: 'https://schemas.getdbt.com/dbt/run-results/v5.json',
          generated_at: '2026-04-06T09:31:00.000Z',
        },
        results: [
          {
            unique_id: 'model.dbt_analytics.fct_sales',
            status: 'success',
            execution_time: 12.4,
          },
        ],
      },
      null,
      2
    ),
    lastModified: '2026-04-06T09:31:00.000Z',
  },
  'target/catalog.json': {
    path: 'target/catalog.json',
    name: 'catalog.json',
    language: 'json',
    content: JSON.stringify(
      {
        metadata: {
          dbt_schema_version: 'https://schemas.getdbt.com/dbt/catalog/v1.json',
          generated_at: '2026-04-06T09:32:00.000Z',
        },
        nodes: {
          'model.dbt_analytics.fct_sales': {
            metadata: {
              schema: 'analytics',
              name: 'fct_sales',
              type: 'table',
            },
          },
        },
      },
      null,
      2
    ),
    lastModified: '2026-04-06T09:32:00.000Z',
  },
  'README.md': {
    path: 'README.md',
    name: 'README.md',
    language: 'markdown',
    content: [
      '# DVT Workspace',
      '',
      'This workspace contains the data transformation pipeline.',
      '',
      '## Structure',
      '',
      '- `models/staging/` - Staging models',
      '- `models/marts/` - Business-layer models',
      '- `pipelines/` - Pipeline definitions',
    ].join('\n'),
    lastModified: '2026-04-01T10:00:00.000Z',
  },
};

const defaultFileContents: Record<string, FileContent> = Object.fromEntries(
  Object.entries(defaultFileContentSeeds).map(([path, file]) => [
    path,
    { ...file, contentSha256: sha256HexUtf8(file.content) },
  ])
);

function inferLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const langMap: Record<string, string> = {
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
    py: 'python',
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    json: 'json',
    md: 'markdown',
  };
  return langMap[ext] ?? 'plaintext';
}

export type MockWorkspacePorts = {
  readonly workspaceGraphSnapshotQuery: IWorkspaceGraphSnapshotQueryPort;
  readonly workspaceDiffQuery: IWorkspaceDiffQueryPort;
  readonly workspacePluginCatalogQuery: IWorkspacePluginCatalogQueryPort;
  readonly workspaceAdminRead: IWorkspaceAdminReadPort;
  readonly warehouseSourceImport: IWarehouseSourceImportPort;
  readonly workspaceFilesQuery: IWorkspaceFilesQueryPort;
  readonly workspaceFileHistoryQuery: IWorkspaceFileHistoryQueryPort;
  readonly workspaceFileContentCommand: IWorkspaceFileContentCommandPort;
};

export function createMockWorkspaceGraphSnapshotQueryPort(
  state: MockWorkspaceState = createMockWorkspaceState()
): IWorkspaceGraphSnapshotQueryPort {
  return {
    getGraphSnapshot: async () => cloneGraphSnapshot(state.graphSnapshot),
  };
}

export function createMockWorkspaceDiffQueryPort(): IWorkspaceDiffQueryPort {
  return {
    getDiffChanges: async () => mockDiffChanges,
  };
}

export function createMockWorkspacePluginCatalogQueryPort(): IWorkspacePluginCatalogQueryPort {
  return {
    getPlugins: async () => mockPlugins,
  };
}

export function createMockWorkspaceAdminReadPort(): IWorkspaceAdminReadPort {
  return {
    getRoles: async () => mockRoles,
    getAuditLog: async () => mockAuditLog,
  };
}

export function createMockWarehouseSourceImportPort(
  state: MockWorkspaceState = createMockWorkspaceState()
): IWarehouseSourceImportPort {
  return {
    listWarehouseConnections: async () => mockConnections.map((connection) => ({ ...connection })),
    listSourceObjects: async (connectionId) =>
      (mockRelationDefinitionsByConnectionId[connectionId] ?? []).map(toMockSourceObject),
    createWarehouseConnection: async (input) => ({
      id: toMockWarehouseConnectionId(input.name),
      name: input.name,
      type: input.type,
      database: input.database,
    }),
    renameWarehouseConnection: async (connectionId, input) => {
      const connection = mockConnections.find((candidate) => candidate.id === connectionId);
      if (!connection) throw new Error(`Mock warehouse connection not found: ${connectionId}`);
      return { ...connection, name: input.name };
    },
    testWarehouseConnection: async (connectionId) => ({
      connectionId,
      status: 'passed',
      checkedAt: '2026-06-08T00:00:00.000Z',
      objectCount: mockRelationDefinitionsByConnectionId[connectionId]?.length ?? 0,
    }),
    validatePostgresTransformSql: async () => ({ status: 'valid' }),
    importSources: async (input) => importMockSources(state, input),
  };
}

function toMockWarehouseConnectionId(name: string): string {
  let connectionId = '';
  let previousWasSeparator = false;

  for (const char of name.trim().toLowerCase()) {
    const isAllowed = (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9');
    if (isAllowed) {
      connectionId += char;
      previousWasSeparator = false;
      continue;
    }

    if (connectionId.length > 0 && !previousWasSeparator) {
      connectionId += '-';
      previousWasSeparator = true;
    }
  }

  if (connectionId.endsWith('-')) {
    connectionId = connectionId.slice(0, -1);
  }

  return connectionId || 'warehouse-connection';
}

export function createMockWorkspaceFilesQueryPort(
  state: MockWorkspaceState = createMockWorkspaceState()
): IWorkspaceFilesQueryPort {
  return {
    listFiles: async () => cloneWorkspaceFileEntries(state.fileTree),
    getFileContent: async (path) => {
      const file = state.fileContents[path];
      if (!file) {
        throw new WorkspaceFileLoadError('not_found', path);
      }
      return cloneFileContent(file);
    },
  };
}

export function createMockWorkspaceFileHistoryQueryPort(
  state: MockWorkspaceState = createMockWorkspaceState()
): IWorkspaceFileHistoryQueryPort {
  return {
    getFileHistory: async (path) => state.fileHistory[path]?.map((entry) => ({ ...entry })) ?? [],
  };
}

export function createMockWorkspaceFileContentCommandPort(
  state: MockWorkspaceState = createMockWorkspaceState()
): IWorkspaceFileContentCommandPort {
  return {
    saveFileContent: async (input) => {
      const existing = state.fileContents[input.path];
      const contentSha256 = sha256HexUtf8(input.content);
      if (existing?.contentSha256 === contentSha256) {
        return {
          kind: 'unchanged',
          disposition: null,
          path: existing.path,
          contentSha256: existing.contentSha256,
          lastModified: existing.lastModified,
        };
      }
      const revisionMatches =
        input.expectedRevision.kind === 'absent'
          ? existing == null
          : existing?.contentSha256 === input.expectedRevision.value;
      if (!revisionMatches) {
        throw new WorkspaceFileRevisionConflictError(input.path);
      }

      const name = input.path.split('/').pop() ?? input.path;
      const updated: FileContent = {
        path: input.path,
        name,
        language: existing?.language ?? inferLanguage(input.path),
        content: input.content,
        contentSha256,
        lastModified: new Date().toISOString(),
      };
      state.fileContents[input.path] = updated;
      ensureWorkspaceFileEntry(state.fileTree, input.path);
      return {
        kind: 'saved',
        disposition: existing ? 'updated' : 'created',
        path: updated.path,
        contentSha256: updated.contentSha256,
        lastModified: updated.lastModified,
      };
    },
  };
}

export function createMockWorkspacePorts(
  state: MockWorkspaceState = createMockWorkspaceState()
): MockWorkspacePorts {
  return {
    workspaceGraphSnapshotQuery: createMockWorkspaceGraphSnapshotQueryPort(state),
    workspaceDiffQuery: createMockWorkspaceDiffQueryPort(),
    workspacePluginCatalogQuery: createMockWorkspacePluginCatalogQueryPort(),
    workspaceAdminRead: createMockWorkspaceAdminReadPort(),
    warehouseSourceImport: createMockWarehouseSourceImportPort(state),
    workspaceFilesQuery: createMockWorkspaceFilesQueryPort(state),
    workspaceFileHistoryQuery: createMockWorkspaceFileHistoryQueryPort(state),
    workspaceFileContentCommand: createMockWorkspaceFileContentCommandPort(state),
  };
}
