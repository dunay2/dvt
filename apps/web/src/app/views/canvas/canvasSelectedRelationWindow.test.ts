import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationWindow } from './canvasSelectedRelationWindow';

describe('selected window authoring', () => {
  it('adds ROW_NUMBER to a projection and edits its alias without rebuilding the operand', async () => {
    const document = connectedNamesProjectionDraft();
    const session = new CanvasRelationAnalysisSession('window-test');
    session.receive(document);
    const inputId = session.rootId;
    const input = await session.query(inputId);
    const request = {
      intent: 'insert' as const,
      relationId: inputId,
      expectedRevision: session.revision,
      fieldId: input.bindings[0]!.fieldId,
      alias: 'position',
    };
    const inserted = await applySelectedRelationWindow(session, request);
    const insertedInput = await session.query(inputId);
    const windowId = session.rootId;
    expect(session.locate(windowId, session.revision).inputs).toEqual([inputId]);
    const schema = await session.query(windowId);
    expect(schema.fields.slice(0, -1)).toEqual(input.fields);
    expect(schema.fields.at(-1)!.type.kind.case).toBe('i64');
    expect(schema.fields.at(-1)!.sourceFieldIds).toEqual(input.fields[0]!.sourceFieldIds);
    const edited = await applySelectedRelationWindow(session, {
      ...request,
      intent: 'edit',
      relationId: windowId,
      expectedRevision: session.revision,
      alias: 'rank',
    });
    expect(edited.sidecar.fields.map((field) => field.fieldId)).toEqual(
      inserted.sidecar.fields.map((field) => field.fieldId)
    );
    expect(deriveSubstraitSchemas(edited).schemas.get(windowId)).toEqual(schema.fields);
    expect((await session.query(inputId)).fingerprint).toBe(insertedInput.fingerprint);
    const original = document.plan.relations[0]!.relType;
    if (original.case !== 'root') throw new Error('Expected root');
    expect(session.locate(inputId, session.revision).relation).toEqual(original.value.input);
  });

  it('rejects a foreign ordering field without changing the revision', async () => {
    const session = new CanvasRelationAnalysisSession('window-negative');
    session.receive(connectedNamesProjectionDraft());
    const revision = session.revision;
    await expect(
      applySelectedRelationWindow(session, {
        intent: 'insert',
        relationId: session.rootId,
        expectedRevision: revision,
        fieldId: 'foreign',
        alias: 'rank',
      })
    ).rejects.toThrow();
    expect(session.revision).toBe(revision);
  });
});
