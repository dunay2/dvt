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

    await repository.saveFileContent(SCOPE_A, 'models/orders.sql', 'select 1 as scope_a');

    await expect(repository.getFileContent(SCOPE_B, 'models/orders.sql')).rejects.toBeInstanceOf(
      WorkspaceFileNotFoundError
    );

    await repository.saveFileContent(SCOPE_B, 'models/orders.sql', 'select 2 as scope_b');

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
});
