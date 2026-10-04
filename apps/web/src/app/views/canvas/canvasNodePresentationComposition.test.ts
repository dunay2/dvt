import { describe, expect, it } from 'vitest';

import { SOURCE, EDGE, buildCanonicalTransform } from './canvasOutputProjection.test-support';
import {
  readDvtTransformAuthoringAuthority,
  applyDvtSubstraitSemanticDocument,
} from './canvasDvtTransformAuthoringAuthority';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationFilter } from './canvasSelectedRelationFilter';
import { dvtSubstraitTextComparison } from './canvasDvtSubstraitTextComparison';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import { selectGraphNodeCardColumns } from './canvasGraphNodeColumnProjection';
import { graphJoin, graphModel } from './canvasRelationGraph.test-support';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';

describe('Composed relation card schema', () => {
  it('preserves the output identity and schema when filtering a projected result', async () => {
    const original = buildCanonicalTransform();
    const authority = readDvtTransformAuthoringAuthority(original)!;
    const session = new CanvasRelationAnalysisSession(original.id);
    session.receive(decodeDvtSubstraitSemanticDocument(authority.semanticDocument));
    try {
      const schema = await session.query(session.rootId);
      const selected = schema.bindings.find(
        (field) => schema.fields[field.outputOrdinal]?.type.kind.case === 'string'
      )!;
      const filtered = await applySelectedRelationFilter(session, {
        intent: 'insert',
        relationId: session.rootId,
        expectedRevision: session.revision,
        fieldId: selected.fieldId,
        capabilityId: dvtSubstraitTextComparison.capabilities[0]!.capabilityId,
        value: 'Ada',
      });
      const changed = applyDvtSubstraitSemanticDocument(
        original,
        encodeDvtSubstraitSemanticDocument(filtered)
      );
      const before = await projectCanvasNodePresentationTruth({
        node: original,
        nodes: [SOURCE, original],
        edges: [EDGE],
      });
      const after = await projectCanvasNodePresentationTruth({
        node: changed,
        nodes: [SOURCE, changed],
        edges: [EDGE],
      });
      const identity = (
        truth: typeof before
      ): readonly { name: string; type: string; nullable?: boolean }[] =>
        truth.columns.declared.map(({ name, type, nullable }) => ({ name, type, nullable }));
      expect(before.columns.declared).toHaveLength(schema.fields.length);
      expect(identity(after)).toEqual(identity(before));
      expect(selectGraphNodeCardColumns(after)).toEqual(after.columns.declared);
      const filteredSchema = await session.query(session.rootId);
      expect(after.columns.declared.map((column) => column.reference)).toEqual(
        filteredSchema.bindings
          .filter((field) => field.parentFieldId == null)
          .map((field) => field.fieldId)
      );
      expect(after.columns.declared.map((field) => field.name)).toEqual([
        'order_id',
        'customer_name',
      ]);
    } finally {
      session.dispose();
    }
  });
  it('publishes JOIN passthrough and derived fields with the same identities after reload', async () => {
    const { session, sources } = graphJoin();
    try {
      const joined = await session.query(session.rootId);
      const operand = joined.bindings.find((field) => field.parentFieldId == null)!;
      const document = await applySelectedRelationDerivedOutput(session, {
        intent: 'insert',
        relationId: session.rootId,
        expectedRevision: session.revision,
        alias: 'customer_copy',
        expression: { kind: 'field-ref', inputFieldId: operand.fieldId },
      });
      const model = graphModel(document);
      const args = {
        node: model,
        nodes: [...sources, model],
        edges: sources.map((source) => ({ sourceId: source.id, targetId: model.id })),
      };
      const truth = await projectCanvasNodePresentationTruth(args);
      const schema = await session.query(session.rootId);
      const output = selectGraphNodeCardColumns(truth);
      expect(truth.columns.state).toBe('ready');
      expect(output).toHaveLength(joined.fields.length + 1);
      expect(output.map((field) => field.reference)).toEqual(
        schema.bindings.filter((field) => field.parentFieldId == null).map((field) => field.fieldId)
      );
      expect(output.map((field) => field.name)).toEqual([
        'customer_id',
        'name',
        'right_customer_id_2',
        'right_name_2',
        'customer_copy',
      ]);
      expect(new Set(output.slice(0, -1).map((field) => field.sourceNodeId))).toEqual(
        new Set(sources.map((source) => source.id))
      );
      expect(output.at(-1)).toMatchObject({
        name: 'customer_copy',
        sourceFieldName: 'customer_id',
      });
      const reloaded = await projectCanvasNodePresentationTruth(JSON.parse(JSON.stringify(args)));
      expect(selectGraphNodeCardColumns(reloaded)).toEqual(output);
    } finally {
      session.dispose();
    }
  });
});
