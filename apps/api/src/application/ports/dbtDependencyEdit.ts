import type {
  DbtDependencyEditAppliedReceipt,
  DbtDependencyEditRequest,
  DbtDependencyEditResult,
} from '@dvt/contracts';

import type { DbtProjectAnalysisFile } from './dbtProjectAnalysis.js';
import type { WorkspaceStorageScope } from './workspaceFiles.js';

export type ApplySelectedDbtDependencyEditInput = Readonly<
  DbtDependencyEditRequest & { scope: WorkspaceStorageScope }
>;

export interface IApplySelectedDbtDependencyEditCommand {
  apply(input: ApplySelectedDbtDependencyEditInput): Promise<DbtDependencyEditResult>;
}

export type DbtDependencyEditPublication = Readonly<{
  projectRoot: string;
  expectedProjectContentSetSha256: string;
  expectedFiles: readonly DbtProjectAnalysisFile[];
  write: Readonly<{
    path: string;
    expectedContentSha256: string;
    content: string;
  }>;
  receipt: DbtDependencyEditAppliedReceipt;
}>;

export type DbtDependencyEditPublicationResult =
  | Readonly<{
      kind: 'applied';
      receipt: DbtDependencyEditAppliedReceipt;
    }>
  | Readonly<{
      kind: 'conflict';
      conflicts: readonly Readonly<{
        path: string;
        currentContentSha256: string | null;
      }>[];
    }>;

export interface IDbtDependencyEditPublicationPort {
  findApplied(
    scope: WorkspaceStorageScope,
    receiptId: string
  ): Promise<DbtDependencyEditAppliedReceipt | null>;
  publish(
    scope: WorkspaceStorageScope,
    publication: DbtDependencyEditPublication
  ): Promise<DbtDependencyEditPublicationResult>;
}

export class DbtDependencyEditReceiptInvalidError extends Error {
  public constructor(readonly receiptId: string) {
    super(`The dbt dependency edit receipt is invalid: ${receiptId}`);
    this.name = 'DbtDependencyEditReceiptInvalidError';
  }
}
