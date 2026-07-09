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

export const SUPPORTED_WAREHOUSE_CONNECTION_TYPES = ['postgres'] as const;

export type WarehouseConnectionType = (typeof SUPPORTED_WAREHOUSE_CONNECTION_TYPES)[number];

export type WarehouseColumn = {
  readonly name: string;
  readonly type: string;
  readonly nullable: boolean;
  readonly primaryKey?: boolean;
  readonly unique?: boolean;
};

export type WarehouseTable = {
  readonly connectionId?: string;
  readonly database: string;
  readonly schema: string;
  readonly table: string;
  readonly rowCount?: number;
  readonly byteSize?: number;
  readonly columns?: readonly WarehouseColumn[];
};

export type WarehouseConnection = {
  readonly id: string;
  readonly name: string;
  readonly type: WarehouseConnectionType;
  readonly database: string;
};

export type WarehouseConnectionCatalogEntry = WarehouseConnection & {
  readonly credentialRef?: string;
  readonly tables: readonly WarehouseTable[];
};

export type CreateWarehouseConnectionInput = {
  readonly scope: WorkspaceGraphDraftScope;
  readonly name: string;
  readonly type: WarehouseConnectionType;
  readonly database: string;
  readonly credentialRef: string;
};

export type CreateWarehouseConnectionCatalogInput = Omit<
  CreateWarehouseConnectionInput,
  'scope'
> & {
  readonly tables: readonly WarehouseTable[];
};

export type TestWarehouseConnectionInput = {
  readonly scope: WorkspaceGraphDraftScope;
  readonly connectionId: string;
};

export type WarehouseConnectionTestFailureReason =
  | 'invalid_credentials'
  | 'unsupported_adapter'
  | 'connection_failed';

export type TestWarehouseConnectionResult =
  | {
      readonly connectionId: string;
      readonly status: 'passed';
      readonly checkedAt: string;
      readonly tableCount: number;
    }
  | {
      readonly connectionId: string;
      readonly status: 'failed';
      readonly reason: WarehouseConnectionTestFailureReason;
      readonly message: string;
      readonly checkedAt: string;
    };

export type InspectWarehouseConnectionResult =
  | {
      readonly status: 'passed';
      readonly checkedAt: string;
      readonly tables: readonly WarehouseTable[];
    }
  | {
      readonly status: 'failed';
      readonly reason: WarehouseConnectionTestFailureReason;
      readonly message: string;
      readonly checkedAt: string;
    };

export const SUPPORTED_SOURCE_IMPORT_GROUPINGS = ['schema', 'database'] as const;

export type SourceImportGrouping = (typeof SUPPORTED_SOURCE_IMPORT_GROUPINGS)[number];

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
  readonly draftRevision: string;
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
  getConnection(connectionId: string): Promise<WarehouseConnectionCatalogEntry>;
  createConnection(input: CreateWarehouseConnectionCatalogInput): Promise<WarehouseConnection>;
}

export interface IWarehouseConnectionProbe {
  inspectConnection(
    input: CreateWarehouseConnectionInput
  ): Promise<InspectWarehouseConnectionResult>;
  testConnection(input: WarehouseConnectionCatalogEntry): Promise<TestWarehouseConnectionResult>;
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

export class DuplicateWarehouseConnectionError extends Error {
  public constructor(readonly connectionName: string) {
    super(`Warehouse connection already exists: ${connectionName}`);
    this.name = 'DuplicateWarehouseConnectionError';
  }
}

export class UnsupportedWarehouseAdapterError extends Error {
  public constructor(readonly adapterType: string) {
    super(`Unsupported warehouse adapter: ${adapterType}`);
    this.name = 'UnsupportedWarehouseAdapterError';
  }
}

export class WarehouseConnectionTestFailedError extends Error {
  public constructor(
    readonly result: Extract<InspectWarehouseConnectionResult, { status: 'failed' }>
  ) {
    super(result.message);
    this.name = 'WarehouseConnectionTestFailedError';
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
