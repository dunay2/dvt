import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WorkspaceFileNotFoundError } from '../../../src/application/ports/workspaceFiles.js';
import { LocalWorkspaceFileRepository } from '../../../src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.js';
import {
  buildWorkspaceScopeStorageKey,
  resolveWorkspaceScopeStorageRoot,
} from '../../../src/infrastructure/workspaceFiles/workspaceScopeStoragePath.js';

const SCOPE_A = {
  tenantId: 'tenant/a',
  projectId: 'project:a',
  environmentId: '..',
} as const;

const SCOPE_B = {
  tenantId: 'tenant/a',
  projectId: 'project:a',
  environmentId: '../other',
} as const;

describe('LocalWorkspaceFileRepository', () => {
  let namespaceRoot: string;

  beforeEach(async () => {
    namespaceRoot = await mkdtemp(path.join(tmpdir(), 'dvt-scoped-workspace-files-'));
  });

  afterEach(async () => {
    await rm(namespaceRoot, { recursive: true, force: true });
  });

  it('isolates the same logical file path between workspace scopes', async () => {
    const repository = new LocalWorkspaceFileRepository({ root: namespaceRoot });

    await repository.saveFileContent(SCOPE_A, {
      path: 'models/orders.sql',
      content: 'select 1 as scope_a',
      expectedRevision: { kind: 'absent' },
    });

    await expect(repository.getFileContent(SCOPE_B, 'models/orders.sql')).rejects.toBeInstanceOf(
      WorkspaceFileNotFoundError
    );

    await repository.saveFileContent(SCOPE_B, {
      path: 'models/orders.sql',
      content: 'select 2 as scope_b',
      expectedRevision: { kind: 'absent' },
    });

    await expect(repository.getFileContent(SCOPE_A, 'models/orders.sql')).resolves.toMatchObject({
      content: 'select 1 as scope_a',
    });
    await expect(repository.getFileContent(SCOPE_B, 'models/orders.sql')).resolves.toMatchObject({
      content: 'select 2 as scope_b',
    });
  });

  it('derives stable path-safe roots inside the configured namespace', () => {
    const storageKey = buildWorkspaceScopeStorageKey(SCOPE_A);
    const scopeRoot = resolveWorkspaceScopeStorageRoot(namespaceRoot, SCOPE_A);
    const namespaceRelativePath = path.relative(namespaceRoot, scopeRoot);

    expect(storageKey).toMatch(/^[a-f0-9]{64}$/);
    expect(buildWorkspaceScopeStorageKey(SCOPE_A)).toBe(storageKey);
    expect(buildWorkspaceScopeStorageKey(SCOPE_B)).not.toBe(storageKey);
    expect(namespaceRelativePath).toBe(path.join('scopes', storageKey));
    expect(namespaceRelativePath.startsWith('..')).toBe(false);
    expect(path.isAbsolute(namespaceRelativePath)).toBe(false);
  });

  it('returns a stable SHA-256 revision for the exact file content', async () => {
    const repository = new LocalWorkspaceFileRepository({ root: namespaceRoot });
    const content = 'select 1 as order_id\n';

    await repository.saveFileContent(SCOPE_A, {
      path: 'models/orders.sql',
      content,
      expectedRevision: { kind: 'absent' },
    });

    await expect(repository.getFileContent(SCOPE_A, 'models/orders.sql')).resolves.toMatchObject({
      content,
      contentSha256: createHash('sha256').update(content, 'utf8').digest('hex'),
    });
  });

  it('saves, lists, and reads dbt seed CSV files through the scoped repository', async () => {
    const repository = new LocalWorkspaceFileRepository({ root: namespaceRoot });
    const content = 'code,name\nES,Spain\nPT,Portugal\n';

    await expect(
      repository.saveFileContent(SCOPE_A, {
        path: 'analytics/seeds/country_codes.csv',
        content,
        expectedRevision: { kind: 'absent' },
      })
    ).resolves.toMatchObject({
      kind: 'saved',
      disposition: 'created',
    });
    await expect(repository.listFiles(SCOPE_A)).resolves.toEqual([
      {
        path: 'analytics',
        name: 'analytics',
        kind: 'directory',
        children: [
          {
            path: 'analytics/seeds',
            name: 'seeds',
            kind: 'directory',
            children: [
              {
                path: 'analytics/seeds/country_codes.csv',
                name: 'country_codes.csv',
                kind: 'file',
              },
            ],
          },
        ],
      },
    ]);
    await expect(
      repository.getFileContent(SCOPE_A, 'analytics/seeds/country_codes.csv')
    ).resolves.toMatchObject({
      language: 'csv',
      content,
    });
  });

  it('rejects a stale absent revision even when the requested content already exists', async () => {
    const repository = new LocalWorkspaceFileRepository({ root: namespaceRoot });
    const command = {
      path: 'models/orders.sql',
      content: 'select 1 as order_id\n',
      expectedRevision: { kind: 'absent' as const },
    };

    await expect(repository.saveFileContent(SCOPE_A, command)).resolves.toMatchObject({
      kind: 'saved',
      disposition: 'created',
    });
    await expect(repository.saveFileContent(SCOPE_A, command)).resolves.toMatchObject({
      kind: 'conflict',
      currentContentSha256: createHash('sha256').update(command.content, 'utf8').digest('hex'),
    });
  });

  it('allows exactly one concurrent writer across repository instances', async () => {
    const firstRepository = new LocalWorkspaceFileRepository({ root: namespaceRoot });
    const secondRepository = new LocalWorkspaceFileRepository({ root: namespaceRoot });
    const initial = await firstRepository.saveFileContent(SCOPE_A, {
      path: 'models/orders.sql',
      content: 'select 1 as order_id\n',
      expectedRevision: { kind: 'absent' },
    });
    expect(initial.kind).toBe('saved');
    if (initial.kind !== 'saved') throw new Error('Expected the fixture write to succeed.');

    const results = await Promise.all([
      firstRepository.saveFileContent(SCOPE_A, {
        path: 'models/orders.sql',
        content: 'select 2 as order_id\n',
        expectedRevision: { kind: 'content_sha256', value: initial.contentSha256 },
      }),
      secondRepository.saveFileContent(SCOPE_A, {
        path: 'models/orders.sql',
        content: 'select 3 as order_id\n',
        expectedRevision: { kind: 'content_sha256', value: initial.contentSha256 },
      }),
    ]);

    expect(results.filter((result) => result.kind === 'saved')).toHaveLength(1);
    expect(results.filter((result) => result.kind === 'conflict')).toHaveLength(1);
    await expect(
      firstRepository.getFileContent(SCOPE_A, 'models/orders.sql')
    ).resolves.toMatchObject({
      contentSha256: results.find((result) => result.kind === 'saved')?.contentSha256,
    });
  });

  it('deletes only the file revision named by the command', async () => {
    const repository = new LocalWorkspaceFileRepository({ root: namespaceRoot });
    const created = await repository.saveFileContent(SCOPE_A, {
      path: 'models/orders.sql',
      content: 'select 1 as order_id\n',
      expectedRevision: { kind: 'absent' },
    });
    expect(created.kind).toBe('saved');
    if (created.kind !== 'saved') throw new Error('Expected the fixture write to succeed.');

    const updated = await repository.saveFileContent(SCOPE_A, {
      path: 'models/orders.sql',
      content: 'select 2 as order_id\n',
      expectedRevision: { kind: 'content_sha256', value: created.contentSha256 },
    });
    expect(updated.kind).toBe('saved');
    if (updated.kind !== 'saved') throw new Error('Expected the fixture update to succeed.');

    await expect(
      repository.deleteFileContent(SCOPE_A, {
        path: 'models/orders.sql',
        expectedRevision: { kind: 'content_sha256', value: created.contentSha256 },
      })
    ).resolves.toMatchObject({
      kind: 'conflict',
      currentContentSha256: updated.contentSha256,
    });
    await expect(repository.getFileContent(SCOPE_A, 'models/orders.sql')).resolves.toMatchObject({
      content: 'select 2 as order_id\n',
    });

    await expect(
      repository.deleteFileContent(SCOPE_A, {
        path: 'models/orders.sql',
        expectedRevision: { kind: 'content_sha256', value: updated.contentSha256 },
      })
    ).resolves.toEqual({ kind: 'deleted' });
    await expect(
      repository.deleteFileContent(SCOPE_A, {
        path: 'models/orders.sql',
        expectedRevision: { kind: 'content_sha256', value: updated.contentSha256 },
      })
    ).resolves.toEqual({ kind: 'unchanged' });
  });
});
