/** Owned concern: conditionally restore one trusted applied dbt YAML description receipt. */
import {
  DbtYamlDescriptionAppliedReceiptSchema,
  DbtYamlDescriptionRevertedReceiptSchema,
  type DbtYamlDescriptionRevertedReceipt,
} from '@dvt/contracts';

import {
  DbtYamlDescriptionPersistenceInvariantError,
  DbtYamlDescriptionReceiptInvalidError,
  DbtYamlDescriptionRevisionConflictError,
  type IDbtYamlDescriptionMutator,
  type IDbtYamlDescriptionReceiptStore,
  type IRevertDbtYamlDescriptionEditCommand,
  type RevertDbtYamlDescriptionEditInput,
} from '../../ports/dbtYamlDescriptionEdit.js';
import {
  WorkspaceFileNotFoundError,
  type IWorkspaceFileBatchMutationPort,
  type IWorkspaceFileRepository,
  type WorkspaceFileContent,
} from '../../ports/workspaceFiles.js';
import type { ProjectDbtGraphFromFilesUseCase } from '../projectDbtGraphFromFilesUseCase.js';

import {
  analysisReceipt,
  batchIdempotencyKey,
  operationReceiptId,
  operationRequestHash,
  sha256,
} from './dbtYamlDescriptionEditIntegrity.js';

export class RevertDbtYamlDescriptionEditCommand implements IRevertDbtYamlDescriptionEditCommand {
  public constructor(
    private readonly deps: Readonly<{
      workspaceFiles: Pick<IWorkspaceFileRepository, 'getFileContent'>;
      batchMutation: IWorkspaceFileBatchMutationPort;
      mutator: IDbtYamlDescriptionMutator;
      projectGraph: Pick<ProjectDbtGraphFromFilesUseCase, 'execute'>;
      receipts: IDbtYamlDescriptionReceiptStore;
    }>
  ) {}

  public async revert(
    input: RevertDbtYamlDescriptionEditInput
  ): Promise<DbtYamlDescriptionRevertedReceipt> {
    const requestHash = operationRequestHash('revert', input.scope, {
      appliedReceiptId: input.appliedReceiptId,
      idempotencyKey: input.idempotencyKey,
    });
    const receiptId = operationReceiptId('revert', requestHash);
    const existing = await this.deps.receipts.findReverted(input.scope, receiptId);
    if (existing !== null) {
      if (existing.requestHash !== requestHash || existing.receiptId !== receiptId) {
        throw new DbtYamlDescriptionReceiptInvalidError(receiptId);
      }
      return { ...existing, deduplicated: true };
    }

    const storedApplied = await this.deps.receipts.findApplied(input.scope, input.appliedReceiptId);
    if (storedApplied === null) {
      throw new DbtYamlDescriptionReceiptInvalidError(input.appliedReceiptId);
    }
    const applied = DbtYamlDescriptionAppliedReceiptSchema.parse(storedApplied);
    const file = await this.readTarget(input, applied.path);
    if (file.contentSha256 !== applied.appliedContentSha256) {
      throw new DbtYamlDescriptionRevisionConflictError(applied.path, file.contentSha256);
    }
    const mutation = this.deps.mutator.mutate({
      content: file.content,
      resource: applied.resource,
      nextDescription: applied.previousDescription,
    });
    const revertedContentSha256 = sha256(mutation.content);

    const batchResult = await this.deps.batchMutation.apply(input.scope, {
      expectedFiles: [{ path: applied.path, expectedContentSha256: applied.appliedContentSha256 }],
      writes: [{ path: applied.path, content: mutation.content }],
      deletes: [],
      idempotencyKey: batchIdempotencyKey('revert', input.idempotencyKey),
    });
    if (batchResult.kind === 'conflict') {
      const conflict = batchResult.conflicts.find((entry) => entry.path === applied.path);
      throw new DbtYamlDescriptionRevisionConflictError(
        applied.path,
        conflict?.currentContentSha256 ?? null
      );
    }
    const write = batchResult.writes.find((entry) => entry.path === applied.path);
    if (write?.contentSha256 !== revertedContentSha256) {
      throw new DbtYamlDescriptionPersistenceInvariantError(
        `Workspace mutation did not prove the restored dbt YAML revision: ${applied.path}`
      );
    }

    const projection = await this.deps.projectGraph.execute({
      scope: input.scope,
      canvasId: applied.canvasId,
    });
    const retainedFile = await this.readTarget(input, applied.path);
    if (retainedFile.contentSha256 !== revertedContentSha256) {
      throw new DbtYamlDescriptionRevisionConflictError(applied.path, retainedFile.contentSha256);
    }

    const receipt = DbtYamlDescriptionRevertedReceiptSchema.parse({
      schemaVersion: 'dbt-yaml-description-edit-reverted-receipt.v1',
      receiptId,
      appliedReceiptId: applied.receiptId,
      canvasId: applied.canvasId,
      resource: applied.resource,
      path: applied.path,
      restoredDescription: applied.previousDescription,
      expectedContentSha256: applied.appliedContentSha256,
      revertedContentSha256,
      idempotencyKey: input.idempotencyKey,
      requestHash,
      deduplicated: batchResult.deduplicated,
      analysis: analysisReceipt(projection, retainedFile.contentSha256),
    });
    await this.deps.receipts.saveReverted(input.scope, receipt);
    return receipt;
  }

  private async readTarget(
    input: RevertDbtYamlDescriptionEditInput,
    path: string
  ): Promise<WorkspaceFileContent> {
    try {
      return await this.deps.workspaceFiles.getFileContent(input.scope, path);
    } catch (error) {
      if (error instanceof WorkspaceFileNotFoundError) {
        throw new DbtYamlDescriptionRevisionConflictError(path, null);
      }
      throw error;
    }
  }
}
