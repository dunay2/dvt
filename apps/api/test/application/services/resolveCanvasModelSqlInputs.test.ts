/** Prove context preparation does not require or execute an incomplete target. */
import { describe, expect, it } from 'vitest';

import {
  modelSqlHarness,
  modelSqlPhysicalHarness,
  sqlAuth,
  sqlTarget,
} from './canvasModelSql.fixtures.js';

describe('ProjectCanvasModelSqlContext', () => {
  it('prepares physical logical inputs for an incomplete target without rows or native target projection', async () => {
    const h = modelSqlHarness();
    const result = await h.query.execute(sqlTarget, sqlAuth);
    expect(result.inputs.map((input) => input.sqlName)).toEqual(['orders', 'client']);
    expect(result.sql).toBeNull();
    expect(result.semanticPlanSha256).toBeNull();
    expect(result.inputs[0]?.columns[0]).toMatchObject({
      id: 'order_id',
      dataType: 'string',
      nullable: true,
    });
    expect(h.projection.execute).not.toHaveBeenCalled();
    expect(h.modelProducers.resolve).not.toHaveBeenCalled();
  });
  it('has an honest empty state when no inputs are connected', async () => {
    const h = modelSqlHarness();
    h.draft.edges = [];
    expect(await h.query.execute(sqlTarget, sqlAuth)).toMatchObject({
      inputs: [],
      sql: null,
      connectionRef: null,
    });
  });
  it('does not expose a closed dependency as a logical input', async () => {
    const h = modelSqlHarness();
    h.draft.edges[0]!.metadata = { executionGate: 'closed' };
    const result = await h.query.execute(sqlTarget, sqlAuth);
    expect(result.inputs.map((input) => input.sqlName)).toEqual(['client']);
  });
  it('rejects a different canvas, file-owned target or mixed authority before resolving inputs', async () => {
    const h = modelSqlHarness();
    await expect(
      h.query.execute({ ...sqlTarget, canvasId: 'other' }, sqlAuth)
    ).rejects.toMatchObject({ code: 'model_unavailable' });
    h.authorityPolicy.resolveGraphDraftReadAuthority.mockResolvedValueOnce({
      kind: 'unresolved',
      reason: 'mixed_authority',
      canvasId: sqlTarget.canvasId,
    });
    await expect(h.query.execute(sqlTarget, sqlAuth)).rejects.toMatchObject({
      code: 'model_unavailable',
    });
    expect(h.projection.execute).not.toHaveBeenCalled();
  });
  it('rejects revision changes while publications are being resolved', async () => {
    const h = modelSqlHarness();
    h.store.read
      .mockResolvedValueOnce(h.record)
      .mockResolvedValueOnce({ ...h.record, revision: 'r2' });
    await expect(h.query.execute(sqlTarget, sqlAuth)).rejects.toMatchObject({
      code: 'stale_context',
    });
  });
  it('retains unknown legacy nullability rather than inventing a type proof', async () => {
    const h = modelSqlHarness();
    h.draft.nodes[0]!.metadata = {
      ...h.draft.nodes[0]!.metadata,
      columns: [{ name: 'order_id', type: 'text' }],
    };
    const result = await h.query.execute(sqlTarget, sqlAuth);
    expect(result.inputs[0]?.columns[0]).toMatchObject({ dataType: null, nullable: null });
  });
  it('resolves missing legacy facts by exact scoped catalog identity without exposing extra columns', async () => {
    const h = modelSqlPhysicalHarness();
    const result = await h.reader.execute(h.node, sqlAuth);
    expect(result.columns).toEqual([
      { id: 'order_id', name: 'order_id', dataType: 'string', nullable: false },
    ]);
    expect(h.execute).toHaveBeenCalledWith(
      { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' },
      expect.any(String),
      { kind: 'name-search', name: 'orders', limit: 100 }
    );
    expect(h.node.metadata?.columns).toEqual([{ name: 'order_id', type: 'text' }]);
  });
  it('does not consult catalog metadata without source-view authorization', async () => {
    const h = modelSqlPhysicalHarness(false);
    await expect(h.reader.execute(h.node, sqlAuth)).rejects.toMatchObject({
      name: 'CanvasModelSqlAccessDeniedError',
    });
    expect(h.execute).not.toHaveBeenCalled();
  });
  it('does not replace an unavailable source identity by a similarly named catalog object', async () => {
    const h = modelSqlPhysicalHarness();
    if (h.page.kind !== 'object-page') throw new Error('Expected an object page.');
    h.page.objects[0]!.objectId = 'other';
    await expect(h.reader.execute(h.node, sqlAuth)).rejects.toMatchObject({
      code: 'input_unavailable',
    });
  });
});
