/** General chain laws use every registered signature, not a pairwise scenario matrix. */
import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import { DvtRelationalAuthoringDraftV1Schema } from '@dvt/contracts';
import {
  compositionGraphHarness,
  compositionKinds,
} from './canvasCompositionSequence.test-support';
import {
  configureCalculatedProducer,
  configureCompositionStep,
} from './canvasCompositionConfiguration.test-support';
import { readCanvasStagedCompositionSignature } from './canvasStagedOperation';
import { decodeCanvasStagedOperation } from './canvasStagedOperationDocument';
import { projectCanvasStagedOperation } from './canvasStagedOperationProjection';
import {
  createCanvasRelationalAuthoringDraft,
  restoreCanvasRelationalAuthoringDraft,
} from './canvasRelationalAuthoringDraft';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { relationOutputSlots } from './canvasRelationOutputSchema';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';

describe('catalog-wide configured semantic chains', () => {
  it.each(compositionKinds)('preserves valid semantics and identities around %s', async (kind) => {
    const harness = compositionGraphHarness();
    const assertRoundtrip = (outputRelationId: string): void => {
      const snapshot = JSON.stringify(harness.state.operations);
      const before = harness.state.operations.map(projectCanvasStagedOperation);
      const draft = createCanvasRelationalAuthoringDraft({
        ...harness.state,
        outputRelationId,
        positions: new Map(),
      });
      const parsed = DvtRelationalAuthoringDraftV1Schema.parse(JSON.parse(JSON.stringify(draft)));
      const restored = restoreCanvasRelationalAuthoringDraft(parsed, harness.inputs)!;
      expect(restored.outputRelationId).toBe(outputRelationId);
      expect(restored.operations).toEqual(harness.state.operations);
      expect(restored.sources.map((entry) => entry.read)).toEqual(
        harness.state.sources.map((entry) => entry.read)
      );
      expect(restored.operations.map(projectCanvasStagedOperation)).toEqual(before);
      expect(JSON.stringify(harness.state.operations)).toBe(snapshot);
      for (const operation of restored.operations) {
        const document = decodeCanvasStagedOperation(operation)!;
        const { index, schemas } = deriveSubstraitSchemas(document);
        expect(index.rootId).toBe(operation.id);
        expect(index.relations.get(operation.id)!.inputs).toEqual(operation.inputs);
        for (const [id, entry] of index.relations) {
          expect(schemas.get(id)).toHaveLength(
            entry.fields.filter((field) => field.parentFieldId == null).length
          );
          const staged = restored.operations.find((candidate) => candidate.id === id);
          if (staged != null) {
            const own = decodeCanvasStagedOperation(staged)!;
            expect(entry.fields).toEqual(
              own.sidecar.fields.filter((field) => field.relationId === id)
            );
          }
        }
      }
      harness.state.operations = restored.operations;
    };
    const left = await configureCalculatedProducer(harness, 0);
    const producers = [left];
    if (readCanvasStagedCompositionSignature(kind).inputs.length === 2) {
      producers.push(await configureCalculatedProducer(harness, 1));
    }
    const parentDocuments = harness.state.operations.map((entry) =>
      decodeCanvasStagedOperation(entry)!
    );
    const parentSql = await Promise.all(
      parentDocuments.map((document) => projectSubstraitToPostgresSql(document))
    );
    const center = await configureCompositionStep(harness, kind, producers);
    for (const [index, parent] of harness.state.operations.slice(0, producers.length).entries()) {
      const document = decodeCanvasStagedOperation(parent)!;
      // Local extension/rel anchors may change; stable identities and meaning may not.
      expect(document.sidecar.fields).toEqual(parentDocuments[index]!.sidecar.fields);
      expect(document.sidecar.relations.map((entry) => entry.relationId)).toEqual(
        parentDocuments[index]!.sidecar.relations.map((entry) => entry.relationId)
      );
      expect((await projectSubstraitToPostgresSql(document)).sql).toBe(parentSql[index]!.sql);
    }
    assertRoundtrip(center);
    const sorted = await configureCompositionStep(harness, 'sort', [center]);
    assertRoundtrip(sorted);
    const output = await configureCompositionStep(harness, 'field_transform', [sorted]);
    assertRoundtrip(output);

    const session = new CanvasRelationAnalysisSession(output);
    try {
      const original = decodeCanvasStagedOperation(harness.state.operations.at(-1))!;
      session.receive(original);
      const target = session.locate(output, session.revision);
      const slots = relationOutputSlots(
        target,
        await Promise.all(target.inputs.map((id) => session.query(id)))
      );
      const renamed = await changeSelectedRelationOutputs(session, {
        relationId: output,
        expectedRevision: session.revision,
        outputs: slots
          .map((slot, index) => ({ slot: slot.slot, alias: `column_${index}` }))
          .reverse(),
      });
      expect(renamed.sidecar.fields.filter((field) => field.relationId !== output)).toEqual(
        original.sidecar.fields.filter((field) => field.relationId !== output)
      );
      expect(
        renamed.sidecar.fields
          .filter((field) => field.relationId === output)
          .map((field) => field.fieldId)
          .sort()
      ).toEqual(target.fields.map((field) => field.fieldId).sort());
      const accepted = harness.commands().updateConfiguration(output, {
        operation: 'field_transform',
        semanticDocument: encodeDvtSubstraitSemanticDocument(renamed),
      });
      expect(accepted).toBe(true);
      assertRoundtrip(output);
      const revision = session.revision;
      await expect(
        applySelectedRelationDerivedOutput(session, {
          relationId: output,
          expectedRevision: revision,
          intent: 'edit',
          alias: 'bad_reference',
          formula: 'field_that_does_not_exist + 1',
        })
      ).rejects.toThrow();
      expect(session.revision).toBe(revision);
      expect(session.hasDocument(renamed)).toBe(true);
      await expect(
        changeSelectedRelationOutputs(session, {
          relationId: output,
          expectedRevision: revision - 1,
          outputs: [],
        })
      ).rejects.toThrow();
      expect(session.hasDocument(renamed)).toBe(true);
    } finally {
      session.dispose();
    }

    const sibling = harness.state.operations.find((entry) => entry.id === producers[1]);
    harness.commands().disconnect(left, 0);
    expect(
      harness.state.operations
        .filter((entry) => [left, center, sorted, output].includes(entry.id))
        .every((entry) => entry.semanticDocument == null)
    ).toBe(true);
    if (sibling != null)
      expect(harness.state.operations.find((entry) => entry.id === sibling.id)).toBe(sibling);
    const pending = harness.state.operations.find((entry) => entry.id === output)!;
    expect(projectCanvasStagedOperation(pending).output.fields).toEqual([]);
  });
});
