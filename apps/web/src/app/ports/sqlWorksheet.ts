/** One scoped port for independent SQL execution and its immutable execution history. */
import type {
  ExecuteWorkspaceSqlRequest,
  ExecuteWorkspaceSqlResponse,
  GetWorkspaceSqlExecutionResponse,
  ListWorkspaceSqlExecutionsRequest,
  ListWorkspaceSqlExecutionsResponse,
} from '@dvt/contracts';

export type SqlWorksheetFailure = 'denied' | 'unavailable' | 'contract' | 'stale';
export class SqlWorksheetQueryError extends Error {
  constructor(readonly reason: SqlWorksheetFailure) {
    super(`SQL worksheet request failed: ${reason}`);
    this.name = 'SqlWorksheetQueryError';
  }
}

export interface ISqlWorksheetPort {
  execute(
    input: ExecuteWorkspaceSqlRequest,
    signal?: AbortSignal
  ): Promise<ExecuteWorkspaceSqlResponse>;
  listHistory(
    input: ListWorkspaceSqlExecutionsRequest,
    signal?: AbortSignal
  ): Promise<ListWorkspaceSqlExecutionsResponse>;
  getExecution(
    executionId: string,
    signal?: AbortSignal
  ): Promise<GetWorkspaceSqlExecutionResponse>;
}
