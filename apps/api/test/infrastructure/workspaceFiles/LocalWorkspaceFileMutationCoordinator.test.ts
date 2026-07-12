import { describe, expect, it, vi } from 'vitest';

import {
  LocalWorkspaceFileMutationCoordinator,
  type LocalWorkspaceFileMutationOperations,
} from '../../../src/infrastructure/workspaceFiles/LocalWorkspaceFileMutationCoordinator.js';

describe('LocalWorkspaceFileMutationCoordinator', () => {
  it('serializes concurrent operations for the same resolved path', async () => {
    const coordinator = new LocalWorkspaceFileMutationCoordinator();
    const order: string[] = [];
    let releaseFirst: () => void = () => undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = coordinator.runExclusive('/workspace/models/orders.sql', async () => {
      order.push('first:start');
      await firstGate;
      order.push('first:end');
    });
    const second = coordinator.runExclusive('/workspace/models/orders.sql', async () => {
      order.push('second:start');
      order.push('second:end');
    });

    await Promise.resolve();
    expect(order).toEqual(['first:start']);
    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual(['first:start', 'first:end', 'second:start', 'second:end']);
  });

  it('preserves the target and removes the temporary file after a write failure', async () => {
    const target = '/workspace/models/orders.sql';
    const files = new Map([[target, 'select 1']]);
    const writeFailure = new Error('write failed');
    const operations = createMemoryOperations(files, {
      writeTemporaryFile: async (path, content) => {
        files.set(path, content);
        throw writeFailure;
      },
    });
    const coordinator = new LocalWorkspaceFileMutationCoordinator(operations);

    await expect(coordinator.replaceFileAtomically(target, 'select 2')).rejects.toBe(writeFailure);

    expect(files.get(target)).toBe('select 1');
    expect([...files.keys()].filter((path) => path.endsWith('.tmp'))).toEqual([]);
    expect(operations.renameFile).not.toHaveBeenCalled();
  });

  it('preserves the mutation error when temporary cleanup also fails', async () => {
    const writeFailure = new Error('write failed');
    const cleanupFailure = new Error('cleanup failed');
    const operations = createMemoryOperations(new Map(), {
      writeTemporaryFile: async () => {
        throw writeFailure;
      },
      removeFile: async () => {
        throw cleanupFailure;
      },
    });
    const coordinator = new LocalWorkspaceFileMutationCoordinator(operations);

    await expect(
      coordinator.replaceFileAtomically('/workspace/models/orders.sql', 'select 2')
    ).rejects.toBe(writeFailure);
  });
});

function createMemoryOperations(
  files: Map<string, string>,
  overrides: Partial<LocalWorkspaceFileMutationOperations> = {}
): LocalWorkspaceFileMutationOperations {
  return {
    writeTemporaryFile: vi.fn(async (path: string, content: string) => {
      files.set(path, content);
    }),
    renameFile: vi.fn(async (source: string, target: string) => {
      const content = files.get(source);
      if (content === undefined) throw new Error(`Missing temporary file: ${source}`);
      files.set(target, content);
      files.delete(source);
    }),
    removeFile: vi.fn(async (path: string) => {
      files.delete(path);
    }),
    deleteFile: vi.fn(async (path: string) => {
      files.delete(path);
    }),
    ...overrides,
  };
}
