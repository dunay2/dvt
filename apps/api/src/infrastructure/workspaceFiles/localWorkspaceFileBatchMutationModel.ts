import { createHash } from 'node:crypto';

import {
  InvalidWorkspaceFileBatchMutationError,
  InvalidWorkspaceFileBatchReceiptError,
  type WorkspaceFileBatchMutation,
  type WorkspaceFileBatchReceipt,
  type WorkspaceStorageScope,
} from '../../application/ports/workspaceFiles.js';

import { resolveWorkspaceFileStoragePath } from './workspaceScopeStoragePath.js';

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const MAX_IDEMPOTENCY_KEY_LENGTH = 256;

export type ResolvedWorkspaceFileBatchExpectedFile = Readonly<{
  workspacePath: string;
  absolutePath: string;
  expectedContentSha256: string | null;
}>;

export type ResolvedWorkspaceFileBatchWrite = Readonly<{
  workspacePath: string;
  absolutePath: string;
  content: string;
  contentSha256: string;
}>;

export type ResolvedWorkspaceFileBatchMutation = Readonly<{
  idempotencyKey: string;
  expectedFiles: readonly ResolvedWorkspaceFileBatchExpectedFile[];
  writes: readonly ResolvedWorkspaceFileBatchWrite[];
  deletes: readonly Readonly<{ workspacePath: string; absolutePath: string }>[];
}>;

export type StoredWorkspaceFileBatchReceipt = Omit<WorkspaceFileBatchReceipt, 'deduplicated'> &
  Readonly<{ schemaVersion: 'workspace-file-batch-receipt.v1' }>;

export function resolveLocalWorkspaceFileBatchMutation(input: {
  readonly root: string;
  readonly scope: WorkspaceStorageScope;
  readonly mutation: WorkspaceFileBatchMutation;
  readonly limits: Readonly<{
    maxBatchFiles: number;
    maxFileBytes: number;
    maxBatchBytes: number;
  }>;
}): ResolvedWorkspaceFileBatchMutation {
  const idempotencyKey = input.mutation.idempotencyKey.trim();
  if (idempotencyKey.length === 0 || idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw new InvalidWorkspaceFileBatchMutationError(
      `A batch idempotency key between 1 and ${MAX_IDEMPOTENCY_KEY_LENGTH} characters is required.`
    );
  }
  if (input.mutation.writes.length + input.mutation.deletes.length === 0) {
    throw new InvalidWorkspaceFileBatchMutationError(
      'A batch must write or delete at least one file.'
    );
  }
  if (input.mutation.expectedFiles.length > input.limits.maxBatchFiles) {
    throw new InvalidWorkspaceFileBatchMutationError(
      'The batch exceeds the configured file limit.'
    );
  }

  const expectedFiles = input.mutation.expectedFiles.map((file) => {
    if (
      file.expectedContentSha256 !== undefined &&
      !SHA256_PATTERN.test(file.expectedContentSha256)
    ) {
      throw new InvalidWorkspaceFileBatchMutationError(
        `Expected revision is not a SHA-256 digest: ${file.path}`
      );
    }
    const resolvedPath = resolveWorkspaceFileStoragePath(input.root, input.scope, file.path);
    return {
      ...resolvedPath,
      expectedContentSha256: file.expectedContentSha256 ?? null,
    };
  });
  assertUniquePaths(
    expectedFiles.map((file) => file.workspacePath),
    'expected files'
  );

  let batchBytes = 0;
  const writes = input.mutation.writes.map((file) => {
    const contentBytes = Buffer.byteLength(file.content, 'utf8');
    batchBytes += contentBytes;
    if (contentBytes > input.limits.maxFileBytes) {
      throw new InvalidWorkspaceFileBatchMutationError(
        `A batch write exceeds the configured file size: ${file.path}`
      );
    }
    const resolvedPath = resolveWorkspaceFileStoragePath(input.root, input.scope, file.path);
    return {
      ...resolvedPath,
      content: file.content,
      contentSha256: workspaceFileBatchSha256(file.content),
    };
  });
  if (batchBytes > input.limits.maxBatchBytes) {
    throw new InvalidWorkspaceFileBatchMutationError(
      'The batch exceeds the configured byte limit.'
    );
  }
  assertUniquePaths(
    writes.map((file) => file.workspacePath),
    'writes'
  );

  const deletes = input.mutation.deletes.map((filePath) =>
    resolveWorkspaceFileStoragePath(input.root, input.scope, filePath)
  );
  assertUniquePaths(
    deletes.map((file) => file.workspacePath),
    'deletes'
  );

  const expectedPaths = new Set(expectedFiles.map((file) => file.workspacePath));
  const writePaths = new Set(writes.map((file) => file.workspacePath));
  const deletePaths = new Set(deletes.map((file) => file.workspacePath));
  for (const workspacePath of [...writePaths, ...deletePaths]) {
    if (!expectedPaths.has(workspacePath)) {
      throw new InvalidWorkspaceFileBatchMutationError(
        `Every mutation path requires an expected revision: ${workspacePath}`
      );
    }
  }
  for (const workspacePath of writePaths) {
    if (deletePaths.has(workspacePath)) {
      throw new InvalidWorkspaceFileBatchMutationError(
        `A batch cannot write and delete the same file: ${workspacePath}`
      );
    }
  }

  return {
    idempotencyKey,
    expectedFiles: sortByWorkspacePath(expectedFiles),
    writes: sortByWorkspacePath(writes),
    deletes: sortByWorkspacePath(deletes),
  };
}

