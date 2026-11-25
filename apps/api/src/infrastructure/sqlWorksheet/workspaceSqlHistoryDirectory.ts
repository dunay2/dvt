/** Safely select a bounded ordered page of immutable execution files from a scoped private directory. */
import { opendir } from 'node:fs/promises';

import {
  WorkspaceSqlExecutionIdSchema,
  type ListWorkspaceSqlExecutionsRequest,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';

import { WorkspaceSqlOperationError } from '../../application/ports/sqlWorksheet.js';
import type { WorkspaceStorageScope } from '../../application/ports/workspaceFiles.js';
import { resolveWorkspaceScopeStorageRoot } from '../workspaceFiles/workspaceScopeStoragePath.js';

import { assertSqlHistoryStorage, isMissingHistoryPath } from './workspaceSqlHistoryStorage.js';

export async function selectSqlHistoryIds(
  input: Readonly<{
    namespace: string;
    scope: WorkspaceStorageScope;
    request: ListWorkspaceSqlExecutionsRequest;
    after: string | undefined;
  }>
): Promise<string[]> {
  const ids: string[] = [];
  try {
    await assertSqlHistoryStorage(input.namespace, input.scope);
    const directory = await opendir(resolveWorkspaceScopeStorageRoot(input.namespace, input.scope));
    for await (const entry of directory) {
      if (!entry.isFile()) throw new Error('Invalid history entry.');
      const id = completedExecutionId(entry.name);
      if (id === undefined) continue;
      if (!isSelected(id, input)) continue;
      retainPageCandidate(ids, id, input.request.limit);
    }
    return ids;
  } catch (error) {
    if (isMissingHistoryPath(error)) return [];
    throw new WorkspaceSqlOperationError('unavailable');
  }
}

function completedExecutionId(name: string): string | undefined {
  const [id, ...suffix] = name.split('.');
  const executionId = WorkspaceSqlExecutionIdSchema.parse(id);
  const tail = suffix.join('.');
  if (tail === 'json') return executionId;
  if (/^json\.[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\.tmp$/u.test(tail)) return undefined;
  throw new Error('Invalid history filename suffix.');
}

function retainPageCandidate(ids: string[], id: string, limit: number): void {
  ids.push(id);
  ids.sort();
  if (ids.length > limit + 1) ids.pop();
}

function isSelected(id: string, input: Parameters<typeof selectSqlHistoryIds>[0]): boolean {
  if (input.after !== undefined && id <= input.after) return false;
  if (input.request.connectionId === undefined) return true;
  return id.slice(14, 46) === sha256HexUtf8(input.request.connectionId).slice(0, 32);
}
