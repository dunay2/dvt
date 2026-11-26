/** Encode canonical history cursors bound to the authorized workspace and connection filter. */
import {
  WorkspaceSqlExecutionIdSchema,
  type ListWorkspaceSqlExecutionsRequest,
  type WorkspaceSqlExecution,
} from '@dvt/contracts';
import { z } from 'zod';

import { WorkspaceSqlOperationError } from '../../application/ports/sqlWorksheet.js';
import type { WorkspaceStorageScope } from '../../application/ports/workspaceFiles.js';
import { buildWorkspaceScopeStorageKey } from '../workspaceFiles/workspaceScopeStoragePath.js';

type CursorContext = Readonly<{
  scope: WorkspaceStorageScope;
  connectionId: string | undefined;
  executionId: string;
}>;

export function encodeSqlHistoryCursor(input: CursorContext): string {
  return Buffer.from(
    JSON.stringify([
      buildWorkspaceScopeStorageKey(input.scope),
      input.connectionId ?? '',
      input.executionId,
    ])
  ).toString('base64url');
}

export function decodeSqlHistoryCursor(
  scope: WorkspaceStorageScope,
  input: ListWorkspaceSqlExecutionsRequest
): string | undefined {
  if (input.cursor === undefined) return undefined;
  try {
    const [, , id] = z
      .tuple([
        z.literal(buildWorkspaceScopeStorageKey(scope)),
        z.literal(input.connectionId ?? ''),
        z.string(),
      ])
      .parse(JSON.parse(Buffer.from(input.cursor, 'base64url').toString('utf8')));
    const executionId = WorkspaceSqlExecutionIdSchema.parse(id);
    if (
      encodeSqlHistoryCursor({ scope, connectionId: input.connectionId, executionId }) !==
      input.cursor
    )
      throw new Error('Noncanonical cursor.');
    return executionId;
  } catch {
    throw new WorkspaceSqlOperationError('invalid_cursor');
  }
}

export function matchesSqlHistoryConnection(
  record: WorkspaceSqlExecution,
  connectionId: string | undefined
): boolean {
  return connectionId === undefined || record.connectionRef.connectionId === connectionId;
}
