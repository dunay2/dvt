/** Prove real signed-session authorization, SELECT rows and durable history in a disposable database. */
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import {
  ExecuteWorkspaceSqlResponseSchema,
  ListWorkspaceSqlExecutionsResponseSchema,
} from '@dvt/contracts';
import { randomUuidV4 } from '@dvt/crypto';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { Pool, type QueryArrayConfig } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AuthorizeCommandScopeService } from '../../../src/application/services/authorizeCommandScopeService.js';
import { ExecuteWorkspaceSqlCommand } from '../../../src/application/services/sqlWorksheet/ExecuteWorkspaceSqlCommand.js';
import { GetWorkspaceSqlExecutionQuery } from '../../../src/application/services/sqlWorksheet/GetWorkspaceSqlExecutionQuery.js';
import { ListWorkspaceSqlExecutionsQuery } from '../../../src/application/services/sqlWorksheet/ListWorkspaceSqlExecutionsQuery.js';
import { registerProtectedSessionRoutes } from '../../../src/entrypoints/http/protectedRuntimeSessionRoutes.js';
import { registerSqlWorksheetRoutes } from '../../../src/entrypoints/http/sqlWorksheetRoutes.js';
import { EmbeddedAccessDecisionService } from '../../../src/infrastructure/auth/embeddedAccessDecisionService.js';
import { EmbeddedPrincipalGrantRepository } from '../../../src/infrastructure/auth/embeddedPrincipalGrantRepository.js';
import { EmbeddedProjectOnboardingRepository } from '../../../src/infrastructure/auth/embeddedProjectOnboardingRepository.js';
import { JwksJwtVerifier } from '../../../src/infrastructure/auth/jwksJwtVerifier.js';
import { OidcAuthenticator } from '../../../src/infrastructure/auth/oidcAuthenticator.js';
import { LocalWorkspaceSqlExecutionHistoryRepository } from '../../../src/infrastructure/sqlWorksheet/LocalWorkspaceSqlExecutionHistoryRepository.js';
import { PostgresWorkspaceSqlExecutor } from '../../../src/infrastructure/sqlWorksheet/PostgresWorkspaceSqlExecutor.js';
import {
  SQL_CONNECTION,
  SQL_SCOPE,
  SQL_SCOPE_QUERY,
} from '../../application/services/sqlWorksheet/fixtures.js';

type Lease = Readonly<{ url: string; dispose(): Promise<void> }>;
type LocalAuth = Readonly<{
  oidcEnv: Readonly<{ OIDC_JWKS_URI: string; OIDC_ISSUER: string; OIDC_AUDIENCE: string }>;
  webEnv: Readonly<{ VITE_API_BEARER_TOKEN: string }>;
  close(): Promise<void>;
}>;
const require = createRequire(import.meta.url);
const { allocateDisposablePostgresDatabase } =
  require('../../../../../scripts/disposable-postgres-database.cjs') as {
    allocateDisposablePostgresDatabase(url: string, label: string): Promise<Lease>;
  };
const {
  startLocalProtectedRuntimeAuth,
  seedLocalProtectedRuntimeGrant,
  LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS,
} = require('../../../../../scripts/run-dev-stack.auth.cjs') as {
  startLocalProtectedRuntimeAuth(
    options: Readonly<{ env: Readonly<Record<string, string>> }>
  ): Promise<LocalAuth>;
  seedLocalProtectedRuntimeGrant(
    input: Readonly<{
      databaseUrl: string;
      principalId: string;
      tenantActions: readonly string[];
      workspaceScope: typeof SQL_SCOPE;
    }>
  ): Promise<unknown>;
  LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS: readonly string[];
};
const adminUrl = process.env['DVT_PG_URL'];

