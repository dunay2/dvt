/** The command targets canonical relation identity; names and operand position are not a profile. */
import { describe, expect, it } from 'vitest';
import { indexSubstraitRelations, deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { createDvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { dvtSubstraitTextComparison } from './canvasDvtSubstraitTextComparison';
import {
  applySelectedRelationFilter,
  removeSelectedRelationFilter,
} from './canvasSelectedRelationFilter';
import { transformNode } from './CanvasRelationalTreeWorkbench.test-support';
import { createCanvasRelationalTreeNodeDraft } from './canvasRelationalTreeAuthoringModel';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { resolveDvtTransformAuthoringMetadata } from './canvasDvtTransformAuthoring';

function scenario() {
  const source = (table: string) => ({
    nodeId: table,
    schema: 'raw',
    table,
    sourceRef: {
      schemaVersion: 'connected-source-ref.v1' as const,
      connectionRef: {
        schemaVersion: 'connection-ref.v1' as const,
        connectionId: 'warehouse',
        provider: 'postgres' as const,
      },
      sourceObjectId: `relation/dvt/raw/${table}`,
    },
  });
  const document = createDvtSubstraitJoinDraft({
    left: source('orders'),
    right: source('customers'),
    targetNodeId: 'model',
  });
  const session = new CanvasRelationAnalysisSession('model');
  session.receive(document);
  const index = indexSubstraitRelations(document);
  if (!index.ok) throw index.error;
  return { document, session, index: index.index };
}

describe('selected relation Filter command', () => {
  it.each([0, 1, 'result'] as const)(
    'filters %s and survives editing and removal',
    async (target) => {
      const { document, session, index } = scenario();
      const root = index.relations.get(index.rootId)!;
      const targetId = target === 'result' ? index.rootId : root.inputs[target]!;
      const fields = await session.query(targetId);
      const baseline = await session.query(index.rootId);
      const request = {
        intent: 'insert' as const,
        relationId: targetId,
        expectedRevision: session.revision,
        fieldId: fields.bindings[0]!.fieldId,
        capabilityId: dvtSubstraitTextComparison.capabilities[0]!.capabilityId,
        value: 'Selected only',
      };
      const filtered = await applySelectedRelationFilter(session, request);
      const next = indexSubstraitRelations(filtered);
      if (!next.ok) throw next.error;
      const filter = [...next.index.relations.values()].find(
        (entry) => entry.relation.relType.case === 'filter'
      )!;
      expect(filter.inputs).toEqual([targetId]);
      const saved = applyCanvasInspectorNodeDraft(
        transformNode(),
        createCanvasRelationalTreeNodeDraft(transformNode(), 'inner_join', filtered)
      );
      const reopened = resolveDvtTransformAuthoringMetadata(saved);
      expect(reopened.outcome).toBe('resolved');
      if (reopened.outcome !== 'resolved' || reopened.metadata.mode === 'uninitialized')
        throw new Error('Canonical document did not reopen');
      expect(reopened.metadata.plan).toEqual(filtered.plan);
      expect(reopened.metadata.sidecar).toEqual(filtered.sidecar);
      expect(deriveSubstraitSchemas(filtered).schemas.get(next.index.rootId)).toEqual(
        baseline.fields
      );
      expect(indexSubstraitRelations(document)).toEqual({ ok: true, index });
      const edited = await applySelectedRelationFilter(session, {
        ...request,
        intent: 'edit',
        relationId: filter.binding.relationId,
        expectedRevision: session.revision,
        value: 'Updated',
      });
      expect(edited.sidecar.relations).toEqual(filtered.sidecar.relations);
      expect(new Map(edited.sidecar.fields.map((field) => [field.fieldId, field]))).toEqual(
        new Map(filtered.sidecar.fields.map((field) => [field.fieldId, field]))
      );
      expect((await session.query(session.rootId)).fingerprint).not.toBe(baseline.fingerprint);
      const editedRelation = session.locate(filter.binding.relationId, session.revision).relation
        .relType;
      if (editedRelation.case !== 'filter') throw new Error('Expected Filter');
      expect(
        dvtSubstraitTextComparison.inspect(edited.plan, editedRelation.value.condition)
      ).toMatchObject({ sourceOrdinal: fields.bindings[0]!.outputOrdinal, value: 'Updated' });
      const removed = await removeSelectedRelationFilter(
        session,
        filter.binding.relationId,
        session.revision
      );
      expect(removed.sidecar.relations).toEqual(document.sidecar.relations);
      expect(new Map(removed.sidecar.fields.map((field) => [field.fieldId, field]))).toEqual(
        new Map(document.sidecar.fields.map((field) => [field.fieldId, field]))
      );
      expect(deriveSubstraitSchemas(removed).schemas.get(index.rootId)).toEqual(baseline.fields);
    }
  );

  it('rejects stale revisions and foreign fields without altering the document', async () => {
    const { document, session, index } = scenario();
    const inputs = index.relations.get(index.rootId)!.inputs;
    const before = await session.query(index.rootId);
    const request = {
      intent: 'insert' as const,
      relationId: inputs[0]!,
      expectedRevision: 0,
      fieldId: document.sidecar.fields.find((field) => field.relationId === inputs[1])!.fieldId,
      capabilityId: dvtSubstraitTextComparison.capabilities[0]!.capabilityId,
      value: 'wrong scope',
    };
    await expect(applySelectedRelationFilter(session, request)).rejects.toThrow();
    await expect(
      applySelectedRelationFilter(session, { ...request, expectedRevision: 3 })
    ).rejects.toThrow();
    await expect(
      applySelectedRelationFilter(session, { ...request, relationId: 'missing' })
    ).rejects.toThrow();
    expect(await session.query(index.rootId)).toEqual(before);
    expect(session.revision).toBe(0);
  });

  it('removes a filter without dangling identities in downstream filter results', async () => {
    const { session, index } = scenario();
    const request = {
      intent: 'insert' as const,
      relationId: index.rootId,
      expectedRevision: 0,
      fieldId: (await session.query(index.rootId)).bindings[0]!.fieldId,
      capabilityId: dvtSubstraitTextComparison.capabilities[0]!.capabilityId,
      value: 'one',
    };
    await applySelectedRelationFilter(session, request);
    const firstId = session.rootId;
    const firstSchema = await session.query(firstId);
    await applySelectedRelationFilter(session, {
      ...request,
      relationId: firstId,
      expectedRevision: session.revision,
      fieldId: firstSchema.bindings[0]!.fieldId,
      value: 'two',
    });
    const secondId = session.rootId;
    expect(secondId).not.toBe(firstId);
    const before = await session.query(secondId);
    const document = await removeSelectedRelationFilter(session, firstId, session.revision);
    expect(document.sidecar.relations.some((entry) => entry.relationId === firstId)).toBe(false);
    const removedIds = new Set(firstSchema.bindings.map((field) => field.fieldId));
    expect(document.sidecar.fields.some((field) => removedIds.has(field.sourceFieldId ?? ''))).toBe(
      false
    );
    expect((await session.query(secondId)).fields).toEqual(before.fields);
  });
});
