/** Exercise the actual proposal/compiler boundary for a source-free literal Model. */
import { decodeDvtSubstraitPlanV1, DvtTransformAuthoringAuthorityV1Schema } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { worksheetCanvasHarness } from './worksheetCanvasModel.fixtures.js';

describe('literal SQL worksheet Model proposal', () => {
  it('preserves SELECT 1 and its explicit alias without fabricating an input or writing a draft', async () => {
    const h = worksheetCanvasHarness();
    const input = { ...h.input, sql: 'SELECT 1 AS comprobacion_editor_sql' };
    const before = globalThis.structuredClone(h.record);
    const proposal = await h.query.execute(input, h.context);
    expect(proposal.status).toBe('valid');
    if (proposal.status !== 'valid') throw new Error('Expected a complete literal Model proposal.');
    expect(proposal.draft.nodes).toHaveLength(1);
    const node = proposal.draft.nodes[0]!;
    expect(node.id).toBe(input.modelId);
    expect(node.metadata?.connectionRef).toEqual(input.connectionRef);
    expect(proposal.draft.nodeIds).toEqual([node.id]);
    expect(proposal.draft.edges).toEqual([]);
    const authority = DvtTransformAuthoringAuthorityV1Schema.parse(
      node.metadata?.transformAuthoring
    );
    const plan = decodeDvtSubstraitPlanV1(authority.semanticDocument);
    expect(plan.relations[0]?.relType).toMatchObject({
      case: 'root',
      value: {
        names: ['comprobacion_editor_sql'],
        input: { relType: { case: 'read', value: { readType: { case: 'virtualTable' } } } },
      },
    });
    expect(authority.semanticDocument.sidecar.relations).toHaveLength(1);
    expect(authority.semanticDocument.sidecar.relations[0]).not.toHaveProperty('sourceRef');
    expect(authority.semanticDocument.sidecar.relations[0]).not.toHaveProperty('producerRef');
    expect(proposal.columns).toMatchObject([
      { name: 'comprobacion_editor_sql', dataType: 'i32', nullable: false },
    ]);
    expect(h.catalog.execute).not.toHaveBeenCalled();
    expect(h.getConnection).toHaveBeenCalledTimes(1);
    expect(h.save).not.toHaveBeenCalled();
    expect(h.record).toEqual(before);
  });

  it('binds the selected execution connection into confirmation freshness', async () => {
    const h = worksheetCanvasHarness();
    const input = { ...h.input, sql: 'SELECT 1 AS comprobacion_editor_sql' };
    const first = await h.query.execute(input, h.context);
    const other = { ...input.connectionRef, connectionId: 'other-warehouse' };
    const connection = await h.getConnection();
    h.getConnection.mockResolvedValue({ ...connection, id: other.connectionId });
    const second = await h.query.execute({ ...input, connectionRef: other }, h.context);
    expect(second.contextSha256).not.toBe(first.contextSha256);
    await expect(
      h.query.execute(
        { ...input, connectionRef: other, verifyContextSha256: first.contextSha256 },
        h.context
      )
    ).rejects.toMatchObject({ code: 'stale_context' });
    expect(h.save).not.toHaveBeenCalled();
  });
});
