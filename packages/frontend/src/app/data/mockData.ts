import { DbtNode, ExecutionPlan, DbtRun, Plugin, Role, AuditLogEntry, DiffResult } from '../types';

// Mock dbt nodes
export const mockNodes: DbtNode[] = [
  {
    id: 'source.erp.orders',
    uniqueId: 'source.erp.orders',
    name: 'src_erp_orders',
    type: 'SOURCE',
    packageName: 'analytics',
    path: 'models/sources.yml',
    tags: ['erp', 'raw'],
    status: 'success',
    dependencies: [],
  },
  {
    id: 'source.erp.stores',
    uniqueId: 'source.erp.stores',
    name: 'src_erp_stores',
    type: 'SOURCE',
    packageName: 'analytics',
    path: 'models/sources.yml',
    tags: ['erp', 'raw'],
    status: 'success',
    dependencies: [],
  },
  {
    id: 'model.analytics.stg_orders',
    uniqueId: 'model.analytics.stg_orders',
    name: 'stg_orders',
    type: 'MODEL',
    packageName: 'analytics',
    path: 'models/staging/stg_orders.sql',
    tags: ['staging'],
    status: 'success',
    lastDuration: 2300,
    lastCost: 0.15,
    config: { materialized: 'view' },
    compiledSql: `SELECT\n  order_id,\n  customer_id,\n  order_date,\n  order_amount,\n  status\nFROM {{ source('erp', 'orders') }}\nWHERE deleted_at IS NULL`,
    columns: [
      { name: 'order_id', type: 'INTEGER', nullable: false },
      { name: 'customer_id', type: 'INTEGER', nullable: false },
      { name: 'order_date', type: 'DATE', nullable: false },
      { name: 'order_amount', type: 'DECIMAL', nullable: false },
      { name: 'status', type: 'VARCHAR', nullable: true },
    ],
    tests: [
      { id: 'test_1', name: 'not_null_order_id', status: 'success' },
      { id: 'test_2', name: 'unique_order_id', status: 'success' },
    ],
    dependencies: ['source.erp.orders'],
  },
  {
    id: 'model.analytics.stg_stores',
    uniqueId: 'model.analytics.stg_stores',
    name: 'stg_stores',
    type: 'MODEL',
    packageName: 'analytics',
    path: 'models/staging/stg_stores.sql',
    tags: ['staging'],
    status: 'success',
    lastDuration: 1800,
    lastCost: 0.12,
    compiledSql: `SELECT\n  store_id,\n  store_name,\n  region,\n  opened_date\nFROM {{ source('erp', 'stores') }}`,
    columns: [
      { name: 'store_id', type: 'INTEGER', nullable: false },
      { name: 'store_name', type: 'VARCHAR', nullable: false },
      { name: 'region', type: 'VARCHAR', nullable: true },
      { name: 'opened_date', type: 'DATE', nullable: true },
    ],
    tests: [{ id: 'test_3', name: 'not_null_store_id', status: 'success' }],
    dependencies: ['source.erp.stores'],
  },
  {
    id: 'model.analytics.dim_store',
    uniqueId: 'model.analytics.dim_store',
    name: 'dim_store',
    type: 'MODEL',
    packageName: 'analytics',
    path: 'models/marts/dim_store.sql',
    tags: ['marts', 'dimension'],
    status: 'success',
    lastDuration: 3200,
    lastCost: 0.25,
    config: { materialized: 'table' },
    compiledSql: `SELECT\n  store_id,\n  store_name,\n  region,\n  opened_date,\n  CASE\n    WHEN region = 'WEST' THEN 'Pacific'\n    WHEN region = 'EAST' THEN 'Atlantic'\n    ELSE 'Central'\n  END as region_group\nFROM {{ ref('stg_stores') }}`,
    columns: [
      { name: 'store_id', type: 'INTEGER', nullable: false },
      { name: 'store_name', type: 'VARCHAR', nullable: false },
      { name: 'region', type: 'VARCHAR', nullable: true },
      { name: 'region_group', type: 'VARCHAR', nullable: false },
      { name: 'opened_date', type: 'DATE', nullable: true },
    ],
    dependencies: ['model.analytics.stg_stores'],
  },
  {
    id: 'model.analytics.fct_sales',
    uniqueId: 'model.analytics.fct_sales',
    name: 'fct_sales',
    type: 'MODEL',
    packageName: 'analytics',
    path: 'models/marts/fct_sales.sql',
    tags: ['marts', 'fact'],
    status: 'success',
    lastDuration: 5400,
    lastCost: 0.42,
    config: { materialized: 'incremental' },
    compiledSql: `SELECT\n  o.order_id,\n  o.customer_id,\n  o.order_date,\n  o.order_amount,\n  s.store_id,\n  s.region_group\nFROM {{ ref('stg_orders') }} o\nLEFT JOIN {{ ref('dim_store') }} s\n  ON o.store_id = s.store_id`,
    columns: [
      { name: 'order_id', type: 'INTEGER', nullable: false },
      { name: 'customer_id', type: 'INTEGER', nullable: false },
      { name: 'order_date', type: 'DATE', nullable: false },
      { name: 'order_amount', type: 'DECIMAL', nullable: false },
      { name: 'store_id', type: 'INTEGER', nullable: true },
      { name: 'region_group', type: 'VARCHAR', nullable: true },
    ],
    dependencies: ['model.analytics.stg_orders', 'model.analytics.dim_store'],
  },
  {
    id: 'test.analytics.test_not_null_store_id',
    uniqueId: 'test.analytics.test_not_null_store_id',
    name: 'test_not_null_store_id',
    type: 'TEST',
    packageName: 'analytics',
    path: 'tests/not_null_store_id.sql',
    tags: ['test'],
    status: 'success',
    lastDuration: 450,
    dependencies: ['model.analytics.dim_store'],
  },
  {
    id: 'exposure.analytics.powerbi_sales',
    uniqueId: 'exposure.analytics.powerbi_sales',
    name: 'exposure_powerbi_sales',
    type: 'EXPOSURE',
    packageName: 'analytics',
    path: 'models/exposures.yml',
    tags: ['powerbi'],
    status: 'success',
    dependencies: ['model.analytics.fct_sales'],
  },
];

