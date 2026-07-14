import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  WorkspaceFileBatchIdempotencyConflictError,
  type WorkspaceFileBatchMutation,
} from '../../../src/application/ports/workspaceFiles.js';
import { LocalWorkspaceFileBatchMutationGateway } from '../../../src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.js';
import {
  LocalWorkspaceFileMutationCoordinator,
  type LocalWorkspaceFileMutationOperations,
} from '../../../src/infrastructure/workspaceFiles/LocalWorkspaceFileMutationCoordinator.js';
import { resolveWorkspaceScopeStorageRoot } from '../../../src/infrastructure/workspaceFiles/workspaceScopeStoragePath.js';

const SCOPE = {
  tenantId: 'tenant-batch',
  projectId: 'project-batch',
  environmentId: 'environment-batch',
} as const;

describe('LocalWorkspaceFileBatchMutationGateway', () => {
  let namespaceRoot: string;

  beforeEach(async () => {
    namespaceRoot = await mkdtemp(path.join(tmpdir(), 'dvt-workspace-file-batch-'));
  });

  afterEach(async () => {
    await rm(namespaceRoot, { recursive: true, force: true });
  });

  it('preflights and publishes writes and deletes as one deterministic batch', async () => {
    await seed('analytics/models/sources/existing.yml', 'version: 2\n');
    await seed('analytics/models/sources/obsolete.yml', 'obsolete: true\n');
    const gateway = new LocalWorkspaceFileBatchMutationGateway({ root: namespaceRoot });

    const result = await gateway.apply(SCOPE, {
      idempotencyKey: 'source-import-1',
      expectedFiles: [
        {
          path: 'analytics/models/sources/existing.yml',
          expectedContentSha256: sha256('version: 2\n'),
        },
        { path: 'analytics/models/sources/new.yml' },
        {
          path: 'analytics/models/sources/obsolete.yml',
          expectedContentSha256: sha256('obsolete: true\n'),
        },
      ],
      writes: [
        { path: 'analytics/models/sources/new.yml', content: 'version: 2\n' },
        {
          path: 'analytics/models/sources/existing.yml',
          content: 'version: 2\nmodels: []\n',
        },
      ],
      deletes: ['analytics/models/sources/obsolete.yml'],
    });

    expect(result).toMatchObject({
      kind: 'applied',
      idempotencyKey: 'source-import-1',
      deduplicated: false,
      writes: [
        {
          path: 'analytics/models/sources/existing.yml',
          contentSha256: sha256('version: 2\nmodels: []\n'),
        },
        {
          path: 'analytics/models/sources/new.yml',
          contentSha256: sha256('version: 2\n'),
        },
      ],
      deletes: ['analytics/models/sources/obsolete.yml'],
    });
    await expect(read('analytics/models/sources/existing.yml')).resolves.toBe(
      'version: 2\nmodels: []\n'
    );
    await expect(read('analytics/models/sources/new.yml')).resolves.toBe('version: 2\n');
    await expect(read('analytics/models/sources/obsolete.yml')).rejects.toThrow();
  });

  it('rejects every stale revision before publishing any file', async () => {
    await seed('analytics/models/sources/existing.yml', 'version: 2\n');
    const gateway = new LocalWorkspaceFileBatchMutationGateway({ root: namespaceRoot });

    const result = await gateway.apply(SCOPE, {
      idempotencyKey: 'source-import-stale',
      expectedFiles: [
        {
          path: 'analytics/models/sources/existing.yml',
          expectedContentSha256: sha256('stale content'),
        },
        { path: 'analytics/models/sources/new.yml' },
      ],
      writes: [
        { path: 'analytics/models/sources/existing.yml', content: 'changed: true\n' },
        { path: 'analytics/models/sources/new.yml', content: 'new: true\n' },
      ],
      deletes: [],
    });

    expect(result).toEqual({
      kind: 'conflict',
      conflicts: [
        {
          path: 'analytics/models/sources/existing.yml',
          currentContentSha256: sha256('version: 2\n'),
        },
      ],
    });
    await expect(read('analytics/models/sources/existing.yml')).resolves.toBe('version: 2\n');
    await expect(read('analytics/models/sources/new.yml')).rejects.toThrow();
  });

  it('restores every original and removes new files when publication fails midway', async () => {
    await seed('analytics/models/sources/a.yml', 'a: original\n');
    await seed('analytics/models/sources/b.yml', 'b: original\n');
    let publishedWrites = 0;
    const operations = createFileSystemOperations({
      renameFile: async (source, target) => {
        if (
          source.includes('.next.') &&
          target.includes(`${path.sep}models${path.sep}sources${path.sep}`)
        ) {
          publishedWrites += 1;
          if (publishedWrites === 2) {
            throw new Error('injected second publication failure');
          }
        }
        await rename(source, target);
      },
    });
    const gateway = new LocalWorkspaceFileBatchMutationGateway({
      root: namespaceRoot,
      mutationCoordinator: new LocalWorkspaceFileMutationCoordinator(operations),
    });

    await expect(
      gateway.apply(SCOPE, {
        idempotencyKey: 'source-import-failure',
        expectedFiles: [
          {
            path: 'analytics/models/sources/a.yml',
            expectedContentSha256: sha256('a: original\n'),
          },
          {
            path: 'analytics/models/sources/b.yml',
            expectedContentSha256: sha256('b: original\n'),
          },
          { path: 'analytics/models/sources/c.yml' },
        ],
        writes: [
          { path: 'analytics/models/sources/a.yml', content: 'a: changed\n' },
          { path: 'analytics/models/sources/b.yml', content: 'b: changed\n' },
          { path: 'analytics/models/sources/c.yml', content: 'c: new\n' },
        ],
        deletes: [],
      })
    ).rejects.toThrow('injected second publication failure');

    await expect(read('analytics/models/sources/a.yml')).resolves.toBe('a: original\n');
    await expect(read('analytics/models/sources/b.yml')).resolves.toBe('b: original\n');
    await expect(read('analytics/models/sources/c.yml')).rejects.toThrow();
  });

  it('deduplicates a completed request and rejects reuse with different content', async () => {
    const gateway = new LocalWorkspaceFileBatchMutationGateway({ root: namespaceRoot });
    const mutation: WorkspaceFileBatchMutation = {
      idempotencyKey: 'source-import-replay',
      expectedFiles: [{ path: 'analytics/models/sources/new.yml' }],
      writes: [{ path: 'analytics/models/sources/new.yml', content: 'version: 2\n' }],
      deletes: [],
    };

    await expect(gateway.apply(SCOPE, mutation)).resolves.toMatchObject({
      kind: 'applied',
      deduplicated: false,
    });
    await expect(gateway.apply(SCOPE, mutation)).resolves.toMatchObject({
      kind: 'applied',
      deduplicated: true,
    });
    await expect(
      gateway.apply(SCOPE, {
        ...mutation,
        writes: [{ path: 'analytics/models/sources/new.yml', content: 'version: 3\n' }],
      })
    ).rejects.toBeInstanceOf(WorkspaceFileBatchIdempotencyConflictError);
  });

  it('deduplicates an equivalent retry rebuilt from the post-publication revisions', async () => {
    const gateway = new LocalWorkspaceFileBatchMutationGateway({ root: namespaceRoot });
    const workspacePath = 'analytics/models/sources/new.yml';
    const content = 'version: 2\n';

    await expect(
      gateway.apply(SCOPE, {
        idempotencyKey: 'source-import-post-publication-retry',
        expectedFiles: [{ path: workspacePath }],
        writes: [{ path: workspacePath, content }],
        deletes: [],
      })
    ).resolves.toMatchObject({ kind: 'applied', deduplicated: false });

    await expect(
      gateway.apply(SCOPE, {
        idempotencyKey: 'source-import-post-publication-retry',
        expectedFiles: [{ path: workspacePath, expectedContentSha256: sha256(content) }],
        writes: [{ path: workspacePath, content }],
        deletes: [],
      })
    ).resolves.toMatchObject({ kind: 'applied', deduplicated: true });
  });

  it('reapplies the same request after a compensating batch restores its preconditions', async () => {
    const gateway = new LocalWorkspaceFileBatchMutationGateway({ root: namespaceRoot });
    const path = 'analytics/models/sources/new.yml';
    const content = 'version: 2\n';
    const mutation: WorkspaceFileBatchMutation = {
      idempotencyKey: 'source-import-retry:apply',
      expectedFiles: [{ path }],
      writes: [{ path, content }],
      deletes: [],
    };

    const applied = await gateway.apply(SCOPE, mutation);
    expect(applied).toMatchObject({ kind: 'applied', deduplicated: false });

    await expect(
      gateway.apply(SCOPE, {
        idempotencyKey: 'source-import-retry:rollback',
        expectedFiles: [{ path, expectedContentSha256: sha256(content) }],
        writes: [],
        deletes: [path],
      })
    ).resolves.toMatchObject({ kind: 'applied', deduplicated: false });
    await expect(read(path)).rejects.toThrow();

    await expect(gateway.apply(SCOPE, mutation)).resolves.toMatchObject({
      kind: 'applied',
      deduplicated: false,
    });
    await expect(read(path)).resolves.toBe(content);
  });

  async function seed(workspacePath: string, content: string): Promise<void> {
    const absolutePath = path.join(
      resolveWorkspaceScopeStorageRoot(namespaceRoot, SCOPE),
      workspacePath
    );
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, 'utf8');
  }

  async function read(workspacePath: string): Promise<string> {
    return readFile(
      path.join(resolveWorkspaceScopeStorageRoot(namespaceRoot, SCOPE), workspacePath),
      'utf8'
    );
  }
});

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function createFileSystemOperations(
  overrides: Partial<LocalWorkspaceFileMutationOperations> = {}
): LocalWorkspaceFileMutationOperations {
  return {
    createDirectory: async (directoryPath) => {
      await mkdir(directoryPath, { recursive: true });
    },
    writeTemporaryFile: async (filePath, content) => {
      await writeFile(filePath, content, { encoding: 'utf8', flag: 'wx' });
    },
    renameFile: rename,
    removeFile: async (filePath) => {
      await rm(filePath, { force: true });
    },
    deleteFile: async (filePath) => {
      await rm(filePath, { force: false });
    },
    removeDirectory: async (directoryPath) => {
      await rm(directoryPath, { recursive: true, force: true });
    },
    ...overrides,
  };
}
