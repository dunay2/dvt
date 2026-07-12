/**
 * Owned concern: coordinate and atomically apply local workspace file mutations.
 *
 * @baseline ADR-0060: dbt Project Authoring Authority
 * @decision Serialize mutations per scoped path and publish writes through atomic replacement.
 * @consequence Concurrent file-backed authoring cannot expose partial writes or bypass mutation ordering.
 * @version 1.0.0
 */
import { randomUUID } from 'node:crypto';
import { open, rename, rm } from 'node:fs/promises';

export type LocalWorkspaceFileMutationOperations = Readonly<{
  writeTemporaryFile: (path: string, content: string) => Promise<void>;
  renameFile: (source: string, target: string) => Promise<void>;
  removeFile: (path: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
}>;

const DEFAULT_OPERATIONS: LocalWorkspaceFileMutationOperations = {
  writeTemporaryFile: writeTemporaryFileDurably,
  renameFile: rename,
  removeFile: (path) => rm(path, { force: true }),
  deleteFile: (path) => rm(path, { force: false }),
};

export class LocalWorkspaceFileMutationCoordinator {
  private readonly locks = new Map<string, Promise<void>>();

  public constructor(
    private readonly operations: LocalWorkspaceFileMutationOperations = DEFAULT_OPERATIONS
  ) {}

  public async runExclusive<T>(path: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(path) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => gate);
    this.locks.set(path, queued);
    await previous;

    try {
      return await operation();
    } finally {
      release();
      if (this.locks.get(path) === queued) {
        this.locks.delete(path);
      }
    }
  }

  public async replaceFileAtomically(absolutePath: string, content: string): Promise<void> {
    const temporaryPath = `${absolutePath}.${randomUUID()}.tmp`;
    let mutationFailed = false;
    let mutationError: unknown;
    try {
      await this.operations.writeTemporaryFile(temporaryPath, content);
      await this.operations.renameFile(temporaryPath, absolutePath);
    } catch (error) {
      mutationFailed = true;
      mutationError = error;
    }

    let cleanupFailed = false;
    let cleanupError: unknown;
    try {
      await this.operations.removeFile(temporaryPath);
    } catch (error) {
      cleanupFailed = true;
      cleanupError = error;
    }

    if (mutationFailed) {
      throw mutationError;
    }
    if (cleanupFailed) {
      throw cleanupError;
    }
  }

  public async deleteFile(absolutePath: string): Promise<void> {
    await this.operations.deleteFile(absolutePath);
  }
}

export const sharedLocalWorkspaceFileMutationCoordinator =
  new LocalWorkspaceFileMutationCoordinator();

async function writeTemporaryFileDurably(path: string, content: string): Promise<void> {
  const handle = await open(path, 'wx', 0o600);
  let writeFailed = false;
  let writeError: unknown;
  try {
    await handle.writeFile(content, 'utf8');
    await handle.sync();
  } catch (error) {
    writeFailed = true;
    writeError = error;
  }

  let closeFailed = false;
  let closeError: unknown;
  try {
    await handle.close();
  } catch (error) {
    closeFailed = true;
    closeError = error;
  }

  if (writeFailed) {
    throw writeError;
  }
  if (closeFailed) {
    throw closeError;
  }
}
