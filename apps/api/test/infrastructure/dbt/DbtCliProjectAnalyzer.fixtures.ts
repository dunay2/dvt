/**
 * Owned concern: create/dispose isolated filesystem inputs and fresh literal manifests; never simulate analysis.
 * @decision Share filesystem setup/disposal and fresh literal manifests only.
 * @consequence Concrete process behavior and assertions stay inside each test case.
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { resolveWorkspaceScopeStorageRoot } from '../../../src/infrastructure/workspaceFiles/workspaceScopeStoragePath.js';

export const SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'env-a',
} as const;

export const LEGACY_V1_ANALYSIS_SHA256 =
  'c624060ca1dfab85fd29fda134e46268ff7663cb08a5a22f24c80c8200de5846';
export const V2_ANALYSIS_SHA256 =
  '59cb46b63fb4e7c4ec89383386df21260defa523e27f1039e64da1104ad16055';

export async function createDbtAnalyzerFixture(): Promise<
  Readonly<{
    workspaceFilesRoot: string;
    profilesDirectory: string;
    projectDirectory: string;
    dispose: () => Promise<void>;
  }>
> {
  const workspaceFilesRoot = await mkdtemp(path.join(tmpdir(), 'dvt-dbt-analyzer-workspace-'));
  const profilesDirectory = await mkdtemp(path.join(tmpdir(), 'dvt-dbt-analyzer-profiles-'));
  const projectDirectory = path.join(
    resolveWorkspaceScopeStorageRoot(workspaceFilesRoot, SCOPE),
    'analytics'
  );
  await mkdir(path.join(projectDirectory, 'models'), { recursive: true });
  await writeFile(
    path.join(projectDirectory, 'dbt_project.yml'),
    'name: analytics\nversion: 1.0.0\nprofile: analytics\nmodel-paths: [models]\n',
    'utf8'
  );
  await writeFile(
    path.join(profilesDirectory, 'profiles.yml'),
    'analytics:\n  target: analysis\n  outputs:\n    analysis:\n      type: postgres\n',
    'utf8'
  );
  await writeFile(
    path.join(projectDirectory, 'models', 'orders.sql'),
    "select * from {{ source('raw', 'orders') }}\n",
    'utf8'
  );
  await mkdir(path.join(projectDirectory, 'target'), { recursive: true });
  await writeFile(
    path.join(projectDirectory, 'target', 'manifest.json'),
    JSON.stringify({
      metadata: { dbt_version: '0.0.0-stale' },
      nodes: {
        'model.analytics.stale': {
          unique_id: 'model.analytics.stale',
          resource_type: 'model',
          name: 'stale',
          package_name: 'analytics',
          depends_on: { nodes: [] },
          columns: {},
          tags: [],
        },
      },
      sources: {},
      exposures: {},
      metrics: {},
    }),
    'utf8'
  );
  return {
    workspaceFilesRoot,
    profilesDirectory,
    projectDirectory,
    dispose: async (): Promise<void> => {
      await Promise.all([
        rm(workspaceFilesRoot, { recursive: true, force: true }),
        rm(profilesDirectory, { recursive: true, force: true }),
      ]);
    },
  };
}

export function readFlag(args: readonly string[], flag: string): string {
  const index = args.indexOf(flag);
  const value = args[index + 1];
  if (index < 0 || value === undefined) {
    throw new Error(`Missing ${flag}`);
  }
  return value;
}

export function manifest(): Record<string, unknown> {
  return {
    metadata: { dbt_version: '1.10.0', project_name: 'analytics' },
    nodes: {
      'model.analytics.orders': {
        unique_id: 'model.analytics.orders',
        resource_type: 'model',
        name: 'orders',
        package_name: 'analytics',
        original_file_path: 'models/orders.sql',
        depends_on: { nodes: ['source.analytics.raw.orders'] },
        config: { materialized: 'table' },
        columns: { order_id: { name: 'order_id', data_type: 'integer' } },
        tags: ['mart'],
      },
      'test.analytics.not_null_orders_order_id': {
        unique_id: 'test.analytics.not_null_orders_order_id',
        resource_type: 'test',
        name: 'not_null_orders_order_id',
        package_name: 'analytics',
        original_file_path: 'models/schema.yml',
        depends_on: { nodes: ['model.analytics.orders'] },
        columns: {},
        tags: [],
        test_metadata: { name: 'not_null', kwargs: { column_name: 'order_id' } },
      },
    },
    sources: {
      'source.analytics.raw.orders': {
        unique_id: 'source.analytics.raw.orders',
        resource_type: 'source',
        name: 'orders',
        source_name: 'raw',
        package_name: 'analytics',
        original_file_path: 'models/sources.yml',
        depends_on: { nodes: [] },
        columns: { order_id: { name: 'order_id', data_type: 'integer' } },
        tags: ['raw'],
      },
    },
    exposures: {},
    metrics: {},
  };
}
