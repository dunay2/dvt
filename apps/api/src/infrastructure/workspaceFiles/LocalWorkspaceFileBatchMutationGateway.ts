/**
 * Owned concern: apply one scoped, idempotent multi-file workspace mutation.
 *
 * @baseline ADR-0060: dbt Project Authoring Authority
 * @decision Preflight every revision before staging and publish the receipt with the file batch.
 * @consequence Source Import cannot report success for a partial YAML publication.
 * @version 1.0.0
 */
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  WorkspaceFileBatchIdempotencyConflictError,
  type IWorkspaceFileBatchMutationPort,
  type WorkspaceFileBatchMutation,
  type WorkspaceFileBatchMutationResult,
  type WorkspaceStorageScope,
} from '../../application/ports/workspaceFiles.js';

import {
  buildStoredWorkspaceFileBatchReceipt,
  hashLocalWorkspaceFileBatchRequest,
  parseStoredWorkspaceFileBatchReceipt,
  resolveLocalWorkspaceFileBatchMutation,
  toWorkspaceFileBatchReceipt,
  workspaceFileBatchPostconditionsMatch,
  workspaceFileBatchSha256,
  type ResolvedWorkspaceFileBatchExpectedFile,
  type ResolvedWorkspaceFileBatchMutation,
  type StoredWorkspaceFileBatchReceipt,
} from './localWorkspaceFileBatchMutationModel.js';
import {
  type LocalWorkspaceFileBatchEntry,
  type LocalWorkspaceFileMutationCoordinator,
  sharedLocalWorkspaceFileMutationCoordinator,
} from './LocalWorkspaceFileMutationCoordinator.js';
import {
  buildWorkspaceScopeStorageKey,
  resolveWorkspaceScopeMutationLockKey,
} from './workspaceScopeStoragePath.js';

const MAX_BATCH_FILES = 500;
const MAX_FILE_BYTES = 1_000_000;
const MAX_BATCH_BYTES = 5_000_000;

export type LocalWorkspaceFileBatchMutationGatewayOptions = Readonly<{
  root: string;
  maxBatchFiles?: number;
  maxFileBytes?: number;
  maxBatchBytes?: number;
  mutationCoordinator?: LocalWorkspaceFileMutationCoordinator;
}>;

export class LocalWorkspaceFileBatchMutationGateway implements IWorkspaceFileBatchMutationPort {
  private readonly root: string;
  private readonly limits: Readonly<{
    maxBatchFiles: number;
    maxFileBytes: number;
    maxBatchBytes: number;
  }>;
  private readonly mutationCoordinator: LocalWorkspaceFileMutationCoordinator;

  public constructor(options: LocalWorkspaceFileBatchMutationGatewayOptions) {
    this.root = path.resolve(options.root);
    this.limits = {
      maxBatchFiles: options.maxBatchFiles ?? MAX_BATCH_FILES,
      maxFileBytes: options.maxFileBytes ?? MAX_FILE_BYTES,
      maxBatchBytes: options.maxBatchBytes ?? MAX_BATCH_BYTES,
    };
    this.mutationCoordinator =
      options.mutationCoordinator ?? sharedLocalWorkspaceFileMutationCoordinator;
  }

