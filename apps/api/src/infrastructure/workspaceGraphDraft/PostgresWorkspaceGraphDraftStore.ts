import { CANVAS_AUTHORING_FIELD_LIMITS_V1, type WorkspaceGraphDraftScope } from '@dvt/contracts';
import type { Pool, PoolClient, QueryConfig, QueryResultRow } from 'pg';

import { serializeCanvasAuthoringAuthorityKey } from '../../application/ports/canvasAuthoringAuthority.js';
import type {
  IWorkspaceGraphDraftStore,
  WorkspaceGraphDraftSaveStoreResult,
  WorkspaceGraphDraftStoredRecord,
} from '../../application/ports/workspaceGraphDraft.js';
import {
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
} from '../../application/ports/workspaceGraphDraft.js';

interface PostgresWorkspaceGraphDraftStoreConfig {
  readonly pool: Pool;
  readonly schema: string;
  readonly queryTimeoutMs?: number;
}

interface DraftRow extends QueryResultRow {
  readonly tenant_id: string;
  readonly project_id: string;
  readonly environment_id: string;
  readonly schema_version: string;
  readonly revision: string;
  readonly draft_json: unknown;
  readonly updated_at: Date | string;
}

interface IdempotencyRow extends QueryResultRow {
  readonly request_hash: string;
  readonly revision: string;
  readonly schema_version: string;
}

interface AuthorityConflictRow extends QueryResultRow {
  readonly canvas_id: string;
}

export class PostgresWorkspaceGraphDraftStore implements IWorkspaceGraphDraftStore {
  public constructor(private readonly config: PostgresWorkspaceGraphDraftStoreConfig) {}