describe.skipIf(adminUrl === undefined)('independent SQL worksheet native PostgreSQL proof', () => {
  let lease: Lease | undefined;
  let pool: Pool | undefined;
  let auth: LocalAuth | undefined;
  let app: ReturnType<typeof Fastify>;
  let root: string;
  let parent: string;
  let history: LocalWorkspaceSqlExecutionHistoryRepository;
  const principalId = 'sql-worksheet-proof-selected';

  beforeAll(async () => {
    if (adminUrl === undefined)
      throw new Error('DVT_PG_URL is required for the SQL worksheet provider proof.');
    lease = await allocateDisposablePostgresDatabase(adminUrl, 'sql_worksheet_3951');
    pool = new Pool({ connectionString: lease.url });
    const grants = new EmbeddedPrincipalGrantRepository(pool);
    await grants.migrate();
    await new EmbeddedProjectOnboardingRepository(pool).migrate();
    await seedLocalProtectedRuntimeGrant({
      databaseUrl: lease.url,
      principalId: 'unchanged-viewer',
      tenantActions: ['workspace:files:view'],
      workspaceScope: SQL_SCOPE,
    });
    await seedLocalProtectedRuntimeGrant({
      databaseUrl: lease.url,
      principalId,
      tenantActions: LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS,
      workspaceScope: SQL_SCOPE,
    });
    auth = await startLocalProtectedRuntimeAuth({ env: { DVT_DEV_PRINCIPAL_ID: principalId } });
    const authenticator = new OidcAuthenticator(
      new JwksJwtVerifier({
        jwksUri: auth.oidcEnv.OIDC_JWKS_URI,
        issuer: auth.oidcEnv.OIDC_ISSUER,
        audience: auth.oidcEnv.OIDC_AUDIENCE,
      })
    );
    parent = await realpath(tmpdir());
    root = await mkdtemp(path.join(parent, 'dvt-sql-native-'));
    history = new LocalWorkspaceSqlExecutionHistoryRepository({ root });
    app = await createSqlProofApp({ authenticator, grants, history, connectionString: lease.url });
  });

  afterAll(async () => {
    await closeProofResources([app, auth, pool], lease);
    if (root !== undefined) {
      expect(path.dirname(root)).toBe(parent);
      expect(path.basename(root)).toMatch(/^dvt-sql-native-/u);
      await rm(root, { recursive: true, force: true });
    }
  });

  function headers(): Readonly<{ authorization: string }> {
    if (auth === undefined) throw new Error('Local auth proof was not initialized.');
    return { authorization: `Bearer ${auth.webEnv.VITE_API_BEARER_TOKEN}` };
  }

  it('exposes actual SQL session grants and runs unsaved SQL with duplicate columns, nulls and truncation', async () => {
    const session = await app.inject({ url: '/session', headers: headers() });
    expect(session.statusCode).toBe(200);
    expect(session.headers['x-ratelimit-limit']).toBe('1000');
    expect(session.json().grants.scopes).toEqual(
      expect.arrayContaining(['workspace:sql:execute', 'workspace:sql-history:view'])
    );
    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sql/executions?${SQL_SCOPE_QUERY}`,
      headers: headers(),
      payload: {
        connectionId: 'warehouse',
        limit: 1,
        sql: 'select n as same, null::text as same from generate_series(1, 3) n order by n',
      },
    });
    expect(response.statusCode).toBe(200);
    const result = ExecuteWorkspaceSqlResponseSchema.parse(response.json());
    expect(result.execution).toMatchObject({
      status: 'succeeded',
      principalId,
      rowCount: 1,
      truncated: true,
    });
    expect(result.result).toEqual({
      columns: [
        { name: 'same', type: 'integer', nullable: true },
        { name: 'same', type: 'text', nullable: true },
      ],
      rows: [{ values: ['1', null] }],
    });
    expect(result.execution.durationMs).toBeGreaterThan(0);
    const restarted = new LocalWorkspaceSqlExecutionHistoryRepository({ root });
    expect(await restarted.get(SQL_SCOPE, result.execution.executionId)).toEqual(result.execution);
    const page = await app.inject({
      url: `/workspace/sql/executions?${SQL_SCOPE_QUERY}`,
      headers: headers(),
    });
    expect(ListWorkspaceSqlExecutionsResponseSchema.parse(page.json()).executions).toContainEqual(
      result.execution
    );
    const viewer = await pool?.query<{ tenant_access: unknown }>(
      'select tenant_access from dvt.principal_grants where principal_id=$1',
      ['unchanged-viewer']
    );
    expect(JSON.stringify(viewer?.rows[0]?.tenant_access)).not.toContain('workspace:sql:');
  });

  it('returns a dollar-number literal as data while binding an independent truncation limit', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sql/executions?${SQL_SCOPE_QUERY}`,
      headers: headers(),
      payload: {
        connectionId: 'warehouse',
        sql: "select '$1' as marker from generate_series(1, 3)",
        limit: 1,
      },
    });
    expect(response.statusCode).toBe(200);
    expect(ExecuteWorkspaceSqlResponseSchema.parse(response.json())).toMatchObject({
      execution: { status: 'succeeded', limit: 1, rowCount: 1, truncated: true },
      result: { rows: [{ values: ['$1'] }] },
    });
  });

  it.each(['select $1::integer as value', 'select (select $2::integer) as value'])(
    'records a typed unsupported-parameter outcome for %s',
    async (sql) => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspace/sql/executions?${SQL_SCOPE_QUERY}`,
        headers: headers(),
        payload: { connectionId: 'warehouse', sql },
      });
      expect(response.statusCode).toBe(200);
      const failed = ExecuteWorkspaceSqlResponseSchema.parse(response.json());
      expect(failed.execution).toMatchObject({
        sql,
        status: 'failed',
        error: { code: 'sql_invalid' },
      });
      expect(failed.result).toBeUndefined();
      expect(await history.get(SQL_SCOPE, failed.execution.executionId)).toEqual(failed.execution);
    }
  );

  it('persists safe failed SELECT outcomes and refuses writes without changing the provider database', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sql/executions?${SQL_SCOPE_QUERY}`,
      headers: headers(),
      payload: { connectionId: 'warehouse', sql: 'create table forbidden_sql_write(n integer)' },
    });
    expect(response.statusCode).toBe(200);
    const outcome = ExecuteWorkspaceSqlResponseSchema.parse(response.json());
    expect(outcome.execution).toMatchObject({ status: 'failed', error: { code: 'sql_invalid' } });
    expect(outcome.result).toBeUndefined();
    expect(await history.get(SQL_SCOPE, outcome.execution.executionId)).toEqual(outcome.execution);
    const table = await pool?.query<{ relation: string | null }>(
      "select to_regclass('public.forbidden_sql_write')::text as relation"
    );
    expect(table?.rows).toEqual([{ relation: null }]);
  });

  it('enforces the real provider statement deadline and records its typed terminal failure', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sql/executions?${SQL_SCOPE_QUERY}`,
      headers: headers(),
      payload: { connectionId: 'warehouse', sql: 'select pg_sleep(10)' },
    });
    expect(response.statusCode).toBe(200);
    const outcome = ExecuteWorkspaceSqlResponseSchema.parse(response.json());
    expect(outcome.execution).toMatchObject({ status: 'failed', error: { code: 'query_timeout' } });
    expect(outcome.result).toBeUndefined();
  });

  it('uses the native extended protocol without values and rejects multiple commands', async () => {
    if (pool === undefined) throw new Error('The disposable PostgreSQL provider is unavailable.');
    const query = {
      text: 'select 1; select 2',
      rowMode: 'array',
      queryMode: 'extended',
    } satisfies QueryArrayConfig & Readonly<{ queryMode: 'extended' }>;
    await expect(pool.query(query)).rejects.toMatchObject({ code: '42601' });
  });

  it('retains the configured role and rejects a function write inside the read-only transaction', async () => {
    if (pool === undefined) throw new Error('The disposable PostgreSQL provider is unavailable.');
    const identity = await pool.query<{ role: string }>('select current_user as role');
    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sql/executions?${SQL_SCOPE_QUERY}`,
      headers: headers(),
      payload: {
        connectionId: 'warehouse',
        sql: "select current_user as role, current_setting('transaction_read_only') as read_only",
      },
    });
    const outcome = ExecuteWorkspaceSqlResponseSchema.parse(response.json());
    expect(outcome.execution.status).toBe('succeeded');
    expect(outcome.result?.rows).toEqual([{ values: [identity.rows[0]?.role, 'on'] }]);
    await pool.query('create table worksheet_write_probe (value integer not null)');
    await pool.query(
      'create function worksheet_attempt_write() returns integer language plpgsql as $$ begin insert into worksheet_write_probe values (1); return 1; end $$'
    );
    const write = await app.inject({
      method: 'POST',
      url: `/workspace/sql/executions?${SQL_SCOPE_QUERY}`,
      headers: headers(),
      payload: { connectionId: 'warehouse', sql: 'select worksheet_attempt_write()' },
    });
    expect(ExecuteWorkspaceSqlResponseSchema.parse(write.json()).execution).toMatchObject({
      status: 'failed',
      error: { code: 'query_failed' },
    });
    expect(
      (await pool.query('select count(*)::integer as count from worksheet_write_probe')).rows
    ).toEqual([{ count: 0 }]);
  });
});