export function hashLocalWorkspaceFileBatchRequest(
  mutation: ResolvedWorkspaceFileBatchMutation
): string {
  return workspaceFileBatchSha256(
    JSON.stringify({
      expectedFiles: mutation.expectedFiles.map((file) => file.workspacePath),
      writes: mutation.writes.map((file) => ({
        path: file.workspacePath,
        contentSha256: file.contentSha256,
      })),
      deletes: mutation.deletes.map((file) => file.workspacePath),
    })
  );
}

export function buildStoredWorkspaceFileBatchReceipt(
  mutation: ResolvedWorkspaceFileBatchMutation,
  requestHash: string
): StoredWorkspaceFileBatchReceipt {
  return {
    schemaVersion: 'workspace-file-batch-receipt.v1',
    kind: 'applied',
    idempotencyKey: mutation.idempotencyKey,
    requestHash,
    writes: mutation.writes.map((file) => ({
      path: file.workspacePath,
      contentSha256: file.contentSha256,
    })),
    deletes: mutation.deletes.map((file) => file.workspacePath),
  };
}

export function workspaceFileBatchPostconditionsMatch(
  receipt: StoredWorkspaceFileBatchReceipt,
  currentByPath: ReadonlyMap<string, string | null>
): boolean {
  return (
    receipt.writes.every((write) => currentByPath.get(write.path) === write.contentSha256) &&
    receipt.deletes.every((filePath) => currentByPath.get(filePath) === null)
  );
}

export function parseStoredWorkspaceFileBatchReceipt(
  raw: string,
  idempotencyKey: string
): StoredWorkspaceFileBatchReceipt {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredWorkspaceFileBatchReceipt(parsed) || parsed.idempotencyKey !== idempotencyKey) {
      throw new InvalidWorkspaceFileBatchReceiptError(idempotencyKey);
    }
    return parsed;
  } catch (error) {
    if (error instanceof InvalidWorkspaceFileBatchReceiptError) throw error;
    throw new InvalidWorkspaceFileBatchReceiptError(idempotencyKey);
  }
}

export function toWorkspaceFileBatchReceipt(
  receipt: StoredWorkspaceFileBatchReceipt,
  deduplicated: boolean
): WorkspaceFileBatchReceipt {
  return {
    kind: receipt.kind,
    idempotencyKey: receipt.idempotencyKey,
    requestHash: receipt.requestHash,
    deduplicated,
    writes: receipt.writes,
    deletes: receipt.deletes,
  };
}

function isStoredWorkspaceFileBatchReceipt(
  value: unknown
): value is StoredWorkspaceFileBatchReceipt {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.schemaVersion === 'workspace-file-batch-receipt.v1' &&
    candidate.kind === 'applied' &&
    typeof candidate.idempotencyKey === 'string' &&
    candidate.idempotencyKey.length > 0 &&
    typeof candidate.requestHash === 'string' &&
    SHA256_PATTERN.test(candidate.requestHash) &&
    Array.isArray(candidate.writes) &&
    candidate.writes.every(isStoredWriteReceipt) &&
    uniqueReceiptPaths(candidate.writes) &&
    Array.isArray(candidate.deletes) &&
    candidate.deletes.every((filePath) => typeof filePath === 'string' && filePath.length > 0) &&
    new Set(candidate.deletes).size === candidate.deletes.length
  );
}

function isStoredWriteReceipt(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const write = value as Record<string, unknown>;
  return (
    typeof write.path === 'string' &&
    write.path.length > 0 &&
    typeof write.contentSha256 === 'string' &&
    SHA256_PATTERN.test(write.contentSha256)
  );
}

function uniqueReceiptPaths(writes: unknown[]): boolean {
  const paths = writes.map((write) => (write as Record<string, unknown>).path);
  return new Set(paths).size === paths.length;
}

function assertUniquePaths(paths: readonly string[], label: string): void {
  if (new Set(paths).size !== paths.length) {
    throw new InvalidWorkspaceFileBatchMutationError(`Batch ${label} must use unique paths.`);
  }
}

function sortByWorkspacePath<T extends Readonly<{ workspacePath: string }>>(
  files: readonly T[]
): readonly T[] {
  return [...files].sort((left, right) => left.workspacePath.localeCompare(right.workspacePath));
}

export function workspaceFileBatchSha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
