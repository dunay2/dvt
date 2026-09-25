import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas, indexSubstraitRelations } from '@dvt/substrait-analysis';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationAggregate } from './canvasSelectedRelationAggregate';

describe('selected Aggregate authoring', () => {
  it('groups a projected instance without requiring JOIN or SET and preserves identity on edit', async () => {
    const document = connectedNamesProjectionDraft();
    const session = new CanvasRelationAnalysisSession('aggregate-test');
    session.receive(document);
    const inputId = session.rootId;
    const input = await session.query(inputId);
    const request = {
      intent: 'insert' as const,
      relationId: inputId,
      expectedRevision: session.revision,
      fieldId: input.bindings[0]!.fieldId,
      alias: 'population',
    };
    const grouped = await applySelectedRelationAggregate(session, request);
    const aggregateId = session.rootId;
    const aggregate = session.locate(aggregateId, session.revision);
    expect(aggregate.relation.relType.case).toBe('aggregate');
    expect(aggregate.inputs).toEqual([inputId]);
    const schema = await session.query(aggregateId);
    expect(schema.fields.map((field) => field.type.kind.case)).toEqual(['string', 'i64']);
    expect(schema.fields[0]!.sourceFieldIds).toEqual(input.fields[0]!.sourceFieldIds);
    expect(schema.fields[1]!.sourceFieldIds).toEqual([]);
    const edited = await applySelectedRelationAggregate(session, {
      ...request,
      intent: 'edit',
      relationId: aggregateId,
      expectedRevision: session.revision,
      alias: 'total',
    });
    expect(session.rootId).toBe(aggregateId);
    expect(edited.sidecar.fields.map((field) => field.fieldId)).toEqual(
      grouped.sidecar.fields.map((field) => field.fieldId)
    );
    const original = document.plan.relations[0]!.relType;
    if (original.case !== 'root') throw new Error('Expected root');
    expect(session.locate(inputId, session.revision).relation).toEqual(original.value.input);
    expect(indexSubstraitRelations(edited).ok).toBe(true);
    expect(deriveSubstraitSchemas(edited).schemas.get(aggregateId)).toHaveLength(2);
  });

  it.each(['missing-field', 'duplicate-alias', 'stale-revision'])(
    'rejects %s without publishing a partial change',
    async (failure) => {
      const document = connectedNamesProjectionDraft();
      const session = new CanvasRelationAnalysisSession('aggregate-negative');
      session.receive(document);
      const fields = await session.query(session.rootId);
      const before = session.revision;
      await expect(
        applySelectedRelationAggregate(session, {
          intent: 'insert',
          relationId: session.rootId,
          expectedRevision: failure === 'stale-revision' ? before - 1 : before,
          fieldId: failure === 'missing-field' ? 'foreign' : fields.bindings[0]!.fieldId,
          alias: failure === 'duplicate-alias' ? fields.bindings[0]!.displayName! : 'total',
        })
      ).rejects.toThrow();
      expect(session.revision).toBe(before);
      expect((await session.query(session.rootId)).fingerprint).toBe(fields.fingerprint);
    }
  );
});
