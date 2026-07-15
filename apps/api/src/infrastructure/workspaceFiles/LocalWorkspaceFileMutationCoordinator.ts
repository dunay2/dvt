/**
 * Owned concern: coordinate and atomically apply local workspace file mutations.
 *
 * @baseline ADR-0060: dbt Project Authoring Authority
 * @decision Serialize mutations per scoped path and publish writes through atomic replacement.
 * @consequence Concurrent file-backed authoring cannot expose partial writes or bypass mutation ordering.
 * @version 1.0.0
 */
import { randomUUID } from 'node:crypto';
import { mkdir, open, rename, rm } from 'node:fs/promises';

export type LocalWorkspaceFileMutationOperations = Readonly<{
  createDirectory: (path: string) => Promise<void>;
  writeTemporaryFile: (path: string, content: string) => Promise<void>;
  renameFile: (source: string, target: string) => Promise<void>;
  removeFile: (path: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  removeDirectory: (path: string) => Promise<void>;
}>;

export type LocalWorkspaceFileBatchEntry = Readonly<{
  absolutePath: string;
  originalExists: boolean;
  content: string | null;
}>;

const DEFAULT_OPERATIONS: LocalWorkspaceFileMutationOperations = {
  createDirectory: async (path) => {
    await mkdir(path, { recursive: true });
  },
  writeTemporaryFile: writeTemporaryFileDurably,
  renameFile: rename,
  removeFile: (path) => rm(path, { force: true }),
  deleteFile: (path) => rm(path, { force: false }),
  removeDirectory: (path) => rm(path, { recursive: true, force: true }),
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

  public async runExclusiveMany<T>(
    paths: readonly string[],
    operation: () => Promise<T>
  ): Promise<T> {
    const orderedPaths = [...new Set(paths)].sort((left, right) => left.localeCompare(right));

    const acquire = (index: number): Promise<T> => {
      const currentPath = orderedPaths[index];
      return currentPath === undefined
        ? operation()
        : this.runExclusive(currentPath, () => acquire(index + 1));
    };

    return acquire(0);
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

  public async replaceFilesAtomically(input: {
    readonly transactionDirectory: string;
    readonly entries: readonly LocalWorkspaceFileBatchEntry[];
  }): Promise<void> {
    const entries = [...input.entries].sort((left, right) =>
      left.absolutePath.localeCompare(right.absolutePath)
    );
    const states = entries.map((entry, index) => ({
      entry,
      stagedPath:
        entry.content === null
          ? null
          : `${input.transactionDirectory}/${index.toString().padStart(6, '0')}.next.${randomUUID()}`,
      backupPath: `${input.transactionDirectory}/${index
        .toString()
        .padStart(6, '0')}.backup.${randomUUID()}`,
      originalMoved: false,
      published: false,
    }));

    await this.operations.createDirectory(input.transactionDirectory);
    try {
      for (const state of states) {
        if (state.stagedPath !== null && state.entry.content !== null) {
          await this.operations.writeTemporaryFile(state.stagedPath, state.entry.content);
        }
      }

      for (const state of states) {
        if (state.entry.originalExists) {
          await this.operations.renameFile(state.entry.absolutePath, state.backupPath);
          state.originalMoved = true;
        }
        if (state.stagedPath !== null) {
          await this.operations.renameFile(state.stagedPath, state.entry.absolutePath);
          state.published = true;
        }
      }
    } catch (mutationError) {
      const rollbackErrors: unknown[] = [];
      for (const state of [...states].reverse()) {
        try {
          if (state.published) {
            await this.operations.removeFile(state.entry.absolutePath);
          }
          if (state.originalMoved) {
            await this.operations.renameFile(state.backupPath, state.entry.absolutePath);
          }
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }

      try {
        await this.operations.removeDirectory(input.transactionDirectory);
      } catch (cleanupError) {
        rollbackErrors.push(cleanupError);
      }

      if (rollbackErrors.length > 0) {
        throw new AggregateError(
          [mutationError, ...rollbackErrors],
          'Workspace file batch mutation failed and rollback was incomplete.',
          { cause: mutationError }
        );
      }
      throw mutationError;
    }

    await this.operations.removeDirectory(input.transactionDirectory);
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
