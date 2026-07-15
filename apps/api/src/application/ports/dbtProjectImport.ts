import type {
  CanvasAuthoringAuthorityBinding,
  DbtProjectImportDiagnostic,
  DbtProjectImportInventory,
  DbtProjectImportResult,
} from '@dvt/contracts';

import type { CanvasAuthoringAuthorityStoredRecord } from './canvasAuthoringAuthority.js';
import type { WorkspaceStorageScope } from './workspaceFiles.js';

export type InspectDbtProjectImportInput = Readonly<{
  scope: WorkspaceStorageScope;
  projectRoot: string;
}>;

export type DbtProjectImportInspection = Readonly<{
  projectRoot: string;
  projectName?: string;
  adapterType?: string;
  inventory: DbtProjectImportInventory;
  diagnostics: readonly DbtProjectImportDiagnostic[];
}>;

export interface IDbtProjectImportInspectorPort {
  inspect(input: InspectDbtProjectImportInput): Promise<DbtProjectImportInspection>;
}

export type DbtProjectImportProcessKey = WorkspaceStorageScope & Readonly<{ canvasId: string }>;

export type DbtProjectImportStoredCompletion = Readonly<{
  requestHash: string;
  result: DbtProjectImportResult;
}>;

export type DbtProjectImportProcessBeginResult =
  | Readonly<{
      kind: 'acquired';
      record: CanvasAuthoringAuthorityStoredRecord;
      leaseToken: string;
      recovered: boolean;
    }>
  | Readonly<{ kind: 'completed'; receipt: DbtProjectImportStoredCompletion }>
  | Readonly<{ kind: 'in_progress'; leaseExpiresAt: string }>
  | Readonly<{ kind: 'canvas_occupied' }>
  | Readonly<{ kind: 'conflict'; current: CanvasAuthoringAuthorityStoredRecord }>
  | Readonly<{ kind: 'idempotency_mismatch' }>;

export type DbtProjectImportProcessCompleteResult =
  | Readonly<{
      kind: 'completed';
      receipt: DbtProjectImportStoredCompletion;
      deduplicated: boolean;
    }>
  | Readonly<{ kind: 'lease_lost' }>
  | Readonly<{ kind: 'authority_conflict' }>
  | Readonly<{ kind: 'idempotency_mismatch' }>;

export type DbtProjectImportProcessFailResult =
  | Readonly<{ kind: 'failed' }>
  | Readonly<{ kind: 'completed'; receipt: DbtProjectImportStoredCompletion }>
  | Readonly<{ kind: 'lease_lost' }>
  | Readonly<{ kind: 'authority_conflict' }>
  | Readonly<{ kind: 'idempotency_mismatch' }>;

export interface IDbtProjectImportProcessStore {
  migrate(): Promise<void>;
  close(): Promise<void>;
  readCompleted(input: {
    readonly key: DbtProjectImportProcessKey;
    readonly idempotencyKey: string;
  }): Promise<DbtProjectImportStoredCompletion | null>;
  begin(input: {
    readonly key: DbtProjectImportProcessKey;
    readonly idempotencyKey: string;
    readonly requestHash: string;
    readonly binding: CanvasAuthoringAuthorityBinding;
    readonly revision: string;
    readonly leaseToken: string;
    readonly leaseExpiresAt: string;
    readonly nowIso: string;
  }): Promise<DbtProjectImportProcessBeginResult>;
  complete(input: {
    readonly key: DbtProjectImportProcessKey;
    readonly idempotencyKey: string;
    readonly requestHash: string;
    readonly leaseToken: string;
    readonly result: DbtProjectImportResult;
    readonly nowIso: string;
  }): Promise<DbtProjectImportProcessCompleteResult>;
  fail(input: {
    readonly key: DbtProjectImportProcessKey;
    readonly idempotencyKey: string;
    readonly requestHash: string;
    readonly leaseToken: string;
    readonly expectedRevision: string;
    readonly nowIso: string;
  }): Promise<DbtProjectImportProcessFailResult>;
}

export class DbtProjectImportRejectedError extends Error {
  public constructor() {
    super('The dbt project import validation was rejected.');
    this.name = 'DbtProjectImportRejectedError';
  }
}

export class DbtProjectImportStaleReceiptError extends Error {
  public constructor() {
    super('The dbt project import validation receipt is stale.');
    this.name = 'DbtProjectImportStaleReceiptError';
  }
}

export class DbtProjectImportCanvasOccupiedError extends Error {
  public constructor() {
    super('The target Canvas already has graph-draft authority.');
    this.name = 'DbtProjectImportCanvasOccupiedError';
  }
}

export class DbtProjectImportAuthorityConflictError extends Error {
  public constructor() {
    super('The target Canvas already has an authority binding.');
    this.name = 'DbtProjectImportAuthorityConflictError';
  }
}

export class DbtProjectImportIdempotencyMismatchError extends Error {
  public constructor() {
    super('The dbt project import idempotency key was reused for another command.');
    this.name = 'DbtProjectImportIdempotencyMismatchError';
  }
}

export class DbtProjectImportInProgressError extends Error {
  public constructor(public readonly leaseExpiresAt: string) {
    super(`The dbt project import is already in progress until ${leaseExpiresAt}.`);
    this.name = 'DbtProjectImportInProgressError';
  }
}

export class DbtProjectImportProjectionError extends Error {
  public constructor(message = 'The imported dbt project could not produce a fresh projection.') {
    super(message);
    this.name = 'DbtProjectImportProjectionError';
  }
}

export class DbtProjectFileAuthorityRequiredError extends Error {
  public constructor() {
    super('The Canvas does not have dbt-project-files authority.');
    this.name = 'DbtProjectFileAuthorityRequiredError';
  }
}
