/** Prove complete directory discovery and scope isolation under the existing tree bound. */
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, expect, it } from 'vitest';

import { LocalWorkspaceFileRepository } from '../../../src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.js';
import { resolveWorkspaceScopeStorageRoot } from '../../../src/infrastructure/workspaceFiles/workspaceScopeStoragePath.js';

const scope = { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' };
let root: string;
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'dvt-directory-page-'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

it('applies the same visible file policy and cannot list a linked or nested directory as direct files', async () => {
  const repository = new LocalWorkspaceFileRepository({ root });
  const parent = resolveWorkspaceScopeStorageRoot(root, scope);
  const library = path.join(parent, 'dvt_templates');
  const outside = path.join(root, 'other-workspace');
  await mkdir(path.join(library, 'nested'), { recursive: true });
  await mkdir(outside);
  for (const filename of ['model.json', '.private.json', 'untracked.exe', 'nested/archived.json']) {
    await writeFile(path.join(library, filename), 'sample');
  }
  await writeFile(path.join(outside, 'private.json'), 'secret');
  await symlink(outside, path.join(library, 'other'), 'junction');
  await expect(
    repository.listDirectoryPage(scope, { directory: 'dvt_templates' })
  ).resolves.toEqual({
    entries: ['dvt_templates/model.json'],
    nextCursor: null,
  });
  await expect(
    repository.listDirectoryPage(scope, { directory: 'dvt_templates/other' })
  ).rejects.toThrow();
});

it('reads 501 variants in order after unrelated files exhaust the common 500-file tree', async () => {
  const repository = new LocalWorkspaceFileRepository({ root });
  const dir = resolveWorkspaceScopeStorageRoot(root, scope);
  const names = Array.from({ length: 501 }, (_, i) => String(i).padStart(3, '0') + '.json');
  for (const [folder, count] of [
    ['archive', 500],
    ['dvt_templates', 501],
  ] as const) {
    const target = path.join(dir, folder);
    await mkdir(target, { recursive: true });
    await Promise.all(
      names.slice(0, count).map((name) => writeFile(path.join(target, name), '{}'))
    );
  }
  const tree = await repository.listFiles(scope);
  expect(tree.map((x) => x.path)).toEqual(['archive']);
  expect(tree[0]?.children).toHaveLength(500);
  const found: string[] = [];
  let cursor: string | null = null;
  do {
    const page = await repository.listDirectoryPage(scope, { directory: 'dvt_templates', cursor });
    expect(page.entries.length).toBeLessThanOrEqual(100);
    found.push(...page.entries);
    cursor = page.nextCursor;
    if (found.length === 100 && cursor) {
      await expect(
        repository.listDirectoryPage(
          { ...scope, environmentId: 'other' },
          { directory: 'dvt_templates', cursor }
        )
      ).rejects.toThrow();
      await expect(
        repository.listDirectoryPage(scope, { directory: 'archive', cursor })
      ).rejects.toThrow();
    }
  } while (cursor);
  expect(found).toEqual(names.map((n) => 'dvt_templates/' + n));
  await expect(
    repository.listDirectoryPage({ ...scope, projectId: 'other' }, { directory: 'dvt_templates' })
  ).resolves.toEqual({ entries: [], nextCursor: null });
  for (const directory of [
    '../archive',
    '.git',
    'node_modules',
    'node_modules./nested',
    '/absolute',
    'archive/../dvt_templates',
  ]) {
    await expect(repository.listDirectoryPage(scope, { directory })).rejects.toThrow();
  }
  await expect(
    repository.listDirectoryPage(scope, { directory: 'dvt_templates', cursor: 'invalid' })
  ).rejects.toThrow();
});