async function createSqlProofApp(
  input: Readonly<{
    authenticator: OidcAuthenticator;
    grants: EmbeddedPrincipalGrantRepository;
    history: LocalWorkspaceSqlExecutionHistoryRepository;
    connectionString: string;
  }>
): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify();
  const { authenticator, history } = input;
  await app.register(rateLimit, { global: false });
  registerProtectedSessionRoutes(
    app,
    {
      DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX: 1000,
      DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS: 60_000,
    },
    { authenticator }
  );
  registerSqlWorksheetRoutes(app, {
    authenticator,
    authorizer: new AuthorizeCommandScopeService(
      new EmbeddedAccessDecisionService(input.grants),
      { record: async () => undefined },
      () => new Date()
    ),
    executeCommand: new ExecuteWorkspaceSqlCommand({
      catalog: { getConnection: async () => SQL_CONNECTION },
      executor: new PostgresWorkspaceSqlExecutor({
        credentialResolver: { resolveCredential: async () => input.connectionString },
      }),
      history,
      now: () => new Date(),
      elapsedNow: () => performance.now(),
      nonce: randomUuidV4,
    }),
    listQuery: new ListWorkspaceSqlExecutionsQuery(history),
    getQuery: new GetWorkspaceSqlExecutionQuery(history),
  });
  return app;
}

async function closeProofResources(
  resources: readonly (Readonly<{ close(): Promise<unknown> }> | Pool | undefined)[],
  lease: Lease | undefined
): Promise<void> {
  try {
    for (const resource of resources) {
      if (resource === undefined) continue;
      if ('close' in resource) await resource.close();
      else await resource.end();
    }
  } finally {
    await lease?.dispose();
  }
}
