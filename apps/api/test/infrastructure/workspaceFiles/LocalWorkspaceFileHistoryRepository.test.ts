/** Prove Git versions belong to one admitted workspace file. */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, expect, it } from 'vitest';

import type { WorkspaceFileVersionCommitResult } from '../../../src/application/ports/workspaceFileHistory.js';
import { LocalWorkspaceFileHistoryRepository } from '../../../src/infrastructure/workspaceFiles/LocalWorkspaceFileHistoryRepository.js';
import { LocalWorkspaceFileRepository } from '../../../src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.js';

const scope = { tenantId: 'tenant', projectId: 'operations', environmentId: 'dev' };
const file = 'operations/tarea.task.sql';
let root: string;
let files: LocalWorkspaceFileRepository;
let history: LocalWorkspaceFileHistoryRepository;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'dvt-operation-versions-'));
  files = new LocalWorkspaceFileRepository({ root });
  history = new LocalWorkspaceFileHistoryRepository({ root, maxEntries: 1 });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

it('records real Git snapshots, pages older commits and replays an unchanged version', async () => {
  expect(await history.listFileHistory(scope, file)).toEqual([]);
  await files.saveFileContent(scope, {
    path: file,
    content: 'select 1;',
    expectedRevision: { kind: 'absent' },
  });
  const original = await files.getFileContent(scope, file);
  const commit = (expectedContentSha256: string): Promise<WorkspaceFileVersionCommitResult> =>
    history.commitFileVersion(scope, { path: file, expectedContentSha256, author: 'editor' });
  const first = await commit(original.contentSha256);
  expect(await commit(original.contentSha256)).toEqual(first);

  await files.saveFileContent(scope, {
    path: file,
    content: 'select 2;',
    expectedRevision: { kind: 'content_sha256', value: original.contentSha256 },
  });
  expect(await commit(original.contentSha256)).toEqual({ kind: 'conflict' });
  const current = await files.getFileContent(scope, file);
  const second = await commit(current.contentSha256);
  if (first.kind !== 'committed' || second.kind !== 'committed')
    throw new Error('Missing Git commit');

  expect(await history.listFileHistory(scope, file)).toMatchObject([
    { commitSha: second.commitSha },
  ]);
  expect(await history.listFileHistory(scope, file, second.commitSha)).toMatchObject([
    { commitSha: first.commitSha },
  ]);
  expect(await history.getFileVersionContent(scope, file, first.commitSha)).toBe('select 1;');
  expect(
    await history.getFileVersionContent(scope, 'operations/other.task.sql', first.commitSha)
  ).toBeNull();
  expect(
    await history.getFileVersionContent({ ...scope, projectId: 'other' }, file, first.commitSha)
  ).toBeNull();
});
