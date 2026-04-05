import type { ArtifactPreview } from './types';

export const SERVER_ARTIFACTS: ArtifactPreview[] = [
  {
    type: 'manifest.json',
    description: 'Complete project manifest including models, sources, and tests',
    size: '245 KB',
    lastUpdated: '2026-02-13T10:35:00Z',
    gitSha: 'a3f2b91',
  },
  {
    type: 'run_results.json',
    description: 'Results from the latest run execution',
    size: '89 KB',
    lastUpdated: '2026-02-13T10:35:00Z',
    gitSha: 'a3f2b91',
  },
  {
    type: 'catalog.json',
    description: 'Database catalog with column metadata',
    size: '156 KB',
    lastUpdated: '2026-02-13T10:35:00Z',
    gitSha: 'a3f2b91',
  },
];

export const DEFAULT_MANIFEST_PREVIEW = {
  metadata: {
    dbt_schema_version: 'https://schemas.getdbt.com/dbt/manifest/v11.json',
    dbt_version: '1.7.0',
    generated_at: '2026-02-13T10:35:00Z',
    invocation_id: 'abc123def456',
    env: { DBT_CLOUD_PROJECT_ID: '12345' },
  },
  nodes: {
    'model.dbt_analytics.fct_sales': {
      unique_id: 'model.dbt_analytics.fct_sales',
      name: 'fct_sales',
      resource_type: 'model',
      package_name: 'dbt_analytics',
      path: 'marts/fct_sales.sql',
      materialized: 'table',
    },
  },
};

export const RUN_RESULTS_PREVIEW = {
  metadata: {
    dbt_schema_version: 'https://schemas.getdbt.com/dbt/run-results/v5.json',
    invocation_id: 'abc123def456',
    env: {},
  },
  results: [
    {
      unique_id: 'model.dbt_analytics.fct_sales',
      status: 'success',
      execution_time: 15.234,
      message: null,
    },
  ],
  elapsed_time: 45.67,
};

export const CATALOG_PREVIEW = {
  metadata: {
    dbt_schema_version: 'https://schemas.getdbt.com/dbt/catalog/v1.json',
    generated_at: '2026-02-13T10:35:00Z',
  },
  nodes: {
    'model.dbt_analytics.fct_sales': {
      unique_id: 'model.dbt_analytics.fct_sales',
      metadata: { type: 'table', schema: 'analytics', name: 'fct_sales' },
      columns: {
        order_id: { type: 'INTEGER', index: 1 },
        customer_id: { type: 'INTEGER', index: 2 },
        total_amount: { type: 'NUMERIC(18,2)', index: 3 },
      },
    },
  },
};
