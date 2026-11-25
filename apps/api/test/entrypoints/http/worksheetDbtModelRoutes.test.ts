/** Exercise both scoped grants before allowing file publication. */
import { asSha256HexString } from '@dvt/contracts';
import Fastify, { type LightMyRequestResponse } from 'fastify';
import { afterEach, expect, it, vi, type MockInstance } from 'vitest';

import { AuthorizeCommandScopeService } from '../../../src/application/services/authorizeCommandScopeService.js';
import { registerWorksheetDbtModelRoutes } from '../../../src/entrypoints/http/worksheetDbtModelRoutes.js';
import { EmbeddedAccessDecisionService } from '../../../src/infrastructure/auth/embeddedAccessDecisionService.js';
import {
  SQL_PRINCIPAL,
  SQL_SCOPE,
  SQL_SCOPE_QUERY,
  sqlGrantSnapshot,
} from '../../application/services/sqlWorksheet/fixtures.js';

const request = {
  canvasId: 'dbt',
  projectRoot: '.',
  configSha256: 'a'.repeat(64),
  name: 'weekly',
  sql: 'select 1',
  requestId: '265be950-afe9-4f86-aab4-a159479db39f',
};
const apps: ReturnType<typeof Fastify>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function fixture(actions = ['workspace:graph-draft:view', 'workspace:files:save']): {
  execute: ReturnType<typeof vi.fn>;
  authorize: MockInstance<AuthorizeCommandScopeService['authorize']>;
  post: (payload: typeof request) => Promise<LightMyRequestResponse>;
} {
  const app = Fastify();
  apps.push(app);
  const execute = vi
    .fn()
    .mockResolvedValue({
      kind: 'created',
      path: 'models/weekly.sql',
      contentSha256: asSha256HexString('f'.repeat(64)),
    });
  const grants = new EmbeddedAccessDecisionService({
    load: async () => sqlGrantSnapshot(actions),
    migrate: async () => undefined,
  });
  const authorizer = new AuthorizeCommandScopeService(
    grants,
    { record: vi.fn() },
    () => new Date('2026-11-25T00:00:00Z')
  );
  const authorize = vi.spyOn(authorizer, 'authorize');
  registerWorksheetDbtModelRoutes(app, {
    command: { execute },
    authenticator: {
      authenticateBearerToken: async (token) =>
        token === 'valid'
          ? { ok: true, principal: SQL_PRINCIPAL }
          : { ok: false, code: 'MISSING_TOKEN' },
    },
    authorizer,
    rateLimit: { max: 100, timeWindow: 60000 },
  });
  const post = (payload: typeof request): Promise<LightMyRequestResponse> =>
    app.inject({
      method: 'POST',
      url: '/workspace/dbt/worksheet-model?' + SQL_SCOPE_QUERY,
      payload,
      headers: { authorization: 'Bearer valid' },
    });
  return { execute, authorize, post };
}

it('requires both scoped capabilities and sends the accepted request to the command', async () => {
  const f = fixture();
  expect((await f.post(request)).statusCode).toBe(200);
  expect(f.authorize.mock.calls.map(([, scope]) => scope.action.name)).toEqual([
    'workspace:graph-draft:view',
    'workspace:files:save',
  ]);
  expect(f.execute).toHaveBeenCalledExactlyOnceWith(SQL_SCOPE, request);
});
it.each([['workspace:graph-draft:view'], ['workspace:files:save']])(
  'declines publication when only %s is granted',
  async (grant) => {
    const f = fixture([grant]);
    expect((await f.post(request)).statusCode).toBe(403);
    expect(f.execute).not.toHaveBeenCalled();
  }
);
it('rejects an invalid model filename before writing', async () => {
  const f = fixture();
  expect((await f.post({ ...request, name: '../weekly' })).statusCode).toBe(400);
  expect(f.execute).not.toHaveBeenCalled();
});
