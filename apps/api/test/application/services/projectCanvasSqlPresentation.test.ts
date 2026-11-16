/** Prove inspection rewrites require scoped provider evidence and preserve original authority. */
import { describe, expect, it, vi } from 'vitest';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../../src/application/ports/accessDecision.js';
import type { AuthorizedExecutionContext } from '../../../src/application/ports/authContract.js';
import { parsePostgresTransformSqlStructure } from '../../../src/application/services/postgresTransformSqlPolicy.js';
import { ProjectCanvasSqlPresentation } from '../../../src/application/services/projectCanvasSqlPresentation.js';
import { TenantId, ProjectId, EnvironmentId } from '../../../src/domain/auth/types.js';

const scope = { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' };
const context: AuthorizedExecutionContext = {
  principal: { principalId: 'user' } as AuthorizedExecutionContext['principal'],
  scope: buildEnvironmentAccessScope(
    TenantId.unsafe('tenant'),
    ProjectId.unsafe('project'),
    EnvironmentId.unsafe('dev')
  ),
  action: AUTHORIZATION_ACTION.workspaceGraphDraftView,
  requestId: 'sql',
  authorizedAt: new Date(),
};
const sql = 'select q.id as id from (select c.client_id as id from raw.client c) q';
async function harness(): Promise<
  Readonly<{
    policy: ProjectCanvasSqlPresentation;
    input: Parameters<ProjectCanvasSqlPresentation['execute']>[0];
    authorize: ReturnType<typeof vi.fn>;
    getConnection: ReturnType<typeof vi.fn>;
    read: ReturnType<typeof vi.fn>;
    execute: ReturnType<typeof vi.fn>;
  }>
> {
  const parsed = await parsePostgresTransformSqlStructure(sql);
  if (parsed.status !== 'valid') throw new Error('Expected valid SELECT fixture.');
  const authorize = vi.fn().mockResolvedValue({ ok: true, context });
  const getConnection = vi
    .fn()
    .mockResolvedValue({
      id: 'connection',
      type: 'postgres',
      database: 'warehouse',
      credentialRef: 'warehouse-credential',
    });
  const read = vi
    .fn()
    .mockResolvedValue({
      resolvedColumns: [{ schema: 'raw', table: 'client', columns: ['client_id', 'country'] }],
      scalarSemantics: 'pg_catalog',
    });
  const execute = vi.fn().mockResolvedValue({ status: 'valid' });
  const policy = new ProjectCanvasSqlPresentation({
    authorizer: { authorize },
    catalog: { getConnection },
    reader: { read },
    validator: { execute },
  });
  const input = {
    scope,
    connectionRef: {
      schemaVersion: 'connection-ref.v1' as const,
      connectionId: 'connection',
      provider: 'postgres' as const,
    },
    ast: parsed.ast,
    sql,
  };
  return { policy, input, authorize, getConnection, read, execute };
}

describe('Readable Canvas SQL policy', () => {
  it('uses the existing simplifier with exact scoped evidence and preflights the untouched original', async () => {
    const h = await harness(),
      before = globalThis.structuredClone(h.input.ast);
    const result = await h.policy.execute(h.input, context);
    expect(result.status).toBe('rewritten');
    if (result.status !== 'rewritten') throw new Error('Expected admitted projection fusion.');
    expect(result.sql.match(/select/gi)).toHaveLength(1);
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.steps.map((step) => step.rule)).toContain('SQLREAD1.PROJECTION_FUSION');
    expect(h.input.ast).toEqual(before);
    expect(h.authorize).toHaveBeenCalledWith(
      context.principal,
      { ...context.scope, action: AUTHORIZATION_ACTION.workspaceSourceImportView },
      'sql'
    );
    expect(h.getConnection).toHaveBeenCalledExactlyOnceWith(scope, 'connection');
    expect(h.read).toHaveBeenCalledExactlyOnceWith({
      credentialRef: 'warehouse-credential',
      database: 'warehouse',
      relations: [{ schema: 'raw', table: 'client' }],
    });
    expect(h.execute).toHaveBeenCalledExactlyOnceWith({
      scope,
      connectionRef: h.input.connectionRef,
      sql,
    });
  });

  it('does not resolve credentials, metadata or native SQL after permission denial', async () => {
    const h = await harness();
    h.authorize.mockResolvedValue({ ok: false, reason: 'tenant_access_denied' });
    expect(await h.policy.execute(h.input, context)).toEqual({
      status: 'retained',
      diagnostic: { code: 'metadata_permission_denied', path: '$' },
    });
    expect(h.getConnection).not.toHaveBeenCalled();
    expect(h.read).not.toHaveBeenCalled();
    expect(h.execute).not.toHaveBeenCalled();
  });

  it.each(['wrong-connection', 'metadata', 'unknown-column', 'native-validation'] as const)(
    'retains the whole original for %s',
    async (cause) => {
      const h = await harness();
      if (cause === 'wrong-connection')
        h.getConnection.mockResolvedValue({
          id: 'other',
          type: 'postgres',
          database: 'warehouse',
          credentialRef: 'other-credential',
        });
      if (cause === 'metadata') h.read.mockResolvedValue(null);
      if (cause === 'unknown-column')
        h.read.mockResolvedValue({
          resolvedColumns: [{ schema: 'raw', table: 'client', columns: ['country'] }],
        });
      if (cause === 'native-validation')
        h.execute.mockResolvedValue({ status: 'invalid', diagnostics: [] });
      const before = globalThis.structuredClone(h.input.ast),
        result = await h.policy.execute(h.input, context);
      expect(result.status).toBe('retained');
      expect(result).not.toHaveProperty('sql');
      expect(h.input.ast).toEqual(before);
      if (cause === 'wrong-connection') expect(h.read).not.toHaveBeenCalled();
      if (cause !== 'native-validation') expect(h.execute).not.toHaveBeenCalled();
    }
  );

  it('does not assume comparison semantics from column names or provider identity', async () => {
    const h = await harness();
    const parsed = await parsePostgresTransformSqlStructure(sql + " where q.id = 'client'");
    if (parsed.status !== 'valid') throw new Error('Expected valid comparison fixture.');
    h.read.mockResolvedValue({
      resolvedColumns: [{ schema: 'raw', table: 'client', columns: ['client_id', 'country'] }],
    });
    expect(
      await h.policy.execute({ ...h.input, ast: parsed.ast, sql: parsed.canonicalSql }, context)
    ).toMatchObject({ status: 'retained', diagnostic: { code: 'missing_resolution' } });
    expect(h.execute).not.toHaveBeenCalled();
  });
});
