/** Owned concern: persist immutable dbt YAML description receipts as server-owned workspace metadata. */
import {
  DbtYamlDescriptionAppliedReceiptSchema,
  DbtYamlDescriptionRevertedReceiptSchema,
  type DbtYamlDescriptionAppliedReceipt,
  type DbtYamlDescriptionRevertedReceipt,
} from '@dvt/contracts';

import {
  DbtYamlDescriptionReceiptInvalidError,
  type IDbtYamlDescriptionReceiptStore,
} from '../../application/ports/dbtYamlDescriptionEdit.js';
import {
  WorkspaceFileNotFoundError,
  type IWorkspaceMetadataFileRepository,
  type WorkspaceStorageScope,
} from '../../application/ports/workspaceFiles.js';

const RECEIPT_ROOT = '.dvt/dbt-yaml-description-receipts';

export class WorkspaceMetadataDbtYamlDescriptionReceiptStore implements IDbtYamlDescriptionReceiptStore {
  public constructor(
    private readonly deps: Readonly<{
      metadataFiles: IWorkspaceMetadataFileRepository;
    }>
  ) {}

  public findApplied(
    scope: WorkspaceStorageScope,
    receiptId: string
  ): Promise<DbtYamlDescriptionAppliedReceipt | null> {
    return this.find(scope, receiptPath('applied', receiptId), receiptId, {
      parse: (value) => DbtYamlDescriptionAppliedReceiptSchema.parse(value),
    });
  }

  public saveApplied(
    scope: WorkspaceStorageScope,
    receipt: DbtYamlDescriptionAppliedReceipt
  ): Promise<void> {
    return this.save(scope, receiptPath('applied', receipt.receiptId), receipt.receiptId, receipt, {
      parse: (value) => DbtYamlDescriptionAppliedReceiptSchema.parse(value),
    });
  }

  public findReverted(
    scope: WorkspaceStorageScope,
    receiptId: string
  ): Promise<DbtYamlDescriptionRevertedReceipt | null> {
    return this.find(scope, receiptPath('reverted', receiptId), receiptId, {
      parse: (value) => DbtYamlDescriptionRevertedReceiptSchema.parse(value),
    });
  }

  public saveReverted(
    scope: WorkspaceStorageScope,
    receipt: DbtYamlDescriptionRevertedReceipt
  ): Promise<void> {
    return this.save(
      scope,
      receiptPath('reverted', receipt.receiptId),
      receipt.receiptId,
      receipt,
      { parse: (value) => DbtYamlDescriptionRevertedReceiptSchema.parse(value) }
    );
  }

  private async find<T>(
    scope: WorkspaceStorageScope,
    path: string,
    receiptId: string,
    schema: Readonly<{ parse(value: unknown): T }>
  ): Promise<T | null> {
    try {
      const file = await this.deps.metadataFiles.getFileContent(scope, path);
      return schema.parse(JSON.parse(file.content) as unknown);
    } catch (error) {
      if (error instanceof WorkspaceFileNotFoundError) return null;
      if (error instanceof DbtYamlDescriptionReceiptInvalidError) throw error;
      throw new DbtYamlDescriptionReceiptInvalidError(receiptId);
    }
  }

  private async save<T>(
    scope: WorkspaceStorageScope,
    path: string,
    receiptId: string,
    receipt: T,
    schema: Readonly<{ parse(value: unknown): T }>
  ): Promise<void> {
    const trustedReceipt = schema.parse(receipt);
    const result = await this.deps.metadataFiles.saveFileContent(scope, {
      path,
      content: `${JSON.stringify(trustedReceipt, null, 2)}\n`,
      expectedRevision: { kind: 'absent' },
    });
    if (result.kind !== 'conflict') return;

    const existing = await this.find(scope, path, receiptId, schema);
    if (existing === null || JSON.stringify(existing) !== JSON.stringify(trustedReceipt)) {
      throw new DbtYamlDescriptionReceiptInvalidError(receiptId);
    }
  }
}

function receiptPath(kind: 'applied' | 'reverted', receiptId: string): string {
  return `${RECEIPT_ROOT}/${kind}/${receiptId}.json`;
}
