import { describe, expect, it } from 'vitest';
import { resolveDvtSubstraitColumnFunctions } from '@dvt/postgres-projection';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { querySelectedJoin } from './canvasSelectedJoin';
import { replaceSelectedJoinConditions } from './canvasSelectedJoinPredicate';
import { relationOutputSlots } from './canvasRelationOutputSchema';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';

function capability(name: 'trim' | 'upper'): string {
  const resolved = resolveDvtSubstraitColumnFunctions({
    dataTypes: ['string'],
    provider: 'postgres',
    resolution: 'complete',
  }).find((entry) => entry.name === name);
  if (resolved == null) throw new Error(`Missing ${name} capability.`);
  return resolved.capabilityId;
}

describe('selected relation derived output authoring', () => {
  it('inserts one ProjectRel over an exact JOIN operand and reconnects its consumer', async () => {
    const { session, root } = selectedUnaryScenario();
    const inputId = root.inputs[0]!;
    const input = await session.query(inputId);
    const sourceFieldId = input.bindings.find(
      (field) => field.parentFieldId == null && field.displayName === 'name'
    )!.fieldId;

    await applySelectedRelationDerivedOutput(session, {
      intent: 'insert',
      relationId: inputId,
      expectedRevision: session.revision,
      alias: 'normalized_name',
      capabilityId: capability('upper'),
      operandFieldIds: [sourceFieldId],
    });

    const nextRoot = session.locate(session.rootId, session.revision);
    const projectId = nextRoot.inputs[0]!;
    const project = session.locate(projectId, session.revision);
    expect(project.relation.relType.case).toBe('project');
    expect(project.inputs).toEqual([inputId]);
    expect((await session.query(projectId)).bindings.at(-1)?.displayName).toBe('normalized_name');
  });

  it('composes a new scalar over an existing derived FieldId in the same ProjectRel', async () => {
    const session = new CanvasRelationAnalysisSession('nested-derived-output');
    session.receive(connectedNamesProjectionDraft());
    const projectId = session.rootId;
    const source = await session.query(projectId);
    const sourceFieldId = source.bindings.find(
      (field) => field.parentFieldId == null && field.displayName === 'first_name'
    )!.fieldId;

    const trimmed = await applySelectedRelationDerivedOutput(session, {
      intent: 'edit',
      relationId: projectId,
      expectedRevision: session.revision,
      alias: 'trimmed_name',
      capabilityId: capability('trim'),
      operandFieldIds: [sourceFieldId],
    });
    const trimmedField = trimmed.sidecar.fields.find(
      (field) => field.relationId === projectId && field.displayName === 'trimmed_name'
    )!;
    const composed = await applySelectedRelationDerivedOutput(session, {
      intent: 'edit',
      relationId: projectId,
      expectedRevision: session.revision,
      alias: 'normalized_name',
      capabilityId: capability('upper'),
      operandFieldIds: [trimmedField.fieldId],
    });

    expect(
      composed.sidecar.fields.find((field) => field.displayName === 'trimmed_name')?.fieldId
    ).toBe(trimmedField.fieldId);
    const target = session.locate(projectId, session.revision);
    if (target.relation.relType.case !== 'project') throw new Error('Expected ProjectRel.');
    const expression = target.relation.relType.value.expressions.at(-1)?.rexType;
    expect(expression?.case).toBe('scalarFunction');
    if (expression?.case !== 'scalarFunction') throw new Error('Expected scalar expression.');
    expect(expression.value.arguments[0]?.argType.value.rexType.case).toBe('scalarFunction');
  });

  it('rejects duplicate aliases and stale revisions without changing the session', async () => {
    const session = new CanvasRelationAnalysisSession('derived-output-negative');
    session.receive(connectedNamesProjectionDraft());
    const schema = await session.query(session.rootId);
    const revision = session.revision;
    const request = {
      intent: 'edit' as const,
      relationId: session.rootId,
      expectedRevision: revision,
      alias: schema.bindings[0]!.displayName!,
      capabilityId: capability('upper'),
      operandFieldIds: [schema.bindings[0]!.fieldId] as const,
    };
    await expect(applySelectedRelationDerivedOutput(session, request)).rejects.toThrow();
    await expect(
      applySelectedRelationDerivedOutput(session, { ...request, expectedRevision: revision + 1 })
    ).rejects.toThrow();
    expect(session.revision).toBe(revision);
  });

  it('reuses a branch derivation in JOIN, derives after JOIN, and reloads stable identities', async () => {
    const { session, root } = selectedUnaryScenario();
    const joinId = root.binding.relationId;
    const leftId = root.inputs[0]!;
    const left = await session.query(leftId);
    const sourceFieldId = left.bindings.find(
      (field) => field.parentFieldId == null && field.displayName === 'name'
    )!.fieldId;
    const branchDocument = await applySelectedRelationDerivedOutput(session, {
      intent: 'insert',
      relationId: leftId,
      expectedRevision: session.revision,
      alias: 'normalized_name',
      capabilityId: capability('upper'),
      operandFieldIds: [sourceFieldId],
    });
    const branchField = branchDocument.sidecar.fields.find(
      (field) => field.displayName === 'normalized_name'
    )!;
    const selectedJoin = await querySelectedJoin(session, joinId, session.revision);
    expect(selectedJoin.fields.some((field) => field.fieldId === branchField.fieldId)).toBe(true);

    const rightField = selectedJoin.fields.find((field) => field.inputIndex === 1)!;
    await replaceSelectedJoinConditions(session, {
      relationId: joinId,
      expectedRevision: session.revision,
      conditions: [
        {
          left: { kind: 'field', sourceFieldId: branchField.fieldId },
          right: { kind: 'field', sourceFieldId: rightField.fieldId },
        },
      ],
    });
    const joined = await querySelectedJoin(session, joinId, session.revision);
    const slots = relationOutputSlots(joined.target, joined.inputs);
    const branchSlot = slots.find((slot) =>
      slot.fields.some((field) => field.sourceFieldId === branchField.fieldId)
    )!;
    await changeSelectedRelationOutputs(session, {
      relationId: joinId,
      expectedRevision: session.revision,
      outputs: [
        ...slots.flatMap((slot) =>
          slot.output == null ? [] : [{ slot: slot.slot, alias: slot.name }]
        ),
        { slot: branchSlot.slot, alias: branchSlot.name },
      ],
    });
    const joinOutput = await session.query(joinId);
    const reusableField = joinOutput.bindings.find(
      (field) => field.parentFieldId == null && field.sourceFieldId === branchField.fieldId
    )!;
    const finalDocument = await applySelectedRelationDerivedOutput(session, {
      intent: 'insert',
      relationId: joinId,
      expectedRevision: session.revision,
      alias: 'final_name',
      capabilityId: capability('trim'),
      operandFieldIds: [reusableField.fieldId],
    });
    const finalField = finalDocument.sidecar.fields.find(
      (field) => field.displayName === 'final_name'
    )!;

    const reopened = new CanvasRelationAnalysisSession('derived-output-reload');
    reopened.receive(finalDocument);
    expect(
      (await reopened.query(reopened.rootId)).bindings.map((field) => field.fieldId)
    ).toContain(finalField.fieldId);
    expect(
      (await querySelectedJoin(reopened, joinId, reopened.revision)).conditions?.[0]?.left
    ).toEqual({ kind: 'field', sourceFieldId: branchField.fieldId });
  });
});
