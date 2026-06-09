/** Owned concern: verify warehouse connection metadata with server-resolved credentials. */
import { Client } from 'pg';

import type {
  CreateWarehouseConnectionInput,
  IWarehouseConnectionProbe,
  InspectWarehouseConnectionResult,
  TestWarehouseConnectionResult,
  WarehouseConnectionCatalogEntry,
  WarehouseTable,
} from '../../application/ports/warehouseSourceImport.js';

export type WarehouseCredentialResolver = {
  resolveCredential(credentialRef: string): Promise<string | null>;
};

export class EnvironmentWarehouseCredentialResolver implements WarehouseCredentialResolver {
  public async resolveCredential(credentialRef: string): Promise<string | null> {
    const envPrefix = 'env:';
    if (!credentialRef.startsWith(envPrefix)) {
      return null;
    }

    const envName = credentialRef.slice(envPrefix.length).trim();
    return envName.length > 0 ? (process.env[envName] ?? null) : null;
  }
}

export class WorkspaceWarehouseConnectionProbe implements IWarehouseConnectionProbe {
  public constructor(
    private readonly options: {
      readonly credentialResolver: WarehouseCredentialResolver;
      readonly now: () => Date;
    }
  ) {}

  public async inspectConnection(
    input: CreateWarehouseConnectionInput
  ): Promise<InspectWarehouseConnectionResult> {
    if (input.type !== 'postgres') {
      return this.failedInspection(
        'unsupported_adapter',
        `Unsupported warehouse adapter: ${input.type}`
      );
    }

    const tables = await this.loadPostgresTables(input.credentialRef);
    if (!tables.ok) {
      return this.failedInspection(tables.reason, tables.message);
    }

    return {
      status: 'passed' as const,
      checkedAt: this.checkedAt(),
      tables: tables.tables,
    };
  }

  public async testConnection(
    input: WarehouseConnectionCatalogEntry
  ): Promise<TestWarehouseConnectionResult> {
    if (input.type !== 'postgres') {
      return this.failed(
        input.id,
        'unsupported_adapter',
        `Unsupported warehouse adapter: ${input.type}`
      );
    }
    if (input.credentialRef === undefined) {
      return this.failed(input.id, 'invalid_credentials', 'Credential reference is missing.');
    }

    const tables = await this.loadPostgresTables(input.credentialRef);
    if (!tables.ok) {
      return this.failed(input.id, tables.reason, tables.message);
    }

    return {
      connectionId: input.id,
      status: 'passed',
      checkedAt: this.checkedAt(),
      tableCount: tables.tables.length,
    };
  }

  private async loadPostgresTables(credentialRef: string): Promise<
    | { readonly ok: true; readonly tables: readonly WarehouseTable[] }
    | {
        readonly ok: false;
        readonly reason: 'invalid_credentials' | 'connection_failed';
        readonly message: string;
      }
  > {
    const connectionString = await this.options.credentialResolver.resolveCredential(credentialRef);
    if (connectionString === null || connectionString.trim().length === 0) {
      return {
        ok: false,
        reason: 'invalid_credentials',
        message: 'Credential reference could not be resolved.',
      };
    }

    const client = new Client({ connectionString });
    try {
      await client.connect();
      const result = await client.query<{
        table_catalog: string;
        table_schema: string;
        table_name: string;
      }>(
        [
          'select table_catalog, table_schema, table_name',
          'from information_schema.tables',
          "where table_schema not in ('pg_catalog', 'information_schema')",
          "and table_type in ('BASE TABLE', 'VIEW')",
          'order by table_catalog, table_schema, table_name',
          'limit 500',
        ].join(' ')
      );

      return {
        ok: true,
        tables: result.rows.map((row) => ({
          database: row.table_catalog,
          schema: row.table_schema,
          table: row.table_name,
        })),
      };
    } catch (error) {
      return {
        ok: false,
        reason: classifyPostgresProbeFailure(error),
        message: 'Warehouse connection test failed.',
      };
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  private failed(
    connectionId: string,
    reason: 'invalid_credentials' | 'unsupported_adapter' | 'connection_failed',
    message: string
  ): TestWarehouseConnectionResult {
    return {
      connectionId,
      status: 'failed',
      reason,
      message,
      checkedAt: this.checkedAt(),
    };
  }

  private failedInspection(
    reason: 'invalid_credentials' | 'unsupported_adapter' | 'connection_failed',
    message: string
  ): InspectWarehouseConnectionResult {
    return {
      status: 'failed',
      reason,
      message,
      checkedAt: this.checkedAt(),
    };
  }

  private checkedAt(): string {
    return this.options.now().toISOString();
  }
}

function classifyPostgresProbeFailure(error: unknown): 'invalid_credentials' | 'connection_failed' {
  return isPgAuthError(error) ? 'invalid_credentials' : 'connection_failed';
}

function isPgAuthError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { readonly code?: unknown }).code === '28P01'
  );
}
