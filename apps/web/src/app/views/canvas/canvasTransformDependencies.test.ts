/**
 * Owned concern: prove durable dependency semantics, not copied expression snapshots.
 * @baseline ADR-0064: the canonical Plan owns meaning; FieldId owns authoring identity.
 * @decision Exercise the existing mutation rail and persisted reload boundary.
 * @consequence Editing a producer changes consumers without rewriting their formulas.
 * @version 1.0.0
 */
import { describe, expect, it } from 'vitest';
import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import {
  encodeDvtSubstraitSemanticDocument,
  decodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { relationOutputSlots } from './canvasRelationOutputSchema';
import { readCanvasTransformDependencyModel } from './canvasTransformDependencyModel';
import { projectionScenario } from './canvasProjectionScenario.test-support';
import { transformExpressionDependencies } from './canvasTransformExpressionReferences';
import type { SubstraitDocument } from '@dvt/substrait-analysis';

type Apply = (alias: string, formula: string, outputFieldId?: string) => Promise<SubstraitDocument>;
async function dependentNames(): Promise<{
  session: CanvasRelationAnalysisSession;
  apply: Apply;
  id: string;
  document: SubstraitDocument;
}> {
  const session = new CanvasRelationAnalysisSession('dependent-names');
  session.receive(connectedNamesProjectionDraft());
  const apply: Apply = (alias, formula, outputFieldId) =>
    applySelectedRelationDerivedOutput(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      intent: 'edit',
      alias,
      formula,
      ...(outputFieldId == null ? {} : { outputFieldId }),
    });
  const initial = await apply('clean_name', 'TRIM("first_name")');
  const id = initial.sidecar.fields.find(
    (field) => field.relationId === session.rootId && field.displayName === 'clean_name'
  )!.fieldId;
  await apply('upper_name', 'UPPER("clean_name")');
  const document = await apply('present', 'IS_NOT_NULL("upper_name")');
  return { session, apply, id, document };
}

