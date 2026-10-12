import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas, indexSubstraitRelations } from '@dvt/substrait-analysis';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationAggregate } from './canvasSelectedRelationAggregate';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';

describe('selected Aggregate authoring', () => {
  it.each(['2', '2.5'])(
    'sums the numeric expression %s and preserves its identity when edited',
    async (formula) => {
      const session = new CanvasRelationAnalysisSession('sum-authoring');
      session.receive(connectedNamesProjectionDraft());
      await applySelectedRelationDerivedOutput(session, {
        intent: 'edit',
        relationId: session.rootId,
        expectedRevision: session.revision,
        alias: 'amount',
        formula,
      });
      const input = await session.query(session.rootId);
      const request = {
        intent: 'insert' as const,
        relationId: session.rootId,
        expectedRevision: session.revision,
        fieldId: input.bindings[0]!.fieldId,
        alias: 'total',
        aggregateFunction: 'sum' as const,
        measureFieldId: input.bindings.at(-1)!.fieldId,
      };
      const document = await applySelectedRelationAggregate(session, request);
      const projected = await projectSubstraitToPostgresSql(document);
      expect(projected.sql).toContain('sum(');
      expect(projected.projection.outputs.at(-1)).toMatchObject({
        name: 'total',
        dataType: formula === '2' ? 'i64' : 'fp64',
        nullable: true,
      });
      const before = (await session.query(session.rootId)).bindings.map((field) => field.fieldId);
      await applySelectedRelationAggregate(session, {
        ...request,
        intent: 'edit',
        relationId: session.rootId,
        expectedRevision: session.revision,
        alias: 'revenue',
      });
      expect((await session.query(session.rootId)).bindings.map((field) => field.fieldId)).toEqual(
        before
      );
      session.dispose();
    }
  );

  it.each(['missing', 'text'])(
    'rejects a %s SUM operand without changing the document',
    async (operand) => {
      const session = new CanvasRelationAnalysisSession('sum-negative');
      session.receive(connectedNamesProjectionDraft());
      const input = await session.query(session.rootId);
      const revision = session.revision;
      await expect(
        applySelectedRelationAggregate(session, {
          intent: 'insert',
          relationId: session.rootId,
          expectedRevision: revision,
          fieldId: input.bindings[0]!.fieldId,
          alias: 'total',
          aggregateFunction: 'sum',
          measureFieldId: operand === 'missing' ? 'foreign' : input.bindings[0]!.fieldId,
        })
      ).rejects.toThrow();
      expect(session.revision).toBe(revision);
      session.dispose();
    }
  );
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
