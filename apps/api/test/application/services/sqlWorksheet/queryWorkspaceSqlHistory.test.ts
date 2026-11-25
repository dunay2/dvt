import { describe, expect, it, vi } from 'vitest';

import { AUTHORIZATION_ACTION } from '../../../../src/application/ports/accessDecision.js';
import {
  isCreatorWorkspaceActionGranted,
  PROJECT_ONBOARDING_POLICY,
} from '../../../../src/application/services/projectOnboardingPolicy.js';
import { GetWorkspaceSqlExecutionQuery } from '../../../../src/application/services/sqlWorksheet/GetWorkspaceSqlExecutionQuery.js';
import { ListWorkspaceSqlExecutionsQuery } from '../../../../src/application/services/sqlWorksheet/ListWorkspaceSqlExecutionsQuery.js';

import { SQL_SCOPE, sqlContext, workspaceSqlExecution } from './fixtures.js';

describe('independent scoped SQL history queries', () => {
  it('returns persisted details and page metadata under the history action without running SQL', async () => {
    const execution = workspaceSqlExecution();
    const get = vi.fn(async () => execution);
    const list = vi.fn(async () => ({
      schemaVersion: 'workspace-sql-execution-history.v1' as const,
      executions: [execution],
      nextCursor: null,
    }));
    const context = sqlContext(AUTHORIZATION_ACTION.workspaceSqlHistoryView);
    expect(
      await new GetWorkspaceSqlExecutionQuery({ get }).execute(execution.executionId, context)
    ).toEqual({ schemaVersion: 'workspace-sql-execution-detail.v1', execution });
    expect(
      await new ListWorkspaceSqlExecutionsQuery({ list }).execute({ limit: 2 }, context)
    ).toEqual({
      schemaVersion: 'workspace-sql-execution-history.v1',
      executions: [execution],
      nextCursor: null,
    });
    expect(get).toHaveBeenCalledWith(SQL_SCOPE, execution.executionId);
    expect(list).toHaveBeenCalledWith(SQL_SCOPE, { limit: 2 });
  });

  it('does not infer history authorization from permission to execute and rejects missing records', async () => {
    const get = vi.fn(async () => null);
    const query = new GetWorkspaceSqlExecutionQuery({ get });
    const executionId = workspaceSqlExecution().executionId;
    await expect(query.execute(executionId, sqlContext())).rejects.toMatchObject({
      reason: 'access_denied',
    });
    expect(get).not.toHaveBeenCalled();
    await expect(
      query.execute(executionId, sqlContext(AUTHORIZATION_ACTION.workspaceSqlHistoryView))
    ).rejects.toMatchObject({ reason: 'not_found' });
  });

  it('keeps legacy rename/rebind access without silently elevating existing creators to SQL', () => {
    const legacy = [
      'workspace:graph-draft:view',
      'workspace:graph-draft:save',
      'workspace:files:view',
      'workspace:files:save',
      'workspace:source-import:view',
      'workspace:source-connection:create',
      'workspace:source-connection:test',
      'workspace:source-import:import',
      'workspace:plugins:view',
    ];
    expect(isCreatorWorkspaceActionGranted(legacy, 'workspace:source-connection:rename')).toBe(
      true
    );
    expect(isCreatorWorkspaceActionGranted(legacy, 'workspace:source-import:rebind')).toBe(true);
    expect(isCreatorWorkspaceActionGranted(legacy, 'workspace:sql:execute')).toBe(false);
    expect(isCreatorWorkspaceActionGranted(legacy, 'workspace:sql-history:view')).toBe(false);
    expect(PROJECT_ONBOARDING_POLICY.creatorWorkspaceActions).toEqual(
      expect.arrayContaining(['workspace:sql:execute', 'workspace:sql-history:view'])
    );
  });
});
