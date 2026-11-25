import { mkdir, mkdtemp, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { WorkspaceSqlExecution } from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LocalWorkspaceSqlExecutionHistoryRepository } from '../../../src/infrastructure/sqlWorksheet/LocalWorkspaceSqlExecutionHistoryRepository.js';
import { resolveWorkspaceScopeStorageRoot } from '../../../src/infrastructure/workspaceFiles/workspaceScopeStoragePath.js';
import {
  SQL_SCOPE,
  workspaceSqlExecution,
} from '../../application/services/sqlWorksheet/fixtures.js';

let parent: string;
let root: string;
let history: LocalWorkspaceSqlExecutionHistoryRepository;
beforeEach(async () => {
  parent = await realpath(tmpdir());
  root = await mkdtemp(path.join(parent, 'dvt-sql-history-'));
  history = new LocalWorkspaceSqlExecutionHistoryRepository({ root });
});
afterEach(async () => {
  expect(path.dirname(root)).toBe(parent);
  expect(path.basename(root)).toMatch(/^dvt-sql-history-/u);
  await rm(root, { recursive: true, force: true });
});

function execution(index: number, connectionId = 'warehouse'): WorkspaceSqlExecution {
  const fingerprint = sha256HexUtf8(connectionId).slice(0, 32);
  return workspaceSqlExecution({
    executionId: `${8204435199976 - index}-${fingerprint}-11111111-1111-4111-8111-${String(index + 1).padStart(12, '0')}`,
    connectionRef: { schemaVersion: 'connection-ref.v1', connectionId, provider: 'postgres' },
    sql: `select ${index + 1} as answer`,
    finishedAt: new Date(Date.parse('2026-11-25T00:00:00.023Z') + index).toISOString(),
  });
}

describe('immutable SQL history independent of Git', () => {
  it('recovers completed SQL and metadata after restart without saving result rows or project files', async () => {
    const first = execution(0);
    await history.append(SQL_SCOPE, first);
    const restarted = new LocalWorkspaceSqlExecutionHistoryRepository({ root });
    expect(await restarted.get(SQL_SCOPE, first.executionId)).toEqual(first);
    const page = await restarted.list(SQL_SCOPE, { limit: 20 });
    expect(page.executions).toEqual([first]);
    expect(page.executions[0]).not.toHaveProperty('rows');
    expect(await readdir(root)).toEqual(['.dvt']);
  });

  it('keeps concurrent executions and stable pages when newer work arrives', async () => {
    const first = execution(0);
    const second = execution(1);
    await Promise.all([history.append(SQL_SCOPE, first), history.append(SQL_SCOPE, second)]);
    const page = await history.list(SQL_SCOPE, { limit: 1 });
    expect(page.executions).toEqual([second]);
    expect(page.nextCursor).not.toBeNull();
    await history.append(SQL_SCOPE, execution(2));
    const next = await history.list(SQL_SCOPE, { limit: 1, cursor: page.nextCursor! });
    expect(next.executions).toEqual([first]);
    expect(next.nextCursor).toBeNull();
  });

  it('isolates workspace scopes, filter cursors and connection history', async () => {
    await history.append(SQL_SCOPE, execution(0));
    await history.append(SQL_SCOPE, execution(1, 'other'));
    const page = await history.list(SQL_SCOPE, { limit: 1 });
    const foreign = { ...SQL_SCOPE, projectId: 'foreign' };
    expect(await history.get(foreign, execution(0).executionId)).toBeNull();
    expect((await history.list(foreign, { limit: 20 })).executions).toEqual([]);
    await expect(
      history.list(foreign, { limit: 1, cursor: page.nextCursor! })
    ).rejects.toMatchObject({ reason: 'invalid_cursor' });
    await expect(
      history.list(SQL_SCOPE, { limit: 1, cursor: page.nextCursor!, connectionId: 'warehouse' })
    ).rejects.toMatchObject({ reason: 'invalid_cursor' });
    expect(
      (await history.list(SQL_SCOPE, { limit: 20, connectionId: 'warehouse' })).executions
    ).toEqual([execution(0)]);
  });

  it('allows exact persistence replay but never overwrites a completed execution', async () => {
    const first = execution(0);
    await history.append(SQL_SCOPE, first);
    await history.append(SQL_SCOPE, first);
    await expect(history.append(SQL_SCOPE, { ...first, sql: 'select 999' })).rejects.toMatchObject({
      reason: 'unavailable',
    });
    expect(await history.get(SQL_SCOPE, first.executionId)).toEqual(first);
  });

  it('ignores only the atomic writer temporary record while rejecting non-file evidence', async () => {
    const first = execution(0);
    await history.append(SQL_SCOPE, first);
    const directory = resolveWorkspaceScopeStorageRoot(
      path.join(root, '.dvt', 'sql-worksheet-history'),
      SQL_SCOPE
    );
    await writeFile(
      path.join(
        directory,
        `${execution(1).executionId}.json.11111111-1111-4111-8111-111111111111.tmp`
      ),
      'incomplete'
    );
    expect((await history.list(SQL_SCOPE, { limit: 20 })).executions).toEqual([first]);
    await mkdir(path.join(directory, `${execution(2).executionId}.json`));
    await expect(history.list(SQL_SCOPE, { limit: 20 })).rejects.toMatchObject({
      reason: 'unavailable',
    });
    await expect(history.get(SQL_SCOPE, execution(2).executionId)).rejects.toMatchObject({
      reason: 'unavailable',
    });
  });

  it('rejects corrupt stored evidence and malformed cursors rather than returning empty success', async () => {
    const first = execution(0);
    await history.append(SQL_SCOPE, first);
    const namespace = path.join(root, '.dvt', 'sql-worksheet-history');
    const file = path.join(
      resolveWorkspaceScopeStorageRoot(namespace, SQL_SCOPE),
      `${first.executionId}.json`
    );
    await writeFile(file, JSON.stringify({ ...first, rows: [{ values: ['must-not-persist'] }] }));
    await expect(history.get(SQL_SCOPE, first.executionId)).rejects.toMatchObject({
      reason: 'unavailable',
    });
    await expect(history.list(SQL_SCOPE, { limit: 20 })).rejects.toMatchObject({
      reason: 'unavailable',
    });
    await expect(
      history.list(SQL_SCOPE, { limit: 20, cursor: '../foreign' })
    ).rejects.toMatchObject({ reason: 'invalid_cursor' });
  });
});
