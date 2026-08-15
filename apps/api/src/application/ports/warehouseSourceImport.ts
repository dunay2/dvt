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
import type {
  CreateWarehouseConnectionRequest,
  ImportSourceObjectsRequestV2,
  ImportSourceObjectsResultV2,
  SourceObject,
  SourceImportGrouping as ContractSourceImportGrouping,
  RenameWarehouseConnectionRequest,
  TestWarehouseConnectionResult as ContractTestWarehouseConnectionResult,
  WarehouseConnection as ContractWarehouseConnection,
  WarehouseConnectionTestFailureReason as ContractWarehouseConnectionTestFailureReason,
  WarehouseConnectionType as ContractWarehouseConnectionType,
  WorkspaceGraphAuthoringDraft,
  WorkspaceGraphDraftScope,
} from '@dvt/contracts';
import { SOURCE_IMPORT_GROUPING, WAREHOUSE_CONNECTION_TYPE } from '@dvt/contracts';

export const SUPPORTED_WAREHOUSE_CONNECTION_TYPES = WAREHOUSE_CONNECTION_TYPE;

export type WarehouseConnectionType = ContractWarehouseConnectionType;

export type WarehouseConnection = ContractWarehouseConnection;

export type WarehouseConnectionCatalogEntry = WarehouseConnection & {
  readonly credentialRef?: string;
  readonly sourceObjects: readonly SourceObject[];
};

export type CreateWarehouseConnectionInput = CreateWarehouseConnectionRequest & {
  readonly scope: WorkspaceGraphDraftScope;
};

export type CreateWarehouseConnectionCatalogInput = CreateWarehouseConnectionRequest & {
  readonly sourceObjects: readonly SourceObject[];
};

export type RenameWarehouseConnectionInput = RenameWarehouseConnectionRequest & {
  readonly scope: WorkspaceGraphDraftScope;
  readonly connectionId: string;
};

export type TestWarehouseConnectionInput = {
  readonly scope: WorkspaceGraphDraftScope;
  readonly connectionId: string;
};

export type WarehouseConnectionTestFailureReason = ContractWarehouseConnectionTestFailureReason;

export type TestWarehouseConnectionResult = ContractTestWarehouseConnectionResult;

export type InspectWarehouseConnectionResult =
  | {
      readonly status: 'passed';
      readonly checkedAt: string;
      readonly sourceObjects: readonly SourceObject[];
    }
  | {
      readonly status: 'failed';
      readonly reason: WarehouseConnectionTestFailureReason;
      readonly message: string;
      readonly checkedAt: string;
    };

export type WarehouseConnectionProbeTarget = Readonly<{
  type: WarehouseConnectionType;
  database: string;
  credentialRef: string;
  scope?: WorkspaceGraphDraftScope;
  name?: string;
}>;

export const SUPPORTED_SOURCE_IMPORT_GROUPINGS = SOURCE_IMPORT_GROUPING;

export type SourceImportGrouping = ContractSourceImportGrouping;

export type ImportWarehouseSourcesInput = ImportSourceObjectsRequestV2 & {
  readonly scope: WorkspaceGraphDraftScope;
};

export type ImportWarehouseSourcesResult = ImportSourceObjectsResultV2;

export interface IWarehouseConnectionCatalog {
  listConnections(scope: WorkspaceGraphDraftScope): Promise<readonly WarehouseConnection[]>;
  listSourceObjects(
    scope: WorkspaceGraphDraftScope,
    connectionId: string
  ): Promise<readonly SourceObject[]>;
  getConnection(
    scope: WorkspaceGraphDraftScope,
    connectionId: string
  ): Promise<WarehouseConnectionCatalogEntry>;
  createConnection(
    scope: WorkspaceGraphDraftScope,
    input: CreateWarehouseConnectionCatalogInput
  ): Promise<WarehouseConnection>;
  renameConnection(
    scope: WorkspaceGraphDraftScope,
    connectionId: string,
    input: RenameWarehouseConnectionRequest
  ): Promise<WarehouseConnection>;
}

export interface IWarehouseConnectionProbe {
  inspectConnection(
    input: WarehouseConnectionProbeTarget
  ): Promise<InspectWarehouseConnectionResult>;
  testConnection(input: WarehouseConnectionCatalogEntry): Promise<TestWarehouseConnectionResult>;
}

export class WarehouseConnectionNotFoundError extends Error {
  public constructor(connectionId: string) {
    super(`Warehouse connection not found: ${connectionId}`);
    this.name = 'WarehouseConnectionNotFoundError';
  }
}

export class SourceObjectNotFoundError extends Error {
  public constructor(readonly objectId: string) {
    super(`Source object not found: ${objectId}`);
    this.name = 'SourceObjectNotFoundError';
  }
}

export class UnsupportedSourceObjectImportError extends Error {
  public constructor(
    readonly objectId: string,
    readonly locatorKind: SourceObject['locator']['kind']
  ) {
    super(`Source object is not importable by the relational dbt source rail: ${objectId}`);
    this.name = 'UnsupportedSourceObjectImportError';
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

export class WarehouseSourceDiscoveryFailedError extends Error {
  public constructor(
    readonly reason: WarehouseConnectionTestFailureReason,
    message: string
  ) {
    super(message);
    this.name = 'WarehouseSourceDiscoveryFailedError';
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

export class WarehouseSourceImportIdempotencyMismatchError extends Error {
  public constructor(readonly idempotencyKey: string) {
    super(`Warehouse Source Import idempotency key was reused: ${idempotencyKey}`);
    this.name = 'WarehouseSourceImportIdempotencyMismatchError';
  }
}

export type WarehouseSourceDraftMutation = {
  readonly draft: WorkspaceGraphAuthoringDraft;
  readonly importedNodeIds: readonly string[];
  readonly yamlFiles: readonly string[];
};
