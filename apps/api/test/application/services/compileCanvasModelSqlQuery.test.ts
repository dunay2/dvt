/** Compilation proposes semantics; it never saves or runs user SQL directly. */
import {
  decodeDvtSubstraitPlanV1,
  ModelSqlCompilationRequestSchema,
  type ModelSqlCompilationRequest,
} from '@dvt/contracts';
import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import { describe, expect, it, vi } from 'vitest';

import { CompileCanvasModelSqlQuery } from '../../../src/application/services/compileCanvasModelSqlQuery.js';
import { PrepareCanvasSqlDraftProjection } from '../../../src/application/services/prepareCanvasSqlDraftProjection.js';
import { PreviewCanvasTransformRowsUseCase } from '../../../src/application/services/previewCanvasTransformRowsUseCase.js';

import { modelSqlHarness, sqlAuth, sqlTarget } from './canvasModelSql.fixtures.js';

async function fixture(): Promise<
  Omit<ReturnType<typeof modelSqlHarness>, 'query'> & {
    query: CompileCanvasModelSqlQuery;
    input: ModelSqlCompilationRequest;
  }
> {
  const h = modelSqlHarness();
  const context = await h.query.execute(sqlTarget, sqlAuth);
  const query = new CompileCanvasModelSqlQuery(h.query);
  const input = {
    ...sqlTarget,
    draftRevision: context.draftRevision,
    contextSha256: context.contextSha256,
    sql: 'SELECT country FROM client',
  };
  return { ...h, query, input };
}

