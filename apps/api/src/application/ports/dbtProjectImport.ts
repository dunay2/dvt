import type { DbtProjectImportDiagnostic, DbtProjectImportInventory } from '@dvt/contracts';

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