  public async migrate(): Promise<void> {
    await this.config.pool.query(`
      CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(this.config.schema)};
    `);

    await this.config.pool.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.config.schema)}.workspace_graph_drafts (
        tenant_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        environment_id TEXT NOT NULL,
        schema_version TEXT NOT NULL,
        revision TEXT NOT NULL,
        draft_json JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (tenant_id, project_id, environment_id)
      );
    `);

    await this.config.pool.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.config.schema)}.workspace_graph_draft_idempotency (
        tenant_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        environment_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        revision TEXT NOT NULL,
        schema_version TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (tenant_id, project_id, environment_id, idempotency_key)
      );
    `);

    await this.installFieldBudgetConstraint();
  }

  private async installFieldBudgetConstraint(): Promise<void> {
    const schema = quoteIdentifier(this.config.schema);
    const limits = CANVAS_AUTHORING_FIELD_LIMITS_V1;
    await this.config.pool.query(`
      CREATE OR REPLACE FUNCTION ${schema}.workspace_graph_draft_trim(
        input_value TEXT
      ) RETURNS TEXT
      LANGUAGE sql
      IMMUTABLE
      PARALLEL SAFE
      AS $field_trim$
        SELECT btrim(
          input_value,
          chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(32) ||
          chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) ||
          chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) ||
          chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) ||
          chr(8239) || chr(8287) || chr(12288) || chr(65279)
        )
      $field_trim$;
    `);
    await this.config.pool.query(`
      CREATE OR REPLACE FUNCTION ${schema}.workspace_graph_draft_fields_within_budget(
        input_draft JSONB
      ) RETURNS BOOLEAN
      LANGUAGE plpgsql
      IMMUTABLE
      PARALLEL SAFE
      AS $field_budget$
      DECLARE
        node_item JSONB;
        tag_item JSONB;
        config_item JSONB;
        sidecar_item JSONB;
        binding_item JSONB;
        workspace_item JSONB;
        field_key TEXT;
      BEGIN
        IF jsonb_typeof(input_draft) <> 'object'
          OR jsonb_typeof(input_draft #> '{canvas,title}') <> 'string'
          OR ${schema}.workspace_graph_draft_trim(input_draft #>> '{canvas,title}') = ''
          OR ${schema}.workspace_graph_draft_trim(input_draft #>> '{canvas,title}') <> input_draft #>> '{canvas,title}'
          OR char_length(input_draft #>> '{canvas,title}') > ${limits.humanNameCodePoints}
        THEN
          RETURN FALSE;
        END IF;

        FOR workspace_item IN
          SELECT value FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(input_draft -> 'canvases') = 'array'
              THEN input_draft -> 'canvases' ELSE '[]'::jsonb END
          )
        LOOP
          IF jsonb_typeof(workspace_item #> '{canvas,title}') <> 'string'
            OR ${schema}.workspace_graph_draft_trim(workspace_item #>> '{canvas,title}') = ''
            OR ${schema}.workspace_graph_draft_trim(workspace_item #>> '{canvas,title}') <> workspace_item #>> '{canvas,title}'
            OR char_length(workspace_item #>> '{canvas,title}') > ${limits.humanNameCodePoints}
          THEN RETURN FALSE;
          END IF;
        END LOOP;

        FOR node_item IN
          SELECT root_node.value
          FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(input_draft -> 'nodes') = 'array'
              THEN input_draft -> 'nodes' ELSE '[]'::jsonb END
          ) AS root_node
          UNION ALL
          SELECT nested_node.value
          FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(input_draft -> 'canvases') = 'array'
              THEN input_draft -> 'canvases' ELSE '[]'::jsonb END
          ) AS canvas_workspace
          CROSS JOIN LATERAL jsonb_array_elements(
            CASE WHEN jsonb_typeof(canvas_workspace.value -> 'nodes') = 'array'
              THEN canvas_workspace.value -> 'nodes' ELSE '[]'::jsonb END
          ) AS nested_node
        LOOP
          IF jsonb_typeof(node_item) <> 'object'
            OR jsonb_typeof(node_item -> 'name') <> 'string'
            OR ${schema}.workspace_graph_draft_trim(node_item ->> 'name') = ''
            OR ${schema}.workspace_graph_draft_trim(node_item ->> 'name') <> node_item ->> 'name'
            OR char_length(node_item ->> 'name') > ${limits.humanNameCodePoints}
            OR jsonb_typeof(node_item -> 'tags') <> 'array'
            OR jsonb_array_length(node_item -> 'tags') > ${limits.tagsPerNode}
          THEN RETURN FALSE;
          END IF;

          IF node_item ? 'description'
            AND node_item -> 'description' <> 'null'::jsonb
            AND (jsonb_typeof(node_item -> 'description') <> 'string'
              OR ${schema}.workspace_graph_draft_trim(node_item ->> 'description') = ''
              OR char_length(node_item ->> 'description') > ${limits.descriptionCodePoints})
          THEN RETURN FALSE;
          END IF;

          FOR tag_item IN SELECT value FROM jsonb_array_elements(node_item -> 'tags')
          LOOP
            IF jsonb_typeof(tag_item) <> 'string'
              OR ${schema}.workspace_graph_draft_trim(tag_item #>> '{}') = ''
              OR ${schema}.workspace_graph_draft_trim(tag_item #>> '{}') <> tag_item #>> '{}'
              OR char_length(tag_item #>> '{}') > ${limits.tagCodePoints}
            THEN RETURN FALSE;
            END IF;
          END LOOP;

          IF (
            SELECT count(*) <> count(DISTINCT ${schema}.workspace_graph_draft_trim(value #>> '{}'))
            FROM jsonb_array_elements(node_item -> 'tags')
          ) THEN RETURN FALSE;
          END IF;

          IF (
              node_item ->> 'pluginId' IN ('dvt', 'dvt.warehouse-source')
              AND node_item ->> 'kind' = 'dvt:source'
            )
            OR (
              node_item ->> 'pluginId' = 'dvt'
              AND node_item ->> 'kind' = 'dvt:sink'
            )
          THEN
            config_item := node_item #> '{metadata,config}';
            IF config_item IS NOT NULL AND jsonb_typeof(config_item) <> 'object'
            THEN RETURN FALSE;
            END IF;
            IF jsonb_typeof(config_item) = 'object' THEN
              FOREACH field_key IN ARRAY ARRAY['schema', 'table']
              LOOP
                IF config_item ? field_key
                  AND (jsonb_typeof(config_item -> field_key) <> 'string'
                    OR ${schema}.workspace_graph_draft_trim(config_item ->> field_key) = ''
                    OR ${schema}.workspace_graph_draft_trim(config_item ->> field_key) <>
                      config_item ->> field_key
                    OR octet_length(config_item ->> field_key) >
                      ${limits.postgresIdentifierUtf8Bytes})
                THEN RETURN FALSE;
                END IF;
              END LOOP;
              IF node_item ->> 'kind' = 'dvt:source'
                AND config_item ? 'alias'
                AND (jsonb_typeof(config_item -> 'alias') <> 'string'
                  OR ${schema}.workspace_graph_draft_trim(config_item ->> 'alias') = ''
                  OR ${schema}.workspace_graph_draft_trim(config_item ->> 'alias') <>
                    config_item ->> 'alias'
                  OR octet_length(config_item ->> 'alias') >
                    ${limits.postgresIdentifierUtf8Bytes})
              THEN RETURN FALSE;
              END IF;
            END IF;
            IF node_item ->> 'kind' = 'dvt:sink' THEN
              IF config_item ? 'materialization'
                AND (jsonb_typeof(config_item -> 'materialization') <> 'string'
                  OR config_item ->> 'materialization' NOT IN ('table', 'view'))
              THEN RETURN FALSE;
              END IF;
              IF config_item ? 'writeMode'
                AND (jsonb_typeof(config_item -> 'writeMode') <> 'string'
                  OR config_item ->> 'writeMode' NOT IN ('replace', 'append'))
              THEN RETURN FALSE;
              END IF;
            END IF;
          END IF;

          IF node_item ->> 'pluginId' = 'dvt'
            AND node_item ->> 'kind' = 'dvt:transform'
          THEN
            config_item := node_item #> '{metadata,config}';
            IF config_item IS NOT NULL AND jsonb_typeof(config_item) <> 'object'
            THEN RETURN FALSE;
            END IF;
            IF config_item #> '{materialized}' IS NOT NULL
              AND (jsonb_typeof(config_item #> '{materialized}') <> 'string'
                OR config_item #>> '{materialized}' NOT IN ('table', 'view'))
            THEN RETURN FALSE;
            END IF;
          END IF;

          IF node_item ->> 'pluginId' IN ('dvt', 'dvt.warehouse-source')
            AND node_item ->> 'kind' = 'dvt:source'
          THEN
            FOREACH field_key IN ARRAY ARRAY['schema', 'tableName', 'sourceName']
            LOOP
              IF node_item #> ARRAY['metadata', field_key] IS NOT NULL
                AND (jsonb_typeof(node_item #> ARRAY['metadata', field_key]) <> 'string'
                  OR ${schema}.workspace_graph_draft_trim(node_item #>> ARRAY['metadata', field_key]) = ''
                  OR ${schema}.workspace_graph_draft_trim(node_item #>> ARRAY['metadata', field_key]) <>
                    node_item #>> ARRAY['metadata', field_key]
                  OR octet_length(node_item #>> ARRAY['metadata', field_key]) >
                    ${limits.postgresIdentifierUtf8Bytes})
              THEN RETURN FALSE;
              END IF;
            END LOOP;
          END IF;

          IF node_item ->> 'kind' = 'dvt:transform' THEN
            sidecar_item := node_item #> '{metadata,transformAuthoring,semanticDocument,sidecar}';
            IF jsonb_typeof(sidecar_item) = 'object' THEN
            FOR binding_item IN SELECT value FROM jsonb_array_elements(
              CASE WHEN jsonb_typeof(sidecar_item -> 'relations') = 'array'
                THEN sidecar_item -> 'relations' ELSE '[]'::jsonb END
            )
            LOOP
              IF binding_item ? 'displayName'
                AND (jsonb_typeof(binding_item -> 'displayName') <> 'string'
                  OR ${schema}.workspace_graph_draft_trim(binding_item ->> 'displayName') = ''
                  OR ${schema}.workspace_graph_draft_trim(binding_item ->> 'displayName') <> binding_item ->> 'displayName'
                  OR char_length(binding_item ->> 'displayName') >
                    ${limits.humanNameCodePoints})
              THEN RETURN FALSE;
              END IF;
            END LOOP;
            FOR binding_item IN SELECT value FROM jsonb_array_elements(
              CASE WHEN jsonb_typeof(sidecar_item -> 'fields') = 'array'
                THEN sidecar_item -> 'fields' ELSE '[]'::jsonb END
            )
            LOOP
              IF binding_item ? 'displayName'
                AND (jsonb_typeof(binding_item -> 'displayName') <> 'string'
                  OR ${schema}.workspace_graph_draft_trim(binding_item ->> 'displayName') = ''
                  OR ${schema}.workspace_graph_draft_trim(binding_item ->> 'displayName') <>
                    binding_item ->> 'displayName'
                  OR octet_length(binding_item ->> 'displayName') >
                    ${limits.postgresIdentifierUtf8Bytes})
              THEN RETURN FALSE;
              END IF;
              IF binding_item ? 'description'
                AND (jsonb_typeof(binding_item -> 'description') <> 'string'
                  OR ${schema}.workspace_graph_draft_trim(binding_item ->> 'description') = ''
                  OR char_length(binding_item ->> 'description') >
                    ${limits.descriptionCodePoints})
              THEN RETURN FALSE;
              END IF;
            END LOOP;
            END IF;
          END IF;
        END LOOP;
        RETURN TRUE;
      EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
      END;
      $field_budget$;
    `);

    await this.config.pool.query(`
      DO $constraint$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'workspace_graph_drafts_field_budget_check'
            AND conrelid = '${schema}.workspace_graph_drafts'::regclass
        ) THEN
          ALTER TABLE ${schema}.workspace_graph_drafts
            ADD CONSTRAINT workspace_graph_drafts_field_budget_check
            CHECK (${schema}.workspace_graph_draft_fields_within_budget(draft_json))
            NOT VALID;
        END IF;
      END;
      $constraint$;
    `);
  }

  public async close(): Promise<void> {}

  public async read(
    scope: WorkspaceGraphDraftScope
  ): Promise<WorkspaceGraphDraftStoredRecord | null> {
    const result = await this.config.pool.query<DraftRow>(
      withTimeout(this.config.queryTimeoutMs, {
        text: `
          SELECT tenant_id, project_id, environment_id, schema_version, revision, draft_json, updated_at
          FROM ${quoteIdentifier(this.config.schema)}.workspace_graph_drafts
          WHERE tenant_id = $1
            AND project_id = $2
            AND environment_id = $3
          LIMIT 1
        `,
        values: [scope.tenantId, scope.projectId, scope.environmentId],
      })
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return mapDraftRow(row);
  }

  public async save(input: {
    readonly scope: WorkspaceGraphDraftScope;
    readonly schemaVersion: string;
    readonly expectedRevision: string;
    readonly idempotencyKey: string;
    readonly draft: unknown;
    readonly canvasIds: readonly string[];
    readonly requestHash: string;
    readonly revision: string;
    readonly nowIso: string;
  }): Promise<WorkspaceGraphDraftSaveStoreResult> {
    const client = await this.config.pool.connect();
    try {
      await client.query('BEGIN');

      const canvasIds = [...new Set(input.canvasIds)].sort((left, right) =>
        left.localeCompare(right)
      );
      await this.lockCanvasAuthorities(client, input.scope, canvasIds);
      const authorityConflicts = await this.readAuthorityConflicts(client, input.scope, canvasIds);
      if (authorityConflicts.length > 0) {
        await client.query('ROLLBACK');
        return {
          kind: 'authoring_authority_conflict',
          canvasIds: authorityConflicts,
        };
      }

      const idempotency = await this.readIdempotency(client, input);
      if (idempotency) {
        if (idempotency.request_hash !== input.requestHash) {
          await client.query('ROLLBACK');
          return { kind: 'idempotency_mismatch' };
        }

        await client.query('COMMIT');
        return {
          kind: 'saved',
          schemaVersion: idempotency.schema_version,
          revision: idempotency.revision,
          updatedAt: input.nowIso,
          deduplicated: true,
        };
      }

      const current = await this.readDraftForUpdate(client, input.scope);
      if (current === null) {
        if (input.expectedRevision !== WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION) {
          await client.query('ROLLBACK');
          return {
            kind: 'conflict',
            currentRevision: WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
            storedSchemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
            updatedAt: null,
          };
        }

        await client.query(
          withTimeout(this.config.queryTimeoutMs, {
            text: `
              INSERT INTO ${quoteIdentifier(this.config.schema)}.workspace_graph_drafts
                (tenant_id, project_id, environment_id, schema_version, revision, draft_json, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::timestamptz)
            `,
            values: [
              input.scope.tenantId,
              input.scope.projectId,
              input.scope.environmentId,
              input.schemaVersion,
              input.revision,
              JSON.stringify(input.draft),
              input.nowIso,
            ],
          })
        );
      } else {
        if (current.revision !== input.expectedRevision) {
          await client.query('ROLLBACK');
          return {
            kind: 'conflict',
            currentRevision: current.revision,
            storedSchemaVersion: current.schemaVersion,
            updatedAt: current.updatedAt,
          };
        }

        await client.query(
          withTimeout(this.config.queryTimeoutMs, {
            text: `
              UPDATE ${quoteIdentifier(this.config.schema)}.workspace_graph_drafts
              SET schema_version = $4,
                  revision = $5,
                  draft_json = $6::jsonb,
                  updated_at = $7::timestamptz
              WHERE tenant_id = $1
                AND project_id = $2
                AND environment_id = $3
            `,
            values: [
              input.scope.tenantId,
              input.scope.projectId,
              input.scope.environmentId,
              input.schemaVersion,
              input.revision,
              JSON.stringify(input.draft),
              input.nowIso,
            ],
          })
        );
      }

      await client.query(
        withTimeout(this.config.queryTimeoutMs, {
          text: `
            INSERT INTO ${quoteIdentifier(this.config.schema)}.workspace_graph_draft_idempotency
              (
                tenant_id,
                project_id,
                environment_id,
                idempotency_key,
                request_hash,
                revision,
                schema_version,
                created_at,
                updated_at
              )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $8::timestamptz)
          `,
          values: [
            input.scope.tenantId,
            input.scope.projectId,
            input.scope.environmentId,
            input.idempotencyKey,
            input.requestHash,
            input.revision,
            input.schemaVersion,
            input.nowIso,
          ],
        })
      );

      await client.query('COMMIT');
      return {
        kind: 'saved',
        schemaVersion: input.schemaVersion,
        revision: input.revision,
        updatedAt: input.nowIso,
        deduplicated: false,
      };
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserve the original failure when rollback also fails.
      }
      throw error;
    } finally {
      client.release();
    }
  }

  private async readDraftForUpdate(
    client: PoolClient,
    scope: WorkspaceGraphDraftScope
  ): Promise<WorkspaceGraphDraftStoredRecord | null> {
    const result = await client.query<DraftRow>(
      withTimeout(this.config.queryTimeoutMs, {
        text: `
          SELECT tenant_id, project_id, environment_id, schema_version, revision, draft_json, updated_at
          FROM ${quoteIdentifier(this.config.schema)}.workspace_graph_drafts
          WHERE tenant_id = $1
            AND project_id = $2
            AND environment_id = $3
          FOR UPDATE
        `,
        values: [scope.tenantId, scope.projectId, scope.environmentId],
      })
    );

    return result.rows[0] ? mapDraftRow(result.rows[0]) : null;
  }

  private async lockCanvasAuthorities(
    client: PoolClient,
    scope: WorkspaceGraphDraftScope,
    canvasIds: readonly string[]
  ): Promise<void> {
    for (const canvasId of canvasIds) {
      await client.query(
        withTimeout(this.config.queryTimeoutMs, {
          text: 'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
          values: [serializeCanvasAuthoringAuthorityKey({ ...scope, canvasId })],
        })
      );
    }
  }

  private async readAuthorityConflicts(
    client: PoolClient,
    scope: WorkspaceGraphDraftScope,
    canvasIds: readonly string[]
  ): Promise<readonly string[]> {
    if (canvasIds.length === 0) return [];
    const result = await client.query<AuthorityConflictRow>(
      withTimeout(this.config.queryTimeoutMs, {
        text: `
          SELECT canvas_id
          FROM ${quoteIdentifier(this.config.schema)}.canvas_authoring_authorities
          WHERE tenant_id = $1
            AND project_id = $2
            AND environment_id = $3
            AND canvas_id = ANY($4::text[])
          ORDER BY canvas_id
          FOR UPDATE
        `,
        values: [scope.tenantId, scope.projectId, scope.environmentId, canvasIds],
      })
    );
    return result.rows.map((row) => row.canvas_id);
  }

  private async readIdempotency(
    client: PoolClient,
    input: {
      readonly scope: WorkspaceGraphDraftScope;
      readonly idempotencyKey: string;
    }
  ): Promise<IdempotencyRow | null> {
    const result = await client.query<IdempotencyRow>(
      withTimeout(this.config.queryTimeoutMs, {
        text: `
          SELECT request_hash, revision, schema_version
          FROM ${quoteIdentifier(this.config.schema)}.workspace_graph_draft_idempotency
          WHERE tenant_id = $1
            AND project_id = $2
            AND environment_id = $3
            AND idempotency_key = $4
          FOR UPDATE
        `,
        values: [
          input.scope.tenantId,
          input.scope.projectId,
          input.scope.environmentId,
          input.idempotencyKey,
        ],
      })
    );

    return result.rows[0] ?? null;
  }
}

function mapDraftRow(row: DraftRow): WorkspaceGraphDraftStoredRecord {
  return {
    scope: {
      tenantId: row.tenant_id,
      projectId: row.project_id,
      environmentId: row.environment_id,
    },
    schemaVersion: row.schema_version,
    revision: row.revision,
    draftPayload: row.draft_json,
    updatedAt: asIsoString(row.updated_at),
  };
}

function asIsoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function withTimeout<T extends QueryConfig>(timeoutMs: number | undefined, config: T): T {
  if (!timeoutMs || timeoutMs <= 0) {
    return config;
  }

  return {
    ...config,
    signal: globalThis.AbortSignal.timeout(timeoutMs),
  };
}