describe('CompileCanvasModelSql', () => {
  it('returns a complete pinned canonical proposal and actual input additions', async () => {
    const h = await fixture();
    const result = await h.query.execute(h.input, sqlAuth);
    expect(result.status).toBe('valid');
    if (result.status !== 'valid') throw new Error('Expected an admitted proposal.');
    expect(result.columns.map((column) => column.name)).toEqual(['country']);
    expect(result.inputAdditions).toEqual([{ nodeId: 'source-client', columnId: 'country' }]);
    expect(result.semanticDocument.semanticPlan.sha256).toHaveLength(64);
    expect(h.projection.execute).not.toHaveBeenCalled();
  });
  it.each([
    'SELECT client.client_id AS client_id, client.country AS country FROM raw.client',
    'SELECT raw.client.client_id, raw.client.country FROM "raw"."client"',
    'SELECT raw.client.* FROM raw.client',
  ])('compiles a prepared physical reference with its original provenance: %s', async (sql) => {
    const h = await fixture();
    const result = await h.query.execute({ ...h.input, sql }, sqlAuth);
    if (result.status !== 'valid') throw new Error(JSON.stringify(result.diagnostics));
    expect(result.columns.map(({ name }) => name)).toEqual(['client_id', 'country']);
    expect(result.inputAdditions).toEqual([
      { nodeId: 'source-client', columnId: 'client_id' },
      { nodeId: 'source-client', columnId: 'country' },
    ]);
    expect(result.semanticDocument.sidecar.relations).toContainEqual(
      expect.objectContaining({
        sourceRef: h.draft.nodes.find((node) => node.id === 'source-client')?.metadata
          ?.connectedSourceRef,
      })
    );
  });
  it.each([
    'SELECT FROM',
    'DELETE FROM client',
    'SELECT upper(country) FROM client',
    'SELECT country FROM public.client',
    'SELECT country FROM unrelated.raw.client',
    'SELECT raw.client.country FROM raw.client AS c',
  ])('rejects syntax or unrepresentable SQL atomically: %s', async (sql) => {
    const h = await fixture();
    const result = await h.query.execute({ ...h.input, sql }, sqlAuth);
    expect(result).toMatchObject({
      status: 'invalid',
      diagnostics: [expect.objectContaining({ message: expect.any(String) })],
    });
    expect(result).not.toHaveProperty('semanticDocument');
  });
  it('rejects a stale context before parsing or proposing identities', async () => {
    const h = await fixture();
    await expect(
      h.query.execute(
        ModelSqlCompilationRequestSchema.parse({ ...h.input, contextSha256: 'a'.repeat(64) }),
        sqlAuth
      )
    ).rejects.toMatchObject({ code: 'stale_context' });
  });
  it('does not coerce an unknown publication type into a supported one', async () => {
    const h = modelSqlHarness();
    h.draft.nodes[1]!.metadata = {
      ...h.draft.nodes[1]!.metadata,
      columns: [{ name: 'country', type: 'numeric', nullable: true }],
    };
    const context = await h.query.execute(sqlTarget, sqlAuth);
    const query = new CompileCanvasModelSqlQuery(h.query);
    expect(
      await query.execute(
        {
          ...sqlTarget,
          draftRevision: context.draftRevision,
          contextSha256: context.contextSha256,
          sql: 'SELECT country FROM client',
        },
        sqlAuth
      )
    ).toMatchObject({
      status: 'invalid',
      diagnostics: [expect.objectContaining({ code: 'unknown_type' })],
    });
  });
  it('keeps Source publication restrictions when preparing the logical namespace', async () => {
    const h = modelSqlHarness();
    const context = await h.query.execute(sqlTarget, sqlAuth);
    const query = new CompileCanvasModelSqlQuery(h.query);
    const candidate = await query.execute(
      {
        ...sqlTarget,
        draftRevision: context.draftRevision,
        contextSha256: context.contextSha256,
        sql: 'SELECT country FROM client',
      },
      sqlAuth
    );
    if (candidate.status !== 'valid')
      throw new Error('Expected a real Source publication fixture.');
    h.draft.nodes[1]!.metadata = {
      ...h.draft.nodes[1]!.metadata,
      transformAuthoring: {
        version: 'v1',
        mode: 'substrait',
        semanticDocument: candidate.semanticDocument,
      },
    };
    const limited = await h.query.execute(sqlTarget, sqlAuth);
    expect(
      limited.inputs
        .find((input) => input.sqlName === 'client')
        ?.columns.map((column) => column.name)
    ).toEqual(['country']);
    expect(
      await query.execute(
        {
          ...sqlTarget,
          draftRevision: limited.draftRevision,
          contextSha256: limited.contextSha256,
          sql: 'SELECT client_id FROM raw.client',
        },
        sqlAuth
      )
    ).toMatchObject({
      status: 'invalid',
      diagnostics: [expect.objectContaining({ code: 'unknown_column' })],
    });
  });
  it('executes canonical SQL through the existing bounded probe without graph writes', async () => {
    const h = modelSqlHarness();
    const context = await h.query.execute(sqlTarget, sqlAuth);
    const compilation = new CompileCanvasModelSqlQuery(h.query);
    const previewTransformRows = vi.fn(async () => ({
      columns: [{ name: 'country', type: 'text', nullable: true }],
      rows: [{ values: ['ES'] }],
      truncated: false,
      queriedAt: '2026-11-17T00:00:00.000Z',
      navigation: 'bounded-first-page' as const,
    }));
    const rows = new PreviewCanvasTransformRowsUseCase({
      projection: h.projection,
      sqlDraftProjection: new PrepareCanvasSqlDraftProjection(compilation),
      connectionCatalog: {
        getConnection: vi.fn(async () => ({
          id: 'test',
          name: 'test',
          type: 'postgres' as const,
          database: 'test',
          credentialRef: 'test',
          sourceObjects: [],
        })),
      },
      probe: { previewTransformRows },
    });
    const before = JSON.stringify(h.record);
    const result = await rows.executeSqlDraft(
      {
        ...sqlTarget,
        schemaVersion: 'canvas-transform-sql-draft-data-sample.v1',
        draftRevision: context.draftRevision,
        contextSha256: context.contextSha256,
        sql: 'SELECT country FROM client',
        limit: 20,
      },
      sqlAuth
    );
    expect(result.sample.rows).toEqual([{ values: ['ES'] }]);
    expect(previewTransformRows).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, sql: expect.stringContaining('raw.client') })
    );
    expect(JSON.stringify(h.record)).toBe(before);
    expect(h.projection.execute).not.toHaveBeenCalled();
  });
  it('does not claim provenance for an available file producer absent from the canonical query closure', async () => {
    const h = await fixture();
    const admitted = await h.query.prepare(h.input, sqlAuth);
    if (admitted.response.status !== 'valid' || admitted.prepared.response.connectionRef == null)
      throw new Error('Expected a complete compilation fixture.');
    const document = {
      plan: decodeDvtSubstraitPlanV1(admitted.response.semanticDocument),
      sidecar: admitted.response.semanticDocument.sidecar,
    };
    const provenance = {
      canvasId: sqlTarget.canvasId,
      uniqueId: 'model.fixture.unused',
      contentSetSha256: admitted.response.sqlSha256,
      analysisSha256: admitted.response.semanticDocument.semanticPlan.sha256,
    };
    const producer = {
      document,
      connection: admitted.prepared.response.connectionRef,
      projection: await projectSubstraitToPostgresSql(document),
      provenance,
    };
    const prepared = {
      ...admitted.prepared,
      graph: {
        ...admitted.prepared.graph,
        externalProducers: new Map([['unused-file', producer]]),
      },
      externalProjections: new Map([['unused-file', producer.projection]]),
      modelRefs: new Map([['unused-file', provenance]]),
    };
    const compilation = { prepare: async () => ({ response: admitted.response, prepared }) };
    const result = await new PrepareCanvasSqlDraftProjection(compilation).execute(
      { ...h.input, schemaVersion: 'canvas-transform-sql-draft-data-sample.v1', limit: 20 },
      sqlAuth
    );
    expect(result.modelRefs).toEqual([]);
    expect(result.projection.sql).toContain('raw.client');
  });
});