  public async apply(
    scope: WorkspaceStorageScope,
    mutation: WorkspaceFileBatchMutation
  ): Promise<WorkspaceFileBatchMutationResult> {
    const resolved = resolveLocalWorkspaceFileBatchMutation({
      root: this.root,
      scope,
      mutation,
      limits: this.limits,
    });
    const requestHash = hashLocalWorkspaceFileBatchRequest(resolved);
    const scopeKey = buildWorkspaceScopeStorageKey(scope);
    const receiptPath = this.resolveReceiptPath(scopeKey, resolved.idempotencyKey);
    const lockPaths = [
      resolveWorkspaceScopeMutationLockKey(this.root, scope),
      receiptPath,
      ...resolved.expectedFiles.map((file) => file.absolutePath),
      ...resolved.writes.map((file) => file.absolutePath),
      ...resolved.deletes.map((file) => file.absolutePath),
    ];

    return this.mutationCoordinator.runExclusiveMany(lockPaths, async () => {
      const previousReceipt = await this.readReceipt(receiptPath, resolved.idempotencyKey);
      if (previousReceipt !== null && previousReceipt.requestHash !== requestHash) {
        throw new WorkspaceFileBatchIdempotencyConflictError(resolved.idempotencyKey);
      }

      const currentByPath = await readCurrentRevisions(resolved.expectedFiles);
      const validationOnly = resolved.writes.length === 0 && resolved.deletes.length === 0;
      if (
        previousReceipt !== null &&
        !validationOnly &&
        workspaceFileBatchPostconditionsMatch(previousReceipt, currentByPath)
      ) {
        return toWorkspaceFileBatchReceipt(previousReceipt, true);
      }

      const conflicts = resolved.expectedFiles.flatMap((file) => {
        const currentContentSha256 = currentByPath.get(file.workspacePath) ?? null;
        return currentContentSha256 === file.expectedContentSha256
          ? []
          : [{ path: file.workspacePath, currentContentSha256 }];
      });
      if (conflicts.length > 0) return { kind: 'conflict', conflicts };
      if (previousReceipt !== null && validationOnly) {
        return toWorkspaceFileBatchReceipt(previousReceipt, true);
      }

      const receipt = buildStoredWorkspaceFileBatchReceipt(resolved, requestHash);
      const receiptContent = `${JSON.stringify(receipt)}\n`;
      const entries = buildBatchEntries(resolved, currentByPath, {
        receiptPath,
        receiptContent,
        receiptExists: previousReceipt !== null,
      });

      await Promise.all([
        ...resolved.writes.map((file) =>
          mkdir(path.dirname(file.absolutePath), { recursive: true })
        ),
        mkdir(path.dirname(receiptPath), { recursive: true }),
      ]);
      await this.mutationCoordinator.replaceFilesAtomically({
        transactionDirectory: path.join(
          this.root,
          '.dvt-state',
          'workspace-file-transactions',
          scopeKey,
          randomUUID()
        ),
        entries,
      });

      return toWorkspaceFileBatchReceipt(receipt, false);
    });
  }

  private resolveReceiptPath(scopeKey: string, idempotencyKey: string): string {
    return path.join(
      this.root,
      '.dvt-state',
      'workspace-file-batch-receipts',
      scopeKey,
      `${workspaceFileBatchSha256(idempotencyKey)}.json`
    );
  }

  private async readReceipt(
    receiptPath: string,
    idempotencyKey: string
  ): Promise<StoredWorkspaceFileBatchReceipt | null> {
    try {
      return parseStoredWorkspaceFileBatchReceipt(
        await readFile(receiptPath, 'utf8'),
        idempotencyKey
      );
    } catch (error) {
      if (isFileNotFound(error)) return null;
      throw error;
    }
  }
}

async function readCurrentRevisions(
  files: readonly ResolvedWorkspaceFileBatchExpectedFile[]
): Promise<ReadonlyMap<string, string | null>> {
  const entries = await Promise.all(
    files.map(
      async (file) => [file.workspacePath, await readOptionalSha256(file.absolutePath)] as const
    )
  );
  return new Map(entries);
}

function buildBatchEntries(
  mutation: ResolvedWorkspaceFileBatchMutation,
  currentByPath: ReadonlyMap<string, string | null>,
  receipt: Readonly<{
    receiptPath: string;
    receiptContent: string;
    receiptExists: boolean;
  }>
): readonly LocalWorkspaceFileBatchEntry[] {
  const entries: LocalWorkspaceFileBatchEntry[] = [];
  for (const write of mutation.writes) {
    if (currentByPath.get(write.workspacePath) !== write.contentSha256) {
      entries.push({
        absolutePath: write.absolutePath,
        originalExists: currentByPath.get(write.workspacePath) !== null,
        content: write.content,
      });
    }
  }
  for (const deletion of mutation.deletes) {
    if (currentByPath.get(deletion.workspacePath) !== null) {
      entries.push({ absolutePath: deletion.absolutePath, originalExists: true, content: null });
    }
  }
  entries.push({
    absolutePath: receipt.receiptPath,
    originalExists: receipt.receiptExists,
    content: receipt.receiptContent,
  });
  return entries;
}

async function readOptionalSha256(absolutePath: string): Promise<string | null> {
  try {
    return createHash('sha256')
      .update(await readFile(absolutePath))
      .digest('hex');
  } catch (error) {
    if (isFileNotFound(error)) return null;
    throw error;
  }
}

function isFileNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  );
}