// Mock execution plan
export const mockExecutionPlan: ExecutionPlan = {
  planId: 'plan_abc123def456',
  planVersion: '1.0',
  generatedAt: '2026-02-13T10:30:00Z',
  adapter: 'snowflake',
  target: 'dev',
  estimatedCost: 0.94,
  estimatedDuration: 12500,
  steps: [
    {
      id: 'step_1',
      type: 'DBT_COMPILE',
      nodes: [
        'model.analytics.stg_orders',
        'model.analytics.stg_stores',
        'model.analytics.dim_store',
        'model.analytics.fct_sales',
      ],
      policies: {
        retries: 0,
        timeout: 300,
        concurrency: 1,
      },
    },
    {
      id: 'step_2',
      type: 'DBT_RUN',
      nodes: ['model.analytics.stg_orders', 'model.analytics.stg_stores'],
      policies: {
        retries: 2,
        timeout: 600,
        concurrency: 4,
        warehouse: 'COMPUTE_WH',
      },
    },
    {
      id: 'step_3',
      type: 'DBT_RUN',
      nodes: ['model.analytics.dim_store', 'model.analytics.fct_sales'],
      policies: {
        retries: 2,
        timeout: 900,
        concurrency: 2,
        warehouse: 'COMPUTE_WH',
      },
    },
    {
      id: 'step_4',
      type: 'DBT_TEST',
      nodes: ['test.analytics.test_not_null_store_id'],
      policies: {
        retries: 1,
        timeout: 300,
        concurrency: 4,
      },
    },
  ],
};

// Mock run
export const mockRun: DbtRun = {
  runId: 'run_xyz789abc123',
  status: 'running',
  environment: 'dev',
  gitSha: 'a1b2c3d4',
  gitBranch: 'feature/sales-dashboard',
  startedAt: '2026-02-13T10:35:00Z',
  duration: 5200,
  steps: [
    {
      id: 'step_1',
      type: 'DBT_COMPILE',
      nodes: [
        'model.analytics.stg_orders',
        'model.analytics.stg_stores',
        'model.analytics.dim_store',
        'model.analytics.fct_sales',
      ],
      policies: { retries: 0, timeout: 300, concurrency: 1 },
      status: 'success',
      startedAt: '2026-02-13T10:35:00Z',
      completedAt: '2026-02-13T10:35:12Z',
      duration: 1200,
    },
    {
      id: 'step_2',
      type: 'DBT_RUN',
      nodes: ['model.analytics.stg_orders', 'model.analytics.stg_stores'],
      policies: { retries: 2, timeout: 600, concurrency: 4, warehouse: 'COMPUTE_WH' },
      status: 'running',
      startedAt: '2026-02-13T10:35:12Z',
      duration: 4000,
    },
  ],
  events: [
    {
      id: 'evt_1',
      timestamp: '2026-02-13T10:35:00Z',
      type: 'StepStarted',
      message: 'Starting compilation step',
      stepId: 'step_1',
    },
    {
      id: 'evt_2',
      timestamp: '2026-02-13T10:35:12Z',
      type: 'StepCompleted',
      message: 'Compilation completed successfully',
      stepId: 'step_1',
    },
    {
      id: 'evt_3',
      timestamp: '2026-02-13T10:35:12Z',
      type: 'StepStarted',
      message: 'Starting run step for staging models',
      stepId: 'step_2',
    },
    {
      id: 'evt_4',
      timestamp: '2026-02-13T10:35:14Z',
      type: 'NodeStarted',
      message: 'Running stg_orders',
      stepId: 'step_2',
      nodeId: 'model.analytics.stg_orders',
    },
    {
      id: 'evt_5',
      timestamp: '2026-02-13T10:35:16Z',
      type: 'NodeCompleted',
      message: 'stg_orders completed (2.3s)',
      stepId: 'step_2',
      nodeId: 'model.analytics.stg_orders',
    },
  ],
};

