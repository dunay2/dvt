import type {
  DbtDependencyEditAppliedReceipt,
  DbtDependencyEditRequest,
  DbtDependencyEditResult,
} from '@dvt/contracts';

import type { WorkspaceStorageScope } from './workspaceFiles.js';

export type ApplySelectedDbtDependencyEditInput = Readonly<
  DbtDependencyEditRequest & { scope: WorkspaceStorageScope }
>;

export interface IApplySelectedDbtDependencyEditCommand {
  apply(input: ApplySelectedDbtDependencyEditInput): Promise<DbtDependencyEditResult>;
}

export interface IDbtDependencyEditReceiptStore {
  findApplied(
    scope: WorkspaceStorageScope,
    receiptId: string
  ): Promise<DbtDependencyEditAppliedReceipt | null>;
  saveApplied(
    scope: WorkspaceStorageScope,
    receipt: DbtDependencyEditAppliedReceipt
  ): Promise<void>;
}

export class DbtDependencyEditReceiptInvalidError extends Error {
  public constructor(readonly receiptId: string) {
    super(`The dbt dependency edit receipt is invalid: ${receiptId}`);
    this.name = 'DbtDependencyEditReceiptInvalidError';
  }
}
