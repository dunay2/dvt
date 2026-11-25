import type { WorkspaceSqlResult } from '@dvt/contracts';
import { describe, expect, it, vi, type Mock } from 'vitest';

import { AUTHORIZATION_ACTION } from '../../../../src/application/ports/accessDecision.js';
import { WorkspaceSqlQueryError } from '../../../../src/application/ports/sqlWorksheet.js';
import { ExecuteWorkspaceSqlCommand } from '../../../../src/application/services/sqlWorksheet/ExecuteWorkspaceSqlCommand.js';

import { SQL_CONNECTION, SQL_SCOPE, sqlContext, workspaceSqlResponse } from './fixtures.js';

function fixture(): Readonly<{
  command: ExecuteWorkspaceSqlCommand;
  getConnection: Mock<() => Promise<typeof SQL_CONNECTION>>;
  execute: Mock<() => Promise<{ result: WorkspaceSqlResult; truncated: boolean }>>;
  append: Mock<() => Promise<undefined>>;
}> {
  const getConnection = vi.fn(async () => SQL_CONNECTION);
  const execute = vi.fn(async () => ({ result: workspaceSqlResponse().result!, truncated: false }));
  const append = vi.fn(async () => undefined);
  const dates = [new Date('2026-11-25T00:00:00.000Z'), new Date('2026-11-25T00:00:00.023Z')];
  const elapsed = [10, 33];
  const command = new ExecuteWorkspaceSqlCommand({
    catalog: { getConnection },
    executor: { execute },
    history: { append },
    now: () => dates.shift()!,
    elapsedNow: () => elapsed.shift()!,
    nonce: () => '11111111-1111-4111-8111-111111111111',
  });
  return { command, getConnection, execute, append };
}

const input = { connectionId: 'warehouse', sql: 'select 1 as answer', limit: 100 };

describe('ExecuteWorkspaceSql', () => {
  it('uses the server connection and actor, measures the attempt and persists before returning rows', async () => {
    const state = fixture();
    const response = await state.command.execute(input, sqlContext());
    expect(response).toEqual(workspaceSqlResponse());
    expect(state.getConnection).toHaveBeenCalledWith(SQL_SCOPE, 'warehouse');
    expect(state.execute).toHaveBeenCalledWith({
      type: 'postgres',
      credentialRef: 'postgres:warehouse',
      sql: input.sql,
      limit: 100,
    });
    expect(state.append).toHaveBeenCalledWith(SQL_SCOPE, response.execution);
    expect(JSON.stringify(response)).not.toContain('postgres:warehouse');
  });

  it('rejects an unrelated authorized action before connection, warehouse or history IO', async () => {
    const state = fixture();
    await expect(
      state.command.execute(input, sqlContext(AUTHORIZATION_ACTION.runStart))
    ).rejects.toMatchObject({ reason: 'access_denied' });
    expect(state.getConnection).not.toHaveBeenCalled();
    expect(state.execute).not.toHaveBeenCalled();
    expect(state.append).not.toHaveBeenCalled();
  });

  it('refuses a catalog result for another connection before credentials or history IO', async () => {
    const state = fixture();
    state.getConnection.mockResolvedValue({ ...SQL_CONNECTION, id: 'other' });
    await expect(state.command.execute(input, sqlContext())).rejects.toMatchObject({
      reason: 'not_found',
    });
    expect(state.execute).not.toHaveBeenCalled();
    expect(state.append).not.toHaveBeenCalled();
  });

  it('records a safe terminal failure and returns no fabricated result', async () => {
    const state = fixture();
    state.execute.mockRejectedValue(
      new WorkspaceSqlQueryError({ code: 'query_timeout', message: 'The SQL query timed out.' })
    );
    const response = await state.command.execute(input, sqlContext());
    expect(response.execution).toMatchObject({
      status: 'failed',
      rowCount: 0,
      truncated: false,
      columns: [],
      durationMs: 23,
      error: { code: 'query_timeout', message: 'The SQL query timed out.' },
    });
    expect(response).not.toHaveProperty('result');
    expect(state.append).toHaveBeenCalledWith(SQL_SCOPE, response.execution);
  });

  it('does not expose arbitrary driver errors or return success when persistence fails', async () => {
    const state = fixture();
    state.execute.mockRejectedValue(new Error('postgres://secret@private/warehouse'));
    const failed = await state.command.execute(input, sqlContext());
    expect(failed.execution.status).toBe('failed');
    expect(JSON.stringify(failed)).not.toContain('secret');
    const unavailable = fixture();
    unavailable.append.mockRejectedValue(new Error('private history path'));
    await expect(unavailable.command.execute(input, sqlContext())).rejects.toMatchObject({
      reason: 'unavailable',
    });
  });
});
