/** Retrieve one completed scoped SQL execution, retaining its original query and metadata. */
import {
  GetWorkspaceSqlExecutionResponseSchema,
  WorkspaceSqlExecutionIdSchema,
} from '@dvt/contracts';

import { AUTHORIZATION_ACTION } from '../../ports/accessDecision.js';
import type { AuthorizedExecutionContext } from '../../ports/auth.js';
import {
  requireSqlWorksheetScope,
  WorkspaceSqlOperationError,
  type IGetWorkspaceSqlExecutionQuery,
  type IWorkspaceSqlExecutionHistory,
} from '../../ports/sqlWorksheet.js';

export class GetWorkspaceSqlExecutionQuery implements IGetWorkspaceSqlExecutionQuery {
  public constructor(private readonly history: Pick<IWorkspaceSqlExecutionHistory, 'get'>) {}

  public async execute(executionId: string, context: AuthorizedExecutionContext) {
    const scope = requireSqlWorksheetScope(context, AUTHORIZATION_ACTION.workspaceSqlHistoryView);
    const execution = await this.history.get(
      scope,
      WorkspaceSqlExecutionIdSchema.parse(executionId)
    );
    if (execution === null) throw new WorkspaceSqlOperationError('not_found');
    return GetWorkspaceSqlExecutionResponseSchema.parse({
      schemaVersion: 'workspace-sql-execution-detail.v1',
      execution,
    });
  }
}
