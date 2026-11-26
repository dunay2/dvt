import type {
  GetWorkspaceSqlExecutionResponse,
  ListWorkspaceSqlExecutionsResponse,
} from '@dvt/contracts';
import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';

import { AuthorizeCommandScopeService } from '../../../src/application/services/authorizeCommandScopeService.js';
import { registerSqlWorksheetRoutes } from '../../../src/entrypoints/http/sqlWorksheetRoutes.js';
import { EmbeddedAccessDecisionService } from '../../../src/infrastructure/auth/embeddedAccessDecisionService.js';
import {
  SQL_PRINCIPAL,
  SQL_SCOPE_QUERY,
  sqlGrantSnapshot,
  workspaceSqlExecution,
  workspaceSqlResponse,
} from '../../application/services/sqlWorksheet/fixtures.js';

const apps: ReturnType<typeof Fastify>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function buildApp(actions = ['workspace:sql:execute', 'workspace:sql-history:view']): Readonly<{
  app: ReturnType<typeof Fastify>;
  execute: Mock<() => Promise<ReturnType<typeof workspaceSqlResponse>>>;
  list: Mock<() => Promise<ListWorkspaceSqlExecutionsResponse>>;
  get: Mock<() => Promise<GetWorkspaceSqlExecutionResponse>>;
  audit: Readonly<{ record: Mock<() => Promise<undefined>> }>;
}> {
  const app = Fastify();
  apps.push(app);
  const execute = vi.fn(async () => workspaceSqlResponse());
  const list = vi.fn<() => Promise<ListWorkspaceSqlExecutionsResponse>>(async () => ({
    schemaVersion: 'workspace-sql-execution-history.v1' as const,
    executions: [workspaceSqlExecution()],
    nextCursor: null,
  }));
  const get = vi.fn<() => Promise<GetWorkspaceSqlExecutionResponse>>(async () => ({
    schemaVersion: 'workspace-sql-execution-detail.v1' as const,
    execution: workspaceSqlExecution(),
  }));
  const audit = { record: vi.fn(async () => undefined) };
  registerSqlWorksheetRoutes(app, {
    authenticator: {
      authenticateBearerToken: async (token) =>
        token === 'valid'
          ? { ok: true, principal: SQL_PRINCIPAL }
          : { ok: false, code: 'MISSING_TOKEN' },
    },
    authorizer: new AuthorizeCommandScopeService(
      new EmbeddedAccessDecisionService({
        load: async () => sqlGrantSnapshot(actions),
        migrate: async () => undefined,
      }),
      audit,
      () => new Date('2026-11-25T00:00:00Z')
    ),
    executeCommand: { execute },
    listQuery: { execute: list },
    getQuery: { execute: get },
  });
  return { app, execute, list, get, audit };
}

describe('protected independent SQL worksheet routes', () => {
  it('executes unsaved SQL only under the authorized environment and actor', async () => {
    const fixture = buildApp();
    const response = await fixture.app.inject({
      method: 'POST',
      url: `/workspace/sql/executions?${SQL_SCOPE_QUERY}`,
      headers: { authorization: 'Bearer valid' },
      payload: { connectionId: 'warehouse', sql: 'select 1 as answer' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(workspaceSqlResponse());
    expect(fixture.execute).toHaveBeenCalledWith(
      { connectionId: 'warehouse', sql: 'select 1 as answer', limit: 100 },
      expect.objectContaining({
        principal: SQL_PRINCIPAL,
        action: { kind: 'command', name: 'workspace:sql:execute' },
        scope: expect.objectContaining({
          tenantId: { value: 'tenant' },
          projectId: { value: 'project' },
          environmentId: { value: 'dev' },
        }),
      })
    );
    expect(fixture.audit.record).toHaveBeenCalledTimes(1);
  });

  it.each([
    { actions: [], token: 'Bearer valid', status: 403 },
    { actions: ['run:start'], token: 'Bearer valid', status: 403 },
    { actions: ['workspace:sql:execute'], token: '', status: 401 },
  ])('denies before command/history IO: $status $actions', async ({ actions, token, status }) => {
    const fixture = buildApp(actions);
    const response = await fixture.app.inject({
      method: 'POST',
      url: `/workspace/sql/executions?${SQL_SCOPE_QUERY}`,
      headers: { authorization: token },
      payload: { connectionId: 'warehouse', sql: 'select 1' },
    });
    expect(response.statusCode).toBe(status);
    expect(fixture.execute).not.toHaveBeenCalled();
    expect(fixture.list).not.toHaveBeenCalled();
    expect(fixture.get).not.toHaveBeenCalled();
  });

  it('refuses missing scope and client credential/actor authority', async () => {
    const fixture = buildApp();
    const missing = await fixture.app.inject({
      method: 'POST',
      url: '/workspace/sql/executions?tenantId=tenant&projectId=project',
      headers: { authorization: 'Bearer valid' },
      payload: { connectionId: 'warehouse', sql: 'select 1' },
    });
    expect(missing.statusCode).toBe(400);
    for (const field of ['credentialRef', 'principalId', 'tenantId']) {
      const response = await fixture.app.inject({
        method: 'POST',
        url: `/workspace/sql/executions?${SQL_SCOPE_QUERY}`,
        headers: { authorization: 'Bearer valid' },
        payload: { connectionId: 'warehouse', sql: 'select 1', [field]: 'foreign' },
      });
      expect(response.statusCode).toBe(400);
    }
    expect(fixture.execute).not.toHaveBeenCalled();
  });

  it('lists and retrieves history through the separate history grant without executing SQL', async () => {
    const fixture = buildApp(['workspace:sql-history:view']);
    const headers = { authorization: 'Bearer valid' };
    const list = await fixture.app.inject({
      url: `/workspace/sql/executions?${SQL_SCOPE_QUERY}&limit=2&connectionId=warehouse`,
      headers,
    });
    expect(list.statusCode).toBe(200);
    expect(fixture.list).toHaveBeenCalledWith(
      { limit: 2, connectionId: 'warehouse' },
      expect.objectContaining({ action: { kind: 'query', name: 'workspace:sql-history:view' } })
    );
    const id = workspaceSqlExecution().executionId;
    const detail = await fixture.app.inject({
      url: `/workspace/sql/executions/${id}?${SQL_SCOPE_QUERY}`,
      headers,
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().execution.sql).toBe('select 1 as answer');
    expect(detail.json().execution).not.toHaveProperty('rows');
    expect(fixture.execute).not.toHaveBeenCalled();
  });

  it('does not infer history access from Run or SQL execution permission', async () => {
    const fixture = buildApp(['run:start', 'workspace:sql:execute']);
    const response = await fixture.app.inject({
      url: `/workspace/sql/executions?${SQL_SCOPE_QUERY}`,
      headers: { authorization: 'Bearer valid' },
    });
    expect(response.statusCode).toBe(403);
    expect(fixture.list).not.toHaveBeenCalled();
  });
});
