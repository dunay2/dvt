// @vitest-environment jsdom
/** Prove SQL transport binds its exact request, scope and immutable history identity. */
import { expect, it } from 'vitest';
import { SqlWorksheetQueryError } from '../../ports/sqlWorksheet';
import { createApiClientHarness } from '../workspace/workspaceApiClient.test.harness';
import {
  buildWorkspaceScope,
  installWorkspaceScopeHarness,
  setWorkspaceScope,
} from '../workspace/workspaceScope.test.harness';
import {
  buildSqlWorksheetTestResponse,
  SQL_TEST_REQUEST,
  SQL_TEST_EXECUTION_ID,
} from '../../views/sql/sqlWorksheet.test-fixtures';
import { createApiSqlWorksheetPort } from './sqlWorksheet.api';
import { ApiError } from '../api/createApiClient';

installWorkspaceScopeHarness();

it('transports exact scoped SQL and the cancellation signal without a Canvas identity', async () => {
  setWorkspaceScope(buildWorkspaceScope());
  const response = buildSqlWorksheetTestResponse();
  const transport = createApiClientHarness({
    postJson: async <_TRequest, TResponse>() => response as TResponse,
  });
  const signal = new AbortController().signal;
  await expect(
    createApiSqlWorksheetPort(transport.apiClient).execute(SQL_TEST_REQUEST, signal)
  ).resolves.toEqual(response);
  expect(transport.postJson).toHaveBeenCalledExactlyOnceWith(
    '/workspace/sql/executions?tenantId=tenant-a&projectId=project-a&environmentId=env-a',
    SQL_TEST_REQUEST,
    { signal }
  );
});

it.each([
  { sql: 'SELECT 2' },
  {
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'foreign',
      provider: 'postgres',
    },
  },
  { limit: 50 },
])('rejects response facts belonging to a different execution request %j', async (patch) => {
  setWorkspaceScope(buildWorkspaceScope());
  const response = buildSqlWorksheetTestResponse();
  const invalid = { ...response, execution: { ...response.execution, ...patch } };
  const transport = createApiClientHarness({
    postJson: async <_TRequest, TResponse>() => invalid as TResponse,
  });
  await expect(
    createApiSqlWorksheetPort(transport.apiClient).execute(SQL_TEST_REQUEST)
  ).rejects.toMatchObject({ reason: 'contract' });
});

it('does not publish an old workspace response after its scope changes', async () => {
  setWorkspaceScope(buildWorkspaceScope());
  const response = buildSqlWorksheetTestResponse();
  const transport = createApiClientHarness({
    postJson: async <_TRequest, TResponse>() => {
      setWorkspaceScope(buildWorkspaceScope({ projectId: 'new-project' }));
      return response as TResponse;
    },
  });
  await expect(
    createApiSqlWorksheetPort(transport.apiClient).execute(SQL_TEST_REQUEST)
  ).rejects.toMatchObject({ reason: 'stale' });
});

it('restores history metadata by its opaque identifier and never executes while reading', async () => {
  setWorkspaceScope(buildWorkspaceScope());
  const execution = buildSqlWorksheetTestResponse().execution;
  const response = { schemaVersion: 'workspace-sql-execution-detail.v1', execution };
  const transport = createApiClientHarness({ getJson: async <T>() => response as T });
  await expect(
    createApiSqlWorksheetPort(transport.apiClient).getExecution(SQL_TEST_EXECUTION_ID)
  ).resolves.toEqual(response);
  expect(transport.getJson).toHaveBeenCalledExactlyOnceWith(
    `/workspace/sql/executions/${encodeURIComponent(SQL_TEST_EXECUTION_ID)}?tenantId=tenant-a&projectId=project-a&environmentId=env-a`,
    {}
  );
  expect(transport.postJson).not.toHaveBeenCalled();
});

it('preserves transport abort instead of replacing it with an unavailable result', async () => {
  setWorkspaceScope(buildWorkspaceScope());
  const aborted = new DOMException('Cancelled', 'AbortError');
  const transport = createApiClientHarness({
    postJson: async () => {
      throw aborted;
    },
  });
  await expect(
    createApiSqlWorksheetPort(transport.apiClient).execute(SQL_TEST_REQUEST)
  ).rejects.toBe(aborted);
  expect(aborted).not.toBeInstanceOf(SqlWorksheetQueryError);
});

it('passes opaque history pagination and the chosen connection through the protected query', async () => {
  setWorkspaceScope(buildWorkspaceScope());
  const response = {
    schemaVersion: 'workspace-sql-execution-history.v1',
    executions: [buildSqlWorksheetTestResponse().execution],
    nextCursor: 'next-page',
  };
  const transport = createApiClientHarness({ getJson: async <T>() => response as T });
  await expect(
    createApiSqlWorksheetPort(transport.apiClient).listHistory({
      limit: 20,
      cursor: 'opaque cursor',
      connectionId: 'warehouse',
    })
  ).resolves.toEqual(response);
  expect(transport.getJson).toHaveBeenCalledExactlyOnceWith(
    '/workspace/sql/executions?tenantId=tenant-a&projectId=project-a&environmentId=env-a&limit=20&cursor=opaque+cursor&connectionId=warehouse',
    {}
  );
  expect(transport.postJson).not.toHaveBeenCalled();
});

it('rejects a filtered history containing a different connection', async () => {
  setWorkspaceScope(buildWorkspaceScope());
  const response = {
    schemaVersion: 'workspace-sql-execution-history.v1',
    executions: [buildSqlWorksheetTestResponse().execution],
    nextCursor: null,
  };
  const transport = createApiClientHarness({ getJson: async <T>() => response as T });
  await expect(
    createApiSqlWorksheetPort(transport.apiClient).listHistory({ limit: 20, connectionId: 'other' })
  ).rejects.toMatchObject({ reason: 'contract' });
});

it('rejects a history detail substituted with a different valid opaque identifier', async () => {
  setWorkspaceScope(buildWorkspaceScope());
  const response = {
    schemaVersion: 'workspace-sql-execution-detail.v1',
    execution: buildSqlWorksheetTestResponse().execution,
  };
  const transport = createApiClientHarness({ getJson: async <T>() => response as T });
  const otherId = SQL_TEST_EXECUTION_ID.replace(/1$/u, '2');
  await expect(
    createApiSqlWorksheetPort(transport.apiClient).getExecution(otherId)
  ).rejects.toMatchObject({ reason: 'contract' });
});

it.each([401, 403])(
  'preserves a denied %i response as an authorization failure',
  async (statusCode) => {
    setWorkspaceScope(buildWorkspaceScope());
    const error = new ApiError({
      endpoint: '/workspace/sql/executions',
      message: 'Denied',
      statusCode,
      category: statusCode === 401 ? 'unauthorized' : 'forbidden',
    });
    const transport = createApiClientHarness({
      postJson: async () => {
        throw error;
      },
    });
    await expect(
      createApiSqlWorksheetPort(transport.apiClient).execute(SQL_TEST_REQUEST)
    ).rejects.toMatchObject({ reason: 'denied' });
  }
);
