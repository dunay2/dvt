import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  LocalWorkspaceRootInventory,
  readWorkspaceRootInventory,
} from '../../../src/infrastructure/workspaceFiles/LocalWorkspaceRootInventory.js';
import { resolveWorkspaceScopeStorageRoot } from '../../../src/infrastructure/workspaceFiles/workspaceScopeStoragePath.js';
const scope = { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' };
describe('LocalWorkspaceRootInventory', () => {
  let root: string;
  let directory: string;
  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'dvt-root-inventory-'));
    directory = resolveWorkspaceScopeStorageRoot(root, scope);
    await mkdir(path.join(directory, 'imported/empty/nested'), { recursive: true });
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });
  it('includes hidden files and removes only empty source directories', async () => {
    const inventory = new LocalWorkspaceRootInventory(root);
    await writeFile(path.join(directory, 'imported/.hidden'), 'keep');
    expect(await inventory.listFiles(scope, 'imported')).toEqual(['imported/.hidden']);
    expect(await inventory.removeEmptyDirectories(scope, 'imported')).toBe(false);
    await rm(path.join(directory, 'imported/.hidden'));
    expect(await inventory.removeEmptyDirectories(scope, 'imported')).toBe(true);
    expect(await inventory.listFiles(scope, 'imported')).toEqual([]);
    await expect(inventory.removeEmptyDirectories(scope, '.')).rejects.toThrow();
  });
  it('rejects symbolic links and junctions rather than following an external subtree', async () => {
    await symlink(
      root,
      path.join(directory, 'imported/external'),
      process.platform === 'win32' ? 'junction' : 'dir'
    );
    await expect(
      new LocalWorkspaceRootInventory(root).listFiles(scope, 'imported')
    ).rejects.toThrow();
  });
  it('bounds empty-directory traversal and file counts', async () => {
    await mkdir(path.join(directory, 'imported/a'));
    await mkdir(path.join(directory, 'imported/b'));
    await mkdir(path.join(directory, 'imported/c'));
    await expect(readWorkspaceRootInventory(root, scope, 'imported', 1)).rejects.toThrow();
  });
  it('rejects bytes that would be changed by UTF-8 decoding', async () => {
    await writeFile(path.join(directory, 'imported/invalid.sql'), Buffer.from([0xc3, 0x28]));
    await expect(
      new LocalWorkspaceRootInventory(root).listFiles(scope, 'imported')
    ).rejects.toThrow();
  });
});
