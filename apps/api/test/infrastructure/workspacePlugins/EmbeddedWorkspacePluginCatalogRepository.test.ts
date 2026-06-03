import { describe, expect, it, vi } from 'vitest';

import { EmbeddedWorkspacePluginCatalogRepository } from '../../../src/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.js';

describe('EmbeddedWorkspacePluginCatalogRepository', () => {
  it('projects enabled DB-backed plugin rows to workspace plugin descriptors', async () => {
    const query = vi.fn(async (sql: string, params?: readonly unknown[]) => {
      expect(sql).toContain('FROM "dvt".workspace_plugins');
      expect(sql).toContain('enabled = TRUE');
      expect(params).toEqual(['tenant-a', 'project-a', 'dev']);
      return {
        rows: [
          {
            plugin_id: 'warehouse-optimizer',
            display_name: 'Warehouse Optimizer',
            version: '0.1.0',
            description: 'DB-only cost policy plugin.',
            capabilities: ['cost.analyze'],
            permissions: [],
            backend_plugin_id: 'warehouse-optimizer',
            enabled: true,
          },
        ],
      };
    });
    const repository = new EmbeddedWorkspacePluginCatalogRepository({ query });

    await expect(
      repository.listPlugins({
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'dev',
      })
    ).resolves.toEqual([
      {
        id: 'warehouse-optimizer',
        name: 'Warehouse Optimizer',
        version: '0.1.0',
        description: 'DB-only cost policy plugin.',
        capabilities: ['cost.analyze'],
        enabled: true,
        permissions: [],
        backendPluginId: 'warehouse-optimizer',
      },
    ]);
  });

  it('creates schema, table, indexes, and embedded bootstrap rows during migration', async () => {
    const query = vi.fn(async (_sql: string) => ({ rows: [] }));
    const repository = new EmbeddedWorkspacePluginCatalogRepository({ query });

    await repository.migrate();

    const executedSql = query.mock.calls.map(([sql]) => sql).join('\n');
    expect(executedSql).toContain('CREATE SCHEMA IF NOT EXISTS "dvt"');
    expect(executedSql).toContain('CREATE TABLE IF NOT EXISTS "dvt".workspace_plugins');
    expect(executedSql).toContain('workspace_plugins_scope_plugin_key');
    expect(executedSql).toContain('workspace_plugins_scope_lookup');
    expect(executedSql).toContain("'dbt'");
    expect(executedSql).toContain("'dvt'");
    expect(executedSql).toContain("'monitoring'");
    expect(executedSql).toContain("'cost'");
  });
});
