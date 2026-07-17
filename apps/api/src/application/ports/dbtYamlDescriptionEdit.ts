/** Owned concern: define exact dbt YAML description-edit contracts and failure vocabulary. */

import type { WorkspaceStorageScope } from './workspaceFiles.js';

export const DBT_YAML_DESCRIPTION_RESOURCE_TYPE = {
  model: 'model',
  seed: 'seed',
  snapshot: 'snapshot',
  source: 'source',
  exposure: 'exposure',
  metric: 'metric',
} as const;

export type DbtYamlDescriptionResourceType =
  (typeof DBT_YAML_DESCRIPTION_RESOURCE_TYPE)[keyof typeof DBT_YAML_DESCRIPTION_RESOURCE_TYPE];

export type DbtYamlDescriptionResourceIdentity = Readonly<{
  uniqueId: string;
  resourceType: DbtYamlDescriptionResourceType;
  name: string;
  sourceName?: string | undefined;
}>;

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

export type DbtYamlDescriptionEditProposal = Readonly<{
  schemaVersion: 'dbt-yaml-description-edit-proposal.v1';
  canvasId: string;
  resource: DbtYamlDescriptionResourceIdentity;
  path: string;
  previousDescription: string | null;
  nextDescription: string | null;
  expectedContentSha256: string;
  candidateContent: string;
  candidateContentSha256: string;
  unifiedDiff: string;
  proposalDigest: string;
}>;

export type DbtYamlDescriptionAnalysisReceipt = Readonly<{
  freshness: 'fresh' | 'stale-last-valid' | 'invalid' | 'unavailable';
  analysisSha256: string;
  projectContentSetSha256: string;
}>;

export type DbtYamlDescriptionAppliedReceipt = Readonly<{
  schemaVersion: 'dbt-yaml-description-edit-applied-receipt.v1';
  receiptId: string;
  canvasId: string;
  resource: DbtYamlDescriptionResourceIdentity;
  path: string;
  previousDescription: string | null;
  nextDescription: string | null;
  expectedContentSha256: string;
  appliedContentSha256: string;
  proposalDigest: string;
  idempotencyKey: string;
  requestHash: string;
  deduplicated: boolean;
  analysis: DbtYamlDescriptionAnalysisReceipt;
}>;

export type DbtYamlDescriptionRevertedReceipt = Readonly<{
  schemaVersion: 'dbt-yaml-description-edit-reverted-receipt.v1';
  receiptId: string;
  appliedReceiptId: string;
  canvasId: string;
  resource: DbtYamlDescriptionResourceIdentity;
  path: string;
  restoredDescription: string | null;
  expectedContentSha256: string;
  revertedContentSha256: string;
  idempotencyKey: string;
  requestHash: string;
  deduplicated: boolean;
  analysis: DbtYamlDescriptionAnalysisReceipt;
}>;

export type ProposeDbtYamlDescriptionEditInput = Readonly<{
  scope: WorkspaceStorageScope;
  canvasId: string;
  resourceUniqueId: string;
  nextDescription: string | null;
}>;

export type ApplyDbtYamlDescriptionEditInput = Readonly<{
  scope: WorkspaceStorageScope;
  proposal: DbtYamlDescriptionEditProposal;
  idempotencyKey: string;
}>;

export type RevertDbtYamlDescriptionEditInput = Readonly<{
  scope: WorkspaceStorageScope;
  appliedReceipt: DbtYamlDescriptionAppliedReceipt;
  idempotencyKey: string;
}>;

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
