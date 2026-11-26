/** Read scoped completed query history without contacting a warehouse or Git. */
import {
  ListWorkspaceSqlExecutionsRequestSchema,
  ListWorkspaceSqlExecutionsResponseSchema,
  type ListWorkspaceSqlExecutionsRequest,
} from '@dvt/contracts';

import { AUTHORIZATION_ACTION } from '../../ports/accessDecision.js';
import type { AuthorizedExecutionContext } from '../../ports/auth.js';
import {
  requireSqlWorksheetScope,
  type IListWorkspaceSqlExecutionsQuery,
  type IWorkspaceSqlExecutionHistory,
} from '../../ports/sqlWorksheet.js';

export class ListWorkspaceSqlExecutionsQuery implements IListWorkspaceSqlExecutionsQuery {
  public constructor(private readonly history: Pick<IWorkspaceSqlExecutionHistory, 'list'>) {}

  public async execute(
    input: ListWorkspaceSqlExecutionsRequest,
    context: AuthorizedExecutionContext
  ) {
    const scope = requireSqlWorksheetScope(context, AUTHORIZATION_ACTION.workspaceSqlHistoryView);
    return ListWorkspaceSqlExecutionsResponseSchema.parse(
      await this.history.list(scope, ListWorkspaceSqlExecutionsRequestSchema.parse(input))
    );
  }
}
