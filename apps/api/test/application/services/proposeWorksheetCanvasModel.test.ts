import {
  decodeDvtSubstraitPlanV1,
  DvtTransformAuthoringAuthorityV1Schema,
  resolveWorkspaceNodeInstances,
  WorksheetCanvasModelRequestSchema,
  WorkspaceGraphAuthoringDraftSchema,
} from '@dvt/contracts';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { describe, expect, it, vi } from 'vitest';

import { CompileCanvasModelSqlQuery } from '../../../src/application/services/compileCanvasModelSqlQuery.js';
import { PrepareCanvasSqlDraftProjection } from '../../../src/application/services/prepareCanvasSqlDraftProjection.js';
import { appendWorksheetFileModel } from '../../../src/application/services/worksheetCanvasModelDraft.js';

import {
  fileWorksheetModelHarness,
  nativeWorksheetModelHarness,
  worksheetCanvasHarness,
} from './worksheetCanvasModel.fixtures.js';

describe('ProposeWorksheetCanvasModel', () => {
  it('proposes a complete typed target and real source relations without persisting an intermediate graph', async () => {
    const h = worksheetCanvasHarness(),
      before = globalThis.structuredClone(h.record);
    const result = await h.query.execute(h.input, h.context);
    expect(result.status).toBe('valid');
    if (result.status !== 'valid') throw new Error('Expected a complete proposal');
    expect(WorkspaceGraphAuthoringDraftSchema.safeParse(result.draft).success).toBe(true);
    const node = result.draft.nodes.find((node) => node.id === h.input.modelId)!;
    const semantic = DvtTransformAuthoringAuthorityV1Schema.parse(
      node.metadata?.transformAuthoring
    ).semanticDocument;
    const { schemas, index } = deriveSubstraitSchemas({
      plan: decodeDvtSubstraitPlanV1(semantic),
      sidecar: semantic.sidecar,
    });
    expect(schemas.get(index.rootId)).toHaveLength(1);
    expect(result.columns).toMatchObject([
      { name: 'order_id', dataType: 'string', nullable: false },
    ]);
    expect(result.draft.edges.some((edge) => edge.targetId === h.input.modelId)).toBe(true);
    const source = resolveWorkspaceNodeInstances(result.draft.nodes).find(
      (node) => node.role === 'input'
    );
    expect(source?.metadata?.columns).toEqual(
      h.physical.page.kind === 'object-page' ? h.physical.page.objects[0]!.columns : undefined
    );
    const { proposalSha256, ...body } = result;
    expect(proposalSha256).toBe(sha256HexUtf8(jcsCanonicalize(body)));
    expect(h.record).toEqual(before);
    expect(h.save).not.toHaveBeenCalled();
  });
  it.each([
    'SELECT missing FROM raw.orders',
    'SELECT upper(order_id) FROM raw.orders',
    'DELETE FROM raw.orders',
  ])('refuses unrepresentable SQL atomically: %s', async (sql) => {
    const h = worksheetCanvasHarness();
    await expect(h.query.execute({ ...h.input, sql }, h.context)).rejects.toBeInstanceOf(Error);
    expect(h.draft.nodes).toEqual([]);
    expect(h.save).not.toHaveBeenCalled();
  });
  it('denies before any draft or connection/catalog read', async () => {
    const h = worksheetCanvasHarness();
    h.decide.mockResolvedValueOnce({ ok: false, reason: 'ACTION_NOT_GRANTED' });
    await expect(h.query.execute(h.input, h.context)).rejects.toMatchObject({
      name: 'CanvasModelSqlAccessDeniedError',
    });
    expect(h.read).not.toHaveBeenCalled();
    expect(h.getConnection).not.toHaveBeenCalled();
    expect(h.catalog.execute).not.toHaveBeenCalled();
  });
  it('rejects a stale expected revision before catalog IO and a revision changed during resolution', async () => {
    const h = worksheetCanvasHarness();
    await expect(
      h.query.execute({ ...h.input, expectedRevision: 'old' }, h.context)
    ).rejects.toMatchObject({ code: 'stale_context' });
    expect(h.catalog.execute).not.toHaveBeenCalled();
    h.read.mockResolvedValueOnce(h.record).mockResolvedValueOnce({ ...h.record, revision: 'r2' });
    await expect(h.query.execute(h.input, h.context)).rejects.toMatchObject({
      code: 'stale_context',
    });
  });
  it('rejects a foreign canvas or file authority without creating a candidate', async () => {
    const h = worksheetCanvasHarness();
    await expect(
      h.query.execute({ ...h.input, canvasId: 'foreign' }, h.context)
    ).rejects.toMatchObject({ code: 'model_unavailable' });
    h.authorityPolicy.resolveGraphDraftReadAuthority.mockResolvedValueOnce({
      kind: 'unresolved',
      reason: 'mixed_authority',
      canvasId: 'canvas-sql',
    });
    await expect(h.query.execute(h.input, h.context)).rejects.toMatchObject({
      code: 'model_unavailable',
    });
    expect(h.catalog.execute).not.toHaveBeenCalled();
  });
  it('retains an actual native Model producer edge and canonical producer reference', async () => {
    const h = await nativeWorksheetModelHarness();
    const result = await h.query.execute(h.input, h.context);
    if (result.status !== 'valid') throw new Error('Expected complete native producer proposal');
    const node = result.draft.nodes.find((node) => node.id === h.input.modelId)!;
    const semantic = DvtTransformAuthoringAuthorityV1Schema.parse(
      node.metadata?.['transformAuthoring']
    ).semanticDocument;
    expect(
      semantic.sidecar.relations.some((relation) => relation.producerRef?.nodeId === h.producerId)
    ).toBe(true);
    expect(
      result.draft.edges.some(
        (edge) => edge.sourceId === h.producerId && edge.targetId === h.input.modelId
      )
    ).toBe(true);
    expect(h.save).not.toHaveBeenCalled();
  });
  it('retains a real file-owned producer and revalidates its project/analysis without inventing native semantics', async () => {
    const h = await fileWorksheetModelHarness();
    const result = await h.query.execute(h.input, h.context);
    if (result.status !== 'valid') throw new Error('Expected complete file producer proposal');
    const file = result.draft.nodes.find((node) => node.metadata?.['dbtModelReference'] != null)!;
    expect(file.metadata).not.toHaveProperty('transformAuthoring');
    expect(
      result.draft.edges.some(
        (edge) => edge.sourceId === file.id && edge.targetId === h.input.modelId
      )
    ).toBe(true);
    expect(h.modelProducers.resolve).toHaveBeenCalledTimes(2);
    expect(h.save).not.toHaveBeenCalled();
  });
  it('refuses a stale file-model project digest before proposing any graph', async () => {
    const h = await fileWorksheetModelHarness();
    const models = h.input.models.map((model) =>
      model.kind === 'dbt-model' ? { ...model, projectRevisionSha256: 'd'.repeat(64) } : model
    );
    await expect(
      h.query.execute(WorksheetCanvasModelRequestSchema.parse({ ...h.input, models }), h.context)
    ).rejects.toMatchObject({ code: 'stale_context' });
    expect(h.draft.nodes).toEqual([]);
  });
  it('pins source context independently of freshly allocated proposal identities', async () => {
    const h = worksheetCanvasHarness();
    const first = await h.query.execute(h.input, h.context),
      second = await h.query.execute(h.input, h.context);
    expect(first.contextSha256).toBe(second.contextSha256);
    if (first.status !== 'valid' || second.status !== 'valid')
      throw new Error('Expected complete proposals');
    expect(first.proposalSha256).not.toBe(second.proposalSha256);
  });
  it('reuses an existing file publication while preserving its assigned canonical IDs', async () => {
    const h = await fileWorksheetModelHarness(),
      observed = h.input.models[0]!;
    if (observed.kind !== 'dbt-model') throw new Error('Expected file observation');
    const canonical = {
      ...observed.reference,
      relationId: 'already-published',
      fields: observed.reference.fields.map((field) => ({
        ...field,
        fieldId: 'already-' + field.fieldId,
      })),
    };
    const first = appendWorksheetFileModel(h.draft, canonical);
    const reused = appendWorksheetFileModel(first.draft, observed.reference);
    expect(reused.draft).toBe(first.draft);
    expect(reused.node.id).toBe(first.node.id);
    expect(reused.node.metadata?.['dbtModelReference']).toEqual(canonical);
  });
  it('verifies current authority without another target compilation or projection', async () => {
    const h = worksheetCanvasHarness(),
      first = await h.query.execute(h.input, h.context);
    const compile = vi.spyOn(CompileCanvasModelSqlQuery.prototype, 'prepare');
    const project = vi.spyOn(PrepareCanvasSqlDraftProjection.prototype, 'execute');
    try {
      const result = await h.query.execute(
        { ...h.input, verifyContextSha256: first.contextSha256 },
        h.context
      );
      expect(result).toMatchObject({ status: 'current', contextSha256: first.contextSha256 });
      expect(result).not.toHaveProperty('draft');
      expect(compile).not.toHaveBeenCalled();
      expect(project).not.toHaveBeenCalled();
    } finally {
      compile.mockRestore();
      project.mockRestore();
    }
  });
});
