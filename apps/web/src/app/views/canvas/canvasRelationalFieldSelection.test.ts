import { describe, expect, it } from 'vitest';
import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';
import {
  canvasRelationalFieldConsumers,
  selectCanvasRelationalField,
} from './canvasRelationalFieldSelection';
import type { CanvasRelationalFieldReference } from './canvasRelationalTreeDrag';
import { querySelectedJoin } from './canvasSelectedJoin';
import { replaceSelectedJoinConditions } from './canvasSelectedJoinPredicate';
import { removeCanvasRelationalExpression } from './canvasRelationalFieldSelection';

function scenario(): {
  session: CanvasRelationAnalysisSession;
  document: ReturnType<typeof connectedNamesProjectionDraft>;
  reference: (
    relationId: string,
    fieldId: string,
    selectedOutput?: boolean
  ) => CanvasRelationalFieldReference;
} {
  const session = new CanvasRelationAnalysisSession('selection');
  const document = connectedNamesProjectionDraft();
  session.receive(document);
  const reference = (
    relationId: string,
    fieldId: string,
    selectedOutput = false
  ): CanvasRelationalFieldReference => ({
    rootId: session.rootId,
    revision: session.revision,
    relationId,
    fieldId,
    selectedOutput,
  });
  return { session, reference, document };
}

