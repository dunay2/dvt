/** Owned concern: persist immutable DBT dependency-edit receipts as workspace metadata. */
import {
  DbtDependencyEditAppliedReceiptSchema,
  type DbtDependencyEditAppliedReceipt,
} from '@dvt/contracts';

import {
  DbtDependencyEditReceiptInvalidError,
  type IDbtDependencyEditReceiptStore,
} from '../../application/ports/dbtDependencyEdit.js';
import {
  WorkspaceFileNotFoundError,
  type IWorkspaceMetadataFileRepository,
  type WorkspaceStorageScope,
} from '../../application/ports/workspaceFiles.js';

const RECEIPT_ROOT = '.dvt/dbt-dependency-edit-receipts/applied';

export class WorkspaceMetadataDbtDependencyEditReceiptStore implements IDbtDependencyEditReceiptStore {
  public constructor(
    private readonly deps: Readonly<{ metadataFiles: IWorkspaceMetadataFileRepository }>
  ) {}

  public async findApplied(
    scope: WorkspaceStorageScope,
    receiptId: string
  ): Promise<DbtDependencyEditAppliedReceipt | null> {
    const path = receiptPath(receiptId);
    try {
      const file = await this.deps.metadataFiles.getFileContent(scope, path);
      return DbtDependencyEditAppliedReceiptSchema.parse(JSON.parse(file.content) as unknown);
    } catch (error) {
      if (error instanceof WorkspaceFileNotFoundError) return null;
      if (error instanceof DbtDependencyEditReceiptInvalidError) throw error;
      throw new DbtDependencyEditReceiptInvalidError(receiptId);
    }
  }

  public async saveApplied(
    scope: WorkspaceStorageScope,
    receipt: DbtDependencyEditAppliedReceipt
  ): Promise<void> {
    const trusted = DbtDependencyEditAppliedReceiptSchema.parse(receipt);
    const result = await this.deps.metadataFiles.saveFileContent(scope, {
      path: receiptPath(trusted.receiptId),
      content: `${JSON.stringify(trusted, null, 2)}\n`,
      expectedRevision: { kind: 'absent' },
    });
    if (result.kind !== 'conflict') return;

    const existing = await this.findApplied(scope, trusted.receiptId);
    if (existing === null || JSON.stringify(existing) !== JSON.stringify(trusted)) {
      throw new DbtDependencyEditReceiptInvalidError(trusted.receiptId);
    }
  }
}

function receiptPath(receiptId: string): string {
  return `${RECEIPT_ROOT}/${receiptId}.json`;
}
