/** Retain the literal publication through protected selection, SQL and scoped preview preparation. */
import type { WorksheetCanvasModelProposal } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type { IDbtModelProducerResolver } from '../../../src/application/ports/dbtModelProducer.js';
import { projectDvtPostgresTransform } from '../../../src/application/services/dvtPostgresTransformProjection.js';
import { ProjectCanvasModelSqlContextQuery } from '../../../src/application/services/projectCanvasModelSqlContextQuery.js';
import { ResolveCanvasModelSqlInputs } from '../../../src/application/services/resolveCanvasModelSqlInputs.js';
import type { ResolveCanvasModelSqlPhysicalInput } from '../../../src/application/services/resolveCanvasModelSqlPhysicalInput.js';
import { resolveDvtTerminalTransformClosure } from '../../../src/application/services/resolveDvtTerminalTransformClosure.js';

import {
  worksheetCanvasHarness,
  type WorksheetCanvasHarness,
} from './worksheetCanvasModel.fixtures.js';

async function literalProposal(): Promise<
  Readonly<{
    h: WorksheetCanvasHarness;
    proposal: Extract<WorksheetCanvasModelProposal, { status: 'valid' }>;
  }>
> {
  const h = worksheetCanvasHarness();
  const proposal = await h.query.execute(
    { ...h.input, sql: 'SELECT 1 AS comprobacion_editor_sql' },
    h.context
  );
  if (proposal.status !== 'valid') throw new Error('Expected the actual literal proposal.');
  return { h, proposal };
}

describe('literal Model downstream authority', () => {
  it('projects the protected Model without adding sources, producer edges or changing its alias', async () => {
    const { h, proposal } = await literalProposal();
    const closure = resolveDvtTerminalTransformClosure({
      draft: proposal.draft,
      selectedNodeIds: proposal.draft.nodeIds,
      selectedEdgeIds: [],
      previewTargetId: proposal.modelId,
    });
    const projection = await projectDvtPostgresTransform(closure);
    expect(projection.outputs).toMatchObject([
      { name: 'comprobacion_editor_sql', nullable: false },
    ]);
    expect(projection.sourceRefs).toEqual([]);
    expect(closure.connectionRef).toEqual(h.input.connectionRef);
    expect(closure.literalConnections?.get(proposal.modelId)).toEqual(h.input.connectionRef);
    expect(projection.sql.toLowerCase()).not.toContain(' from ');
    expect(closure.edges).toEqual([]);
  });

  it('restores the literal SQL buffer and reauthorizes its selected connection before inspection', async () => {
    const { h, proposal } = await literalProposal();
    h.record.draftPayload = proposal.draft;
    const physical = { execute: vi.fn<ResolveCanvasModelSqlPhysicalInput['execute']>() };
    const inputs = new ResolveCanvasModelSqlInputs({
      projection: h.projection,
      physical,
      modelProducers: {
        resolve: vi.fn<IDbtModelProducerResolver['resolve']>(async () => new Map()),
      },
    });
    const query = new ProjectCanvasModelSqlContextQuery({
      inputs,
      store: { read: h.read },
      authorityPolicy: h.authorityPolicy,
      authorizer: h.authorizer,
      connectionCatalog: { getConnection: h.getConnection },
    });
    const target = { canvasId: proposal.canvasId, transformNodeId: proposal.modelId };
    const context = await query.execute(target, h.context);
    expect(context.inputs).toEqual([]);
    expect(context.connectionRef).toEqual(proposal.connectionRef);
    expect(context.sql).toMatch(/comprobacion_editor_sql/);
    expect(context.diagnostics).toEqual([]);
    expect(h.getConnection).toHaveBeenCalledTimes(2);
    expect(physical.execute).not.toHaveBeenCalled();
    h.decide.mockResolvedValue({ ok: false, reason: 'ACTION_NOT_GRANTED' });
    await expect(query.execute(target, h.context)).rejects.toMatchObject({
      name: 'CanvasModelSqlAccessDeniedError',
    });
    expect(h.getConnection).toHaveBeenCalledTimes(2);
  });

  it('refuses an absent execution connection rather than inventing a physical input', async () => {
    const { proposal } = await literalProposal();
    const draft = globalThis.structuredClone(proposal.draft);
    delete draft.nodes[0]!.metadata!['connectionRef'];
    expect(() =>
      resolveDvtTerminalTransformClosure({
        draft,
        selectedNodeIds: draft.nodeIds,
        selectedEdgeIds: [],
        previewTargetId: proposal.modelId,
      })
    ).toThrow(/input_unavailable/);
  });
});