describe('scoped tree field selection', () => {
  it('treats a drop within the same Output as a no-op and rejects an aborted gesture', async () => {
    const { session, reference } = scenario();
    const field = (await session.query(session.rootId)).bindings[0]!;
    const ref = reference(session.rootId, field.fieldId, true);
    expect(
      await selectCanvasRelationalField(session, ref, { kind: 'add', relationId: session.rootId })
    ).toBeNull();
    const cancellation = new AbortController();
    cancellation.abort();
    await expect(
      selectCanvasRelationalField(session, ref, { kind: 'remove' }, cancellation.signal)
    ).rejects.toThrow();
    expect(session.revision).toBe(ref.revision);
  });
  it('removes one field and adds only the dragged input, retaining neighbors and ignoring repeats', async () => {
    const { session, reference } = scenario();
    const rootId = session.rootId;
    const original = await session.query(rootId);
    await selectCanvasRelationalField(
      session,
      reference(rootId, original.bindings[1]!.fieldId, true),
      { kind: 'remove' }
    );
    expect((await session.query(rootId)).bindings.map((f) => f.fieldId)).toEqual([
      original.bindings[0]!.fieldId,
    ]);
    const sourceId = session.locate(rootId, session.revision).inputs[0]!;
    const input = (await session.query(sourceId)).bindings[1]!;
    const result = await selectCanvasRelationalField(session, reference(sourceId, input.fieldId), {
      kind: 'add',
      relationId: rootId,
    });
    expect(result).not.toBeNull();
    const after = (await session.query(rootId)).bindings;
    expect(after.map((f) => f.displayName)).toEqual(['first_name', 'last_name']);
    expect(after[0]!.fieldId).toBe(original.bindings[0]!.fieldId);
    const revision = session.revision;
    expect(
      await selectCanvasRelationalField(session, reference(sourceId, input.fieldId), {
        kind: 'add',
        relationId: rootId,
      })
    ).toBeNull();
    expect(session.revision).toBe(revision);
    const reopened = new CanvasRelationAnalysisSession('reopened');
    reopened.receive(result!);
    expect((await reopened.query(rootId)).bindings).toEqual(after);
  });

  it('removes a composed expression without breaking canonical validation or SQL projection', async () => {
    const { session, reference } = scenario();
    await applySelectedRelationDerivedOutput(session, {
      intent: 'edit',
      relationId: session.rootId,
      expectedRevision: session.revision,
      alias: 'greeting',
      formula: "CONCAT(UPPER(first_name), ' hola')",
    });
    const field = (await session.query(session.rootId)).bindings.find(
      (f) => f.displayName === 'greeting'
    )!;
    const next = await selectCanvasRelationalField(
      session,
      reference(session.rootId, field.fieldId, true),
      { kind: 'remove' }
    );
    expect((await session.query(session.rootId)).bindings.map((f) => f.displayName)).toEqual([
      'first_name',
      'last_name',
    ]);
    const sql = await projectSubstraitToPostgresSql(next!);
    expect(sql.projection.outputs.map((f) => f.name)).toEqual(['first_name', 'last_name']);
    const relation = session.locate(session.rootId, session.revision).relation;
    expect(relation.relType.case === 'project' && relation.relType.value.expressions).toEqual([]);
  });

  it.each([
    'foreign-root',
    'stale',
    'missing-field',
    'input-removal',
    'physical-output',
    'unavailable',
  ])('rejects %s without changing the document', async (failure) => {
    const { session, reference, document } = scenario();
    const rootId = session.rootId;
    const inputId = session.locate(rootId, session.revision).inputs[0]!;
    const source = (await session.query(inputId)).bindings[0]!;
    const output = (await session.query(rootId)).bindings[0]!;
    const ref = { ...reference(rootId, output.fieldId, true) };
    if (failure === 'foreign-root') ref.rootId = 'other';
    if (failure === 'stale') ref.revision -= 1;
    if (failure === 'missing-field') ref.fieldId = 'missing';
    if (failure === 'input-removal') ref.selectedOutput = false;
    if (failure === 'physical-output') Object.assign(ref, reference(inputId, source.fieldId, true));
    if (failure === 'unavailable') session.receive(document, new Set([source.fieldId]));
    const revision = session.revision;
    const before = await session.query(rootId);
    await expect(selectCanvasRelationalField(session, ref, { kind: 'remove' })).rejects.toThrow();
    expect(session.revision).toBe(revision);
    expect(await session.query(rootId)).toEqual(before);
  });

  it('rejects an unrelated branch and removal required by JOIN without changing it', async () => {
    const { session, root } = selectedUnaryScenario();
    const inputName = (await session.query(root.inputs[0]!)).bindings[0]!.displayName!;
    const document = await applySelectedRelationDerivedOutput(session, {
      intent: 'insert',
      relationId: root.inputs[0]!,
      expectedRevision: session.revision,
      alias: 'derived',
      formula: `UPPER("${inputName}")`,
    });
    const target = session.locate(session.rootId, session.revision).inputs[0]!;
    const field = (await session.query(target)).bindings[0]!;
    const ref = {
      rootId: session.rootId,
      revision: session.revision,
      relationId: target,
      fieldId: field.fieldId,
      selectedOutput: true,
    };
    const before = await session.query(session.rootId);
    expect(canvasRelationalFieldConsumers(session, ref)).toContain(
      session.locate(session.rootId, session.revision).binding.displayName ?? 'join'
    );
    await expect(selectCanvasRelationalField(session, ref, { kind: 'remove' })).rejects.toThrow();
    await expect(
      selectCanvasRelationalField(session, ref, { kind: 'add', relationId: root.inputs[1]! })
    ).rejects.toThrow();
    const reopened = new CanvasRelationAnalysisSession('proof');
    reopened.receive(document);
    expect(await session.query(session.rootId)).toEqual(before);
    expect((await reopened.query(reopened.rootId)).fields).toEqual(before.fields);
  });

  it('rejects complete expression removal when a JOIN consumes the derived output', async () => {
    const { session, root } = selectedUnaryScenario();
    const derivedDocument = await applySelectedRelationDerivedOutput(session, {
      intent: 'insert',
      relationId: root.inputs[0]!,
      expectedRevision: session.revision,
      alias: 'trimmed_name',
      formula: 'TRIM(name)',
    });
    const join = await querySelectedJoin(session, session.rootId, session.revision);
    const derived = derivedDocument.sidecar.fields.find(
      (field) => field.displayName === 'trimmed_name'
    )!;
    const right = join.fields.find((field) => field.inputIndex === 1)!;
    await replaceSelectedJoinConditions(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      conditions: [
        {
          left: { kind: 'field', sourceFieldId: derived.fieldId },
          right: { kind: 'field', sourceFieldId: right.fieldId },
        },
      ],
    });
    const revision = session.revision;
    const before = await session.query(session.rootId);
    const expressionId = session.locate(session.rootId, revision).inputs[0]!;
    await expect(
      removeCanvasRelationalExpression(session, {
        relationId: expressionId,
        expectedRevision: revision,
        expressionOrdinal: 0,
      })
    ).rejects.toThrow();
    expect(session.revision).toBe(revision);
    expect(await session.query(session.rootId)).toEqual(before);
  });
});
