/** Execute one authorized SQL attempt and durably record its exact terminal facts. */
import {
  ExecuteWorkspaceSqlRequestSchema,
  ExecuteWorkspaceSqlResponseSchema,
  WorkspaceSqlExecutionSchema,
  type ExecuteWorkspaceSqlRequest,
  type ExecuteWorkspaceSqlResponse,
  type WorkspaceSqlFailure,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';

import { AUTHORIZATION_ACTION } from '../../ports/accessDecision.js';
import type { AuthorizedExecutionContext } from '../../ports/auth.js';
import {
  requireSqlWorksheetScope,
  WorkspaceSqlOperationError,
  WorkspaceSqlQueryError,
  type IExecuteWorkspaceSqlCommand,
  type IWorkspaceSqlExecutionHistory,
  type IWorkspaceSqlExecutor,
} from '../../ports/sqlWorksheet.js';
import {
  WarehouseConnectionNotFoundError,
  type IWarehouseConnectionCatalog,
  type WarehouseConnectionCatalogEntry,
} from '../../ports/warehouseSourceImport.js';
import type { WorkspaceStorageScope } from '../../ports/workspaceFiles.js';

type SqlOutcome =
  | { kind: 'succeeded'; value: Awaited<ReturnType<IWorkspaceSqlExecutor['execute']>> }
  | { kind: 'failed'; failure: WorkspaceSqlFailure };

export class ExecuteWorkspaceSqlCommand implements IExecuteWorkspaceSqlCommand {
  public constructor(
    private readonly deps: Readonly<{
      catalog: Pick<IWarehouseConnectionCatalog, 'getConnection'>;
      executor: IWorkspaceSqlExecutor;
      history: Pick<IWorkspaceSqlExecutionHistory, 'append'>;
      now: () => Date;
      elapsedNow: () => number;
      nonce: () => string;
    }>
  ) {}

  public async execute(
    input: ExecuteWorkspaceSqlRequest,
    context: AuthorizedExecutionContext
  ): Promise<ExecuteWorkspaceSqlResponse> {
    const scope = requireSqlWorksheetScope(context, AUTHORIZATION_ACTION.workspaceSqlExecute);
    const request = ExecuteWorkspaceSqlRequestSchema.parse(input);
    const connection = await this.connection(scope, request.connectionId);
    const startedAt = this.deps.now();
    const start = this.deps.elapsedNow();
    const outcome = await this.query(connection, request);
    const execution = completedExecution({
      request,
      connection,
      principalId: context.principal.principalId,
      outcome,
      startedAt,
      finishedAt: this.deps.now(),
      durationMs: Math.max(0, this.deps.elapsedNow() - start),
      nonce: this.deps.nonce(),
    });
    try {
      await this.deps.history.append(scope, execution);
    } catch {
      throw new WorkspaceSqlOperationError('unavailable');
    }
    return ExecuteWorkspaceSqlResponseSchema.parse({
      schemaVersion: 'workspace-sql-execution-response.v1',
      execution,
      ...(outcome.kind === 'succeeded' ? { result: outcome.value.result } : {}),
    });
  }

  private async connection(
    scope: WorkspaceStorageScope,
    id: string
  ): Promise<WarehouseConnectionCatalogEntry> {
    try {
      const connection = await this.deps.catalog.getConnection(scope, id);
      if (connection.id !== id) throw new WorkspaceSqlOperationError('not_found');
      return connection;
    } catch (error) {
      if (error instanceof WarehouseConnectionNotFoundError)
        throw new WorkspaceSqlOperationError('not_found');
      throw error;
    }
  }

  private async query(
    connection: WarehouseConnectionCatalogEntry,
    request: ExecuteWorkspaceSqlRequest
  ): Promise<SqlOutcome> {
    try {
      return {
        kind: 'succeeded',
        value: await this.deps.executor.execute({
          type: connection.type,
          credentialRef: connection.credentialRef,
          sql: request.sql,
          limit: request.limit,
        }),
      };
    } catch (error) {
      return {
        kind: 'failed',
        failure:
          error instanceof WorkspaceSqlQueryError
            ? error.failure
            : { code: 'query_failed', message: 'The SQL query could not be completed.' },
      };
    }
  }
}

function completedExecution(
  input: Readonly<{
    request: ExecuteWorkspaceSqlRequest;
    connection: WarehouseConnectionCatalogEntry;
    principalId: string;
    startedAt: Date;
    finishedAt: Date;
    durationMs: number;
    nonce: string;
    outcome: SqlOutcome;
  }>
) {
  const order = String(9_999_999_999_999 - input.finishedAt.getTime()).padStart(13, '0');
  const fingerprint = sha256HexUtf8(input.connection.id).slice(0, 32);
  const facts =
    input.outcome.kind === 'succeeded'
      ? {
          status: 'succeeded',
          rowCount: input.outcome.value.result.rows.length,
          columns: input.outcome.value.result.columns,
          truncated: input.outcome.value.truncated,
        }
      : {
          status: 'failed',
          rowCount: 0,
          columns: [],
          truncated: false,
          error: input.outcome.failure,
        };
  return WorkspaceSqlExecutionSchema.parse({
    schemaVersion: 'workspace-sql-execution.v1',
    executionId: `${order}-${fingerprint}-${input.nonce}`,
    sql: input.request.sql,
    limit: input.request.limit,
    principalId: input.principalId,
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: input.connection.id,
      provider: input.connection.type,
    },
    connectionName: input.connection.name,
    startedAt: input.startedAt.toISOString(),
    finishedAt: input.finishedAt.toISOString(),
    durationMs: input.durationMs,
    ...facts,
  });
}
