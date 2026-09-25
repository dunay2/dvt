import { describe, expect, it } from 'vitest';
import { resolveDvtSubstraitColumnFunctions } from '@dvt/postgres-projection';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';

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
});