// Mock plugins
export const mockPlugins: Plugin[] = [
  {
    id: 'plugin_cost_oracle',
    name: 'Cost Oracle',
    version: '1.2.0',
    description: 'Advanced cost estimation and tracking for dbt models',
    capabilities: ['cost_policies', 'panels'],
    permissionsRequested: ['read:runs', 'read:catalog'],
    enabled: true,
    installedAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'plugin_data_quality',
    name: 'Data Quality Suite',
    version: '2.0.1',
    description: 'Extended data quality tests and validators',
    capabilities: ['validators', 'custom_nodes'],
    permissionsRequested: ['read:manifest', 'write:tests'],
    enabled: true,
    installedAt: '2026-01-20T10:30:00Z',
  },
  {
    id: 'plugin_lineage_plus',
    name: 'Lineage Plus',
    version: '0.9.5',
    description: 'Enhanced column-level lineage visualization',
    capabilities: ['panels'],
    permissionsRequested: ['read:catalog', 'read:manifest'],
    enabled: false,
    installedAt: '2026-02-01T14:20:00Z',
  },
];

// Mock roles
export const mockRoles: Role[] = [
  {
    id: 'role_admin',
    name: 'Admin',
    description: 'Full access to all resources',
    permissions: [
      {
        resource: '*',
        actions: ['read', 'plan', 'run', 'edit'],
        scope: {},
      },
    ],
  },
  {
    id: 'role_developer',
    name: 'Developer',
    description: 'Can plan and run in dev environment',
    permissions: [
      {
        resource: 'models',
        actions: ['read', 'plan', 'run'],
        scope: { environment: 'dev' },
      },
      {
        resource: 'tests',
        actions: ['read', 'plan', 'run'],
        scope: { environment: 'dev' },
      },
    ],
  },
  {
    id: 'role_viewer',
    name: 'Viewer',
    description: 'Read-only access',
    permissions: [
      {
        resource: '*',
        actions: ['read'],
        scope: {},
      },
    ],
  },
];

// Mock audit log
export const mockAuditLog: AuditLogEntry[] = [
  {
    id: 'audit_1',
    timestamp: '2026-02-13T10:35:00Z',
    userId: 'user_123',
    userName: 'alice@company.com',
    action: 'run.started',
    resource: 'run_xyz789abc123',
    details: 'Started run in dev environment',
  },
  {
    id: 'audit_2',
    timestamp: '2026-02-13T10:30:00Z',
    userId: 'user_123',
    userName: 'alice@company.com',
    action: 'plan.created',
    resource: 'plan_abc123def456',
    details: 'Created execution plan for 4 models',
  },
  {
    id: 'audit_3',
    timestamp: '2026-02-13T09:15:00Z',
    userId: 'user_456',
    userName: 'bob@company.com',
    action: 'plugin.enabled',
    resource: 'plugin_cost_oracle',
    details: 'Enabled Cost Oracle plugin',
  },
];

// Mock diff
export const mockDiff: DiffResult = {
  diffId: 'diff_a1b2c3_d4e5f6',
  shaA: 'a1b2c3d4',
  shaB: 'd4e5f6g7',
  nodesAdded: ['model.analytics.dim_customer'],
  nodesRemoved: [],
  nodesChanged: [
    {
      nodeId: 'model.analytics.fct_sales',
      sqlChanged: true,
      configChanged: false,
    },
  ],
  catalogDiff: [
    {
      nodeId: 'model.analytics.fct_sales',
      columnsAdded: ['discount_amount'],
      columnsRemoved: [],
      typeChanges: [
        {
          column: 'order_amount',
          oldType: 'DECIMAL(10,2)',
          newType: 'DECIMAL(12,2)',
        },
      ],
    },
  ],
};
