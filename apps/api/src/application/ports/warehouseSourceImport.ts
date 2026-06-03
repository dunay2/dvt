/**
 * @file apps/api/src/application/ports/warehouseSourceImport.ts
 * @baseline ADR-0058: Warehouse Source Import Rails
 * @decision Define warehouse connection discovery queries and source import command DTOs.
 * @decision Keep source import scope bound to protected runtime workspace authorization.
 * @consequence Warehouse source import has one API-owned DTO rail for discovery and graph import.
 * @version 1.0.0
 * @date 2026-06-01
 *
 * Owned concern: define warehouse source import catalog and command DTOs.
 */
import type { WorkspaceGraphAuthoringDraft, WorkspaceGraphDraftScope } from '@dvt/contracts';

export type WarehouseConnectionType = 'snowflake' | 'bigquery' | 'redshift' | 'postgres';

export type WarehouseColumn = {
  readonly name: string;
  readonly type: string;
  readonly nullable: boolean;
};

export type WarehouseTable = {
  readonly connectionId?: string;
  readonly database: string;
  readonly schema: string;
  readonly table: string;
  readonly rowCount?: number;
  readonly columns?: readonly WarehouseColumn[];
};

export type WarehouseConnection = {
  readonly id: string;
  readonly name: string;
  readonly type: WarehouseConnectionType;
  readonly database: string;
};

export type WarehouseConnectionCatalogEntry = WarehouseConnection & {
  readonly tables: readonly WarehouseTable[];
};

export type SourceImportGrouping = 'schema' | 'database' | 'custom';

export type ImportWarehouseSourcesInput = {
  readonly scope: WorkspaceGraphDraftScope;
  readonly connectionId: string;
  readonly tables: readonly WarehouseTable[];
  readonly groupingStrategy: SourceImportGrouping;
  readonly includeColumns: boolean;
  readonly addTests: boolean;
  readonly addFreshness: boolean;
};

export type ImportWarehouseSourcesResult = {
  readonly success: true;
  readonly sourcesCreated: number;
  readonly tablesImported: number;
  readonly yamlFiles: readonly string[];
  readonly importedNodeIds: readonly string[];
  readonly grouping: SourceImportGrouping;
  readonly options: {
    readonly includeColumns: boolean;
    readonly addTests: boolean;
    readonly addFreshness: boolean;
  };
};

export interface IWarehouseConnectionCatalog {
  listConnections(): Promise<readonly WarehouseConnection[]>;
  listTables(connectionId: string): Promise<readonly WarehouseTable[]>;
}

export class WarehouseConnectionNotFoundError extends Error {
  public constructor(connectionId: string) {
    super(`Warehouse connection not found: ${connectionId}`);
    this.name = 'WarehouseConnectionNotFoundError';
  }
}

export class WarehouseTableNotFoundError extends Error {
  public constructor(table: WarehouseTable) {
    super(`Warehouse table not found: ${table.database}.${table.schema}.${table.table}`);
    this.name = 'WarehouseTableNotFoundError';
  }
}

export class InvalidWarehouseSourceImportRequestError extends Error {
  public constructor(
    message: string,
    readonly reason: 'invalid_request' | 'invalid_existing_source_yaml' = 'invalid_request'
  ) {
    super(message);
    this.name = 'InvalidWarehouseSourceImportRequestError';
  }
}

export class WarehouseSourceImportDraftConflictError extends Error {
  public constructor() {
    super('The workspace graph draft changed before the warehouse sources could be imported.');
    this.name = 'WarehouseSourceImportDraftConflictError';
  }
}

export type WarehouseSourceDraftMutation = {
  readonly draft: WorkspaceGraphAuthoringDraft;
  readonly importedNodeIds: readonly string[];
  readonly yamlFiles: readonly string[];
};