describe('Transform calculated-field dependencies', () => {
  it('resolves canonical passthrough names without merging explicit aliases or their dependents', async () => {
    const session = new CanvasRelationAnalysisSession('projected-names');
    session.receive(projectionScenario({ sourceNodeId: 'customers', targetNodeId: 'names' }));
    const model = (): ReturnType<typeof readCanvasTransformDependencyModel> =>
      readCanvasTransformDependencyModel(session.locate(session.rootId, session.revision), (id) =>
        session.locate(id, session.revision)
      );
    const original = model();
    const name = original.definitions.find((entry) => entry.output?.displayName === 'name')!;
    const apply: Apply = (alias, formula, outputFieldId) =>
      applySelectedRelationDerivedOutput(session, {
        intent: 'edit',
        relationId: session.rootId,
        expectedRevision: session.revision,
        alias,
        formula,
        ...(outputFieldId == null ? {} : { outputFieldId }),
      });
    try {
      await apply('preferred', 'COALESCE(TRIM(name), country)');
      const preferred = model().definitions.find(
        (entry) => entry.output?.displayName === 'preferred'
      )!;
      expect(
        new Set(transformExpressionDependencies(preferred.expression, preferred.inputIds))
      ).toEqual(
        new Set(
          original.input.fields
            .filter((field) => ['name', 'country'].includes(field.displayName!))
            .map((field) => field.fieldId)
        )
      );
      const forwarded = model().definitions.find(
        (entry) => entry.output?.fieldId === name.output!.fieldId
      )!;
      await applySelectedRelationDerivedOutput(session, {
        intent: 'edit',
        relationId: session.rootId,
        expectedRevision: session.revision,
        alias: 'selected_name',
        expression: { kind: 'field-ref', inputFieldId: name.output!.fieldId },
      });
      const selected = model().definitions.find(
        (entry) => entry.output?.displayName === 'selected_name'
      )!;
      expect(transformExpressionDependencies(selected.expression, selected.inputIds)).toEqual([
        forwarded.id,
      ]);
      await apply('upper_name', 'UPPER(selected_name)');
      const document = await apply('selected_name', 'LOWER(name)', selected.output!.fieldId);
      session.receive(
        decodeDvtSubstraitSemanticDocument(encodeDvtSubstraitSemanticDocument(document))
      );
      const reopened = model();
      expect(reopened.root.fields.slice(0, 3).map((field) => field.fieldId)).toEqual(
        original.root.fields.map((field) => field.fieldId)
      );
      expect(reopened.definitions.find((entry) => entry.id === selected.id)?.output?.fieldId).toBe(
        selected.output!.fieldId
      );
      const upper = reopened.definitions.find(
        (entry) => entry.output?.displayName === 'upper_name'
      )!;
      expect(transformExpressionDependencies(upper.expression, upper.inputIds)).toEqual([
        selected.id,
      ]);
      expect((await projectSubstraitToPostgresSql(document)).sql).toMatch(/\blower\s*\(/i);
    } finally {
      session.dispose();
    }
  });

  it('rejects a genuinely calculated input homonym without changing the document', async () => {
    const session = new CanvasRelationAnalysisSession('calculated-homonym');
    session.receive(projectionScenario({ sourceNodeId: 'customers', targetNodeId: 'names' }));
    const target = session.locate(session.rootId, session.revision);
    const before = await applySelectedRelationDerivedOutput(session, {
      intent: 'edit',
      relationId: session.rootId,
      expectedRevision: session.revision,
      alias: 'name',
      outputFieldId: target.fields[0]!.fieldId,
      formula: "'different'",
    });
    const revision = session.revision;
    try {
      await expect(
        applySelectedRelationDerivedOutput(session, {
          intent: 'edit',
          relationId: session.rootId,
          expectedRevision: revision,
          alias: 'rejected',
          formula: 'UPPER(name)',
        })
      ).rejects.toMatchObject({ code: 'transform_dependency_ambiguous' });
      expect(session.revision).toBe(revision);
      expect(session.locate(session.rootId, revision).plan).toEqual(before.plan);
      expect(session.locate(session.rootId, revision).fields).toEqual(
        before.sidecar.fields.filter((field) => field.relationId === session.rootId)
      );
    } finally {
      session.dispose();
    }
  });

  it('preserves producer identity across rename, output order and persisted reload', async () => {
    const { session, apply, id } = await dependentNames();
    await apply('renamed', 'LOWER("first_name")', id);
    const root = session.locate(session.rootId, session.revision);
    const inputs = await Promise.all(root.inputs.map((input) => session.query(input)));
    const slots = relationOutputSlots(root, inputs)
      .filter((slot) => slot.output != null)
      .reverse();
    const document = await changeSelectedRelationOutputs(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      outputs: slots.map((slot) => ({ slot: slot.slot, alias: slot.name })),
    });
    session.receive(
      decodeDvtSubstraitSemanticDocument(encodeDvtSubstraitSemanticDocument(document))
    );
    const model = readCanvasTransformDependencyModel(
      session.locate(session.rootId, session.revision),
      (relationId) => session.locate(relationId, session.revision)
    );
    expect(
      model.definitions.find((definition) => definition.output?.fieldId === id)?.output?.displayName
    ).toBe('renamed');
    const result = await apply('another', 'IS_NOT_NULL("renamed")');
    expect((await projectSubstraitToPostgresSql(result)).sql).not.toMatch(/\bbtrim\s*\(/i);
    session.dispose();
  });

  it('edits a hidden definition without republishing it or freezing its consumers', async () => {
    const { session, apply, id } = await dependentNames();
    const root = session.locate(session.rootId, session.revision);
    const input = await session.query(root.inputs[0]!);
    const slots = relationOutputSlots(root, [input]).filter(
      (slot) => slot.output != null && slot.output.fieldId !== id
    );
    await changeSelectedRelationOutputs(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      outputs: slots.map((slot) => ({ slot: slot.slot, alias: slot.name })),
    });
    const model = readCanvasTransformDependencyModel(
      session.locate(session.rootId, session.revision),
      (relationId) => session.locate(relationId, session.revision)
    );
    const hidden = model.definitions.find(
      (definition) => definition.binding.displayName === 'clean_name'
    )!;
    const changed = await apply('clean_name', 'LOWER("first_name")', hidden.binding.fieldId);
    expect(
      (await session.query(session.rootId)).bindings.some(
        (field) => field.displayName === 'clean_name'
      )
    ).toBe(false);
    expect((await projectSubstraitToPostgresSql(changed)).sql).not.toMatch(/\bbtrim\s*\(/i);
    session.dispose();
  });
  it('keeps a dependency after changing its producer and a persisted reload', async () => {
    const { session, apply, id } = await dependentNames();
    const changed = await apply('clean_name', 'LOWER("first_name")', id);
    const reopened = decodeDvtSubstraitSemanticDocument(
      encodeDvtSubstraitSemanticDocument(changed)
    );
    const rendered = await projectSubstraitToPostgresSql(reopened);
    expect(rendered.sql).not.toMatch(/\b(?:btrim|trim)\s*\(/i);
    expect(rendered.sql).toMatch(/\blower\s*\(/i);
    expect(changed.sidecar.fields.find((field) => field.fieldId === id)?.displayName).toBe(
      'clean_name'
    );
    session.dispose();
  });

  it('rejects an indirect cycle atomically', async () => {
    const { session, apply, id } = await dependentNames();
    const revision = session.revision;
    await expect(apply('clean_name', 'LOWER("upper_name")', id)).rejects.toMatchObject({
      code: 'transform_dependency_cycle',
    });
    expect(session.revision).toBe(revision);
    session.dispose();
  });

  it('rejects a producer type change incompatible with its consumer atomically', async () => {
    const { session, apply, id } = await dependentNames();
    const revision = session.revision;
    await expect(apply('clean_name', '42', id)).rejects.toMatchObject({
      code: 'transform_dependency_type_conflict',
    });
    expect(session.revision).toBe(revision);
    session.dispose();
  });
});
