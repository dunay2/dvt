/** Persist immutable completed SQL facts in a scoped private namespace, independently of Git. */
import path from 'node:path';

import {
  ListWorkspaceSqlExecutionsRequestSchema,
  WorkspaceSqlExecutionSchema,
  type ListWorkspaceSqlExecutionsRequest,
  type WorkspaceSqlExecution,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';

import {
  WorkspaceSqlOperationError,
  type IWorkspaceSqlExecutionHistory,
} from '../../application/ports/sqlWorksheet.js';
import {
  WorkspaceFileNotFoundError,
  type WorkspaceStorageScope,
} from '../../application/ports/workspaceFiles.js';
import { LocalWorkspaceFileRepository } from '../workspaceFiles/LocalWorkspaceFileRepository.js';

import {
  decodeSqlHistoryCursor,
  encodeSqlHistoryCursor,
  matchesSqlHistoryConnection,
} from './workspaceSqlHistoryCursor.js';
import { selectSqlHistoryIds } from './workspaceSqlHistoryDirectory.js';
import {
  assertSqlHistoryRecordFile,
  assertSqlHistoryStorage,
} from './workspaceSqlHistoryStorage.js';

export class LocalWorkspaceSqlExecutionHistoryRepository implements IWorkspaceSqlExecutionHistory {
  private readonly namespace: string;
  private readonly files: LocalWorkspaceFileRepository;

  public constructor(options: Readonly<{ root: string }>) {
    this.namespace = path.resolve(options.root, '.dvt', 'sql-worksheet-history');
    this.files = new LocalWorkspaceFileRepository({ root: this.namespace });
  }

  public async append(
    scope: WorkspaceStorageScope,
    execution: WorkspaceSqlExecution
  ): Promise<void> {
    try {
      const record = WorkspaceSqlExecutionSchema.parse(execution);
      await assertSqlHistoryStorage(this.namespace, scope);
      const target = await assertSqlHistoryRecordFile({
        namespace: this.namespace,
        scope,
        executionId: record.executionId,
      });
      const content = JSON.stringify(record);
      const result = await this.files.saveFileContent(scope, {
        path: target.workspacePath,
        content,
        expectedRevision: { kind: 'absent' },
      });
      if (result.kind === 'conflict' && result.currentContentSha256 !== sha256HexUtf8(content))
        throw new WorkspaceSqlOperationError('unavailable');
    } catch {
      throw new WorkspaceSqlOperationError('unavailable');
    }
  }

  public async get(
    scope: WorkspaceStorageScope,
    executionId: string
  ): Promise<WorkspaceSqlExecution | null> {
    try {
      await assertSqlHistoryStorage(this.namespace, scope);
      const target = await assertSqlHistoryRecordFile({
        namespace: this.namespace,
        scope,
        executionId,
      });
      const file = await this.files.getFileContent(scope, target.workspacePath);
      const record = WorkspaceSqlExecutionSchema.parse(JSON.parse(file.content));
      if (record.executionId !== executionId) throw new Error('History identity mismatch.');
      return record;
    } catch (error) {
      if (error instanceof WorkspaceFileNotFoundError) return null;
      throw new WorkspaceSqlOperationError('unavailable');
    }
  }

  public async list(scope: WorkspaceStorageScope, request: ListWorkspaceSqlExecutionsRequest) {
    const input = ListWorkspaceSqlExecutionsRequestSchema.parse(request);
    const after = await this.readCursor(scope, input);
    const ids = await selectSqlHistoryIds({
      namespace: this.namespace,
      scope,
      request: input,
      after,
    });
    const records: WorkspaceSqlExecution[] = [];
    for (const id of ids) {
      const record = await this.get(scope, id);
      if (record === null) throw new WorkspaceSqlOperationError('unavailable');
      if (matchesSqlHistoryConnection(record, input.connectionId)) records.push(record);
    }
    const executions = records.slice(0, input.limit);
    const last = executions.at(-1);
    return {
      schemaVersion: 'workspace-sql-execution-history.v1' as const,
      executions,
      nextCursor:
        records.length > input.limit && last !== undefined
          ? encodeSqlHistoryCursor({
              scope,
              connectionId: input.connectionId,
              executionId: last.executionId,
            })
          : null,
    };
  }

  private async readCursor(
    scope: WorkspaceStorageScope,
    input: ListWorkspaceSqlExecutionsRequest
  ): Promise<string | undefined> {
    const executionId = decodeSqlHistoryCursor(scope, input);
    if (executionId === undefined) return undefined;
    const record = await this.get(scope, executionId);
    if (record === null) throw new WorkspaceSqlOperationError('invalid_cursor');
    if (!matchesSqlHistoryConnection(record, input.connectionId))
      throw new WorkspaceSqlOperationError('invalid_cursor');
    return executionId;
  }
}
