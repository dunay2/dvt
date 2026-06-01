/**
 * Owned concern: persist and query the protected workspace plugin catalog.
 */
import type {
  IWorkspacePluginCatalogRepository,
  WorkspacePluginCatalogScope,
  WorkspacePluginDescriptor,
} from '../../application/ports/workspacePluginCatalog.js';

type Queryable = {
  query(sql: string, params?: readonly unknown[]): Promise<{ readonly rows: readonly unknown[] }>;
};

interface WorkspacePluginRow {
  plugin_id: string;
  display_name: string;
  version: string;
  description: string;
  capabilities: unknown;
  permissions: unknown;
  backend_plugin_id: string | null;
  enabled: boolean;
}

export class EmbeddedWorkspacePluginCatalogRepository implements IWorkspacePluginCatalogRepository {
  public constructor(
    private readonly pool: Queryable,
    private readonly schema: string = 'dvt'
  ) {}

  public async migrate(): Promise<void> {
    const schema = quoteIdentifier(this.schema);
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema};`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.workspace_plugins (
        tenant_id             TEXT,
        project_id            TEXT,
        environment_id        TEXT,
        plugin_id             TEXT        NOT NULL,
        display_name          TEXT        NOT NULL,
        version               TEXT        NOT NULL,
        description           TEXT        NOT NULL DEFAULT '',
        capabilities          JSONB       NOT NULL DEFAULT '[]',
        permissions           JSONB       NOT NULL DEFAULT '[]',
        backend_plugin_id     TEXT,
        enabled               BOOLEAN     NOT NULL DEFAULT TRUE,
        source_ref            TEXT        NOT NULL DEFAULT 'embedded-bootstrap',
        source_content_sha256 TEXT,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await this.pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS workspace_plugins_scope_plugin_key
        ON ${schema}.workspace_plugins (
          COALESCE(tenant_id, '*'),
          COALESCE(project_id, '*'),
          COALESCE(environment_id, '*'),
          plugin_id
        );
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS workspace_plugins_scope_lookup
        ON ${schema}.workspace_plugins (
          COALESCE(tenant_id, '*'),
          COALESCE(project_id, '*'),
          COALESCE(environment_id, '*'),
          enabled,
          plugin_id
        );
    `);
    await this.pool.query(`
      INSERT INTO ${schema}.workspace_plugins
        (tenant_id, project_id, environment_id, plugin_id, display_name, version, description,
         capabilities, permissions, backend_plugin_id, enabled, source_ref)
      VALUES
        (NULL, NULL, NULL, 'dbt', 'dbt', '1.0.0',
         'Built-in dbt graph, compile, artifact, and lineage surfaces.',
         '["canvas.render", "canvas.edit", "plan.import", "plan.export", "artifact.read", "lineage.resolve"]'::jsonb,
         '[]'::jsonb, NULL, TRUE, 'embedded-bootstrap'),
        (NULL, NULL, NULL, 'dvt', 'DVT', '1.0.0',
         'Built-in DVT transformation authoring surfaces.',
         '["canvas.render", "canvas.edit", "plan.preview"]'::jsonb,
         '[]'::jsonb, NULL, TRUE, 'embedded-bootstrap'),
        (NULL, NULL, NULL, 'monitoring', 'Monitoring', '1.0.0',
         'Built-in run monitoring and diagnostics surfaces.',
         '["run.start", "run.observe", "run.cancel", "canvas.overlay"]'::jsonb,
         '[]'::jsonb, NULL, TRUE, 'embedded-bootstrap'),
        (NULL, NULL, NULL, 'cost', 'Cost', '1.0.0',
         'Optional cost attribution and canvas overlay surfaces.',
         '["cost.analyze", "canvas.overlay"]'::jsonb,
         '[]'::jsonb, 'cost', TRUE, 'embedded-bootstrap')
      ON CONFLICT DO NOTHING;
    `);
  }

  public async listPlugins(
    scope: WorkspacePluginCatalogScope
  ): Promise<readonly WorkspacePluginDescriptor[]> {
    const schema = quoteIdentifier(this.schema);
    const result = (await this.pool.query(
      `SELECT DISTINCT ON (plugin_id)
         plugin_id,
         display_name,
         version,
         description,
         capabilities,
         permissions,
         backend_plugin_id,
         enabled
       FROM ${schema}.workspace_plugins
       WHERE enabled = TRUE
         AND (tenant_id IS NULL OR tenant_id = $1)
         AND (project_id IS NULL OR project_id = $2)
         AND (environment_id IS NULL OR environment_id = $3)
       ORDER BY plugin_id,
         CASE
           WHEN tenant_id = $1 AND project_id = $2 AND environment_id = $3 THEN 0
           WHEN tenant_id = $1 AND project_id = $2 AND environment_id IS NULL THEN 1
           WHEN tenant_id = $1 AND project_id IS NULL AND environment_id IS NULL THEN 2
           WHEN tenant_id IS NULL AND project_id IS NULL AND environment_id IS NULL THEN 3
           ELSE 4
         END`,
      [scope.tenantId, scope.projectId, scope.environmentId]
    )) as { readonly rows: readonly WorkspacePluginRow[] };

    return result.rows.map(projectPluginRow);
  }
}

function projectPluginRow(row: WorkspacePluginRow): WorkspacePluginDescriptor {
  return {
    id: row.plugin_id,
    name: row.display_name,
    version: row.version,
    description: row.description,
    capabilities: normalizeStringArray(row.capabilities),
    enabled: row.enabled,
    permissions: normalizeStringArray(row.permissions),
    ...(row.backend_plugin_id ? { backendPluginId: row.backend_plugin_id } : {}),
  };
}

function normalizeStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
