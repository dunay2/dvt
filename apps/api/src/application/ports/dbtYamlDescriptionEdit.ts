/** Owned concern: define exact dbt YAML description-edit contracts and failure vocabulary. */

import type {
  ApplyDbtYamlDescriptionEditRequest,
  DbtYamlDescriptionAppliedReceipt,
  DbtYamlDescriptionEditProposal,
  DbtYamlDescriptionResourceIdentity,
  DbtYamlDescriptionRevertedReceipt,
  ProposeDbtYamlDescriptionEditRequest,
  RevertDbtYamlDescriptionEditRequest,
} from '@dvt/contracts';

import type { WorkspaceStorageScope } from './workspaceFiles.js';

export type {
  DbtYamlDescriptionAnalysisReceipt,
  DbtYamlDescriptionAppliedReceipt,
  DbtYamlDescriptionEditProposal,
  DbtYamlDescriptionResourceIdentity,
  DbtYamlDescriptionResourceType,
  DbtYamlDescriptionRevertedReceipt,
} from '@dvt/contracts';

export type DbtYamlDescriptionMutation = Readonly<{
  content: string;
  previousDescription: string | null;
  nextDescription: string | null;
}>;

export interface IDbtYamlDescriptionMutator {
  mutate(
    input: Readonly<{
      content: string;
      resource: DbtYamlDescriptionResourceIdentity;
      nextDescription: string | null;
    }>
  ): DbtYamlDescriptionMutation;
}

export type ProposeDbtYamlDescriptionEditInput = Readonly<
  ProposeDbtYamlDescriptionEditRequest & {
    scope: WorkspaceStorageScope;
  }
>;

export type ApplyDbtYamlDescriptionEditInput = Readonly<
  ApplyDbtYamlDescriptionEditRequest & {
    scope: WorkspaceStorageScope;
  }
>;

export type RevertDbtYamlDescriptionEditInput = Readonly<
  RevertDbtYamlDescriptionEditRequest & {
    scope: WorkspaceStorageScope;
  }
>;

export type DbtYamlDescriptionResourceContext = Readonly<{
  resource: DbtYamlDescriptionResourceIdentity;
  path: string;
}>;

export interface IDbtYamlDescriptionResourceResolver {
  resolve(
    input: Readonly<{
      scope: WorkspaceStorageScope;
      canvasId: string;
      resourceUniqueId: string;
    }>
  ): Promise<DbtYamlDescriptionResourceContext>;
}

export interface IProposeDbtYamlDescriptionEditQuery {
  propose(input: ProposeDbtYamlDescriptionEditInput): Promise<DbtYamlDescriptionEditProposal>;
}

export interface IApplyDbtYamlDescriptionEditCommand {
  apply(input: ApplyDbtYamlDescriptionEditInput): Promise<DbtYamlDescriptionAppliedReceipt>;
}

export interface IRevertDbtYamlDescriptionEditCommand {
  revert(input: RevertDbtYamlDescriptionEditInput): Promise<DbtYamlDescriptionRevertedReceipt>;
}

export interface IDbtYamlDescriptionReceiptStore {
  findApplied(
    scope: WorkspaceStorageScope,
    receiptId: string
  ): Promise<DbtYamlDescriptionAppliedReceipt | null>;
  saveApplied(
    scope: WorkspaceStorageScope,
    receipt: DbtYamlDescriptionAppliedReceipt
  ): Promise<void>;
  findReverted(
    scope: WorkspaceStorageScope,
    receiptId: string
  ): Promise<DbtYamlDescriptionRevertedReceipt | null>;
  saveReverted(
    scope: WorkspaceStorageScope,
    receipt: DbtYamlDescriptionRevertedReceipt
  ): Promise<void>;
}

export class DbtYamlDescriptionResourceNotFoundError extends Error {
  public constructor(readonly resourceUniqueId: string) {
    super(`dbt YAML resource was not found: ${resourceUniqueId}`);
    this.name = 'DbtYamlDescriptionResourceNotFoundError';
  }
}

export class DbtYamlDescriptionResourceAmbiguousError extends Error {
  public constructor(readonly resourceUniqueId: string) {
    super(`dbt YAML resource is ambiguous: ${resourceUniqueId}`);
    this.name = 'DbtYamlDescriptionResourceAmbiguousError';
  }
}

export class DbtYamlDescriptionDocumentInvalidError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'DbtYamlDescriptionDocumentInvalidError';
  }
}

export class DbtYamlDescriptionResourceUnsupportedError extends Error {
  public constructor(readonly resourceUniqueId: string) {
    super(`dbt YAML description editing is unsupported for: ${resourceUniqueId}`);
    this.name = 'DbtYamlDescriptionResourceUnsupportedError';
  }
}

export class DbtYamlDescriptionProposalMismatchError extends Error {
  public constructor() {
    super('The dbt YAML description proposal no longer matches authoritative content.');
    this.name = 'DbtYamlDescriptionProposalMismatchError';
  }
}

export class DbtYamlDescriptionRevisionConflictError extends Error {
  public constructor(
    readonly path: string,
    readonly currentContentSha256: string | null
  ) {
    super(`The dbt YAML description file changed before the transaction: ${path}`);
    this.name = 'DbtYamlDescriptionRevisionConflictError';
  }
}

export class DbtYamlDescriptionReceiptInvalidError extends Error {
  public constructor(readonly receiptId: string) {
    super(`The dbt YAML description edit receipt is invalid: ${receiptId}`);
    this.name = 'DbtYamlDescriptionReceiptInvalidError';
  }
}

export class DbtYamlDescriptionPersistenceInvariantError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'DbtYamlDescriptionPersistenceInvariantError';
  }
}
