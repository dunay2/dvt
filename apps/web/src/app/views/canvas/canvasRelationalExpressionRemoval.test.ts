import { describe, expect, it } from 'vitest';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { withScalarOutput, withWindowOutput } from './canvasRelationalExpressionStage.test-support';
import { removeCanvasRelationalExpression } from './canvasRelationalFieldSelection';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { relationOutputMapping } from './canvasRelationOutputBindings';
import { projectSemanticWorkbenchRelations } from './semanticWorkbenchRelations';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';

function scenario(): CanvasRelationAnalysisSession {
  const session = new CanvasRelationAnalysisSession('expression-removal');
  session.receive(withWindowOutput(withScalarOutput()));
  return session;
}

describe('complete Project expression removal', () => {
  it.each([true, false])(
    'deletes exactly one definition (emitted: %s) and preserves reordered neighbors after reopen',
    async (emitted) => {
      const session = scenario();
      await changeSelectedRelationOutputs(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        outputs: (emitted ? [3, 2, 1, 0] : [3, 1, 0]).map((slot) => ({ slot })),
      });
      const before = session.locate(session.rootId, session.revision);
      if (before.relation.relType.case !== 'project') throw new Error('Expected Project');
      const expressions = structuredClone(before.relation.relType.value.expressions);
      const next = await removeCanvasRelationalExpression(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        expressionOrdinal: 0,
      });
      const reopened = new CanvasRelationAnalysisSession('reopened');
      reopened.receive(
        decodeDvtSubstraitSemanticDocument(encodeDvtSubstraitSemanticDocument(next))
      );
      const after = reopened.locate(reopened.rootId, reopened.revision);
      expect(after.inputs).toEqual(before.inputs);
      expect(after.fields).toEqual(
        before.fields
          .filter((field) => field.displayName !== 'customer_code_norm')
          .map((field, outputOrdinal) => ({ ...field, outputOrdinal }))
      );
      if (after.relation.relType.case !== 'project') throw new Error('Expected Project');
      expect(after.relation.relType.value.expressions).toEqual([expressions[1]]);
      expect(relationOutputMapping(after.relation, 3)).toEqual([2, 1, 0]);
      const graph = projectSemanticWorkbenchRelations(next, after.relation, 'model');
      expect(graph.nodes.some((node) => node.data.label.startsWith('UPPER'))).toBe(false);
      expect(
        graph.nodes.find((node) => node.data.label.startsWith('WINDOW'))?.data
          .projectExpressionOrdinal
      ).toBe(0);
      expect(
        graph.nodes
          .filter((node) => node.data.semanticKind === 'field')
          .every((node) => node.data.projectExpressionOrdinal == null)
      ).toBe(true);
    }
  );

  it('removes a Window definition without removing its scalar neighbor or input operand', async () => {
    const session = scenario();
    const before = session.locate(session.rootId, session.revision);
    const next = await removeCanvasRelationalExpression(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      expressionOrdinal: 1,
    });
    const after = session.locate(session.rootId, session.revision);
    expect(after.fields.map((field) => field.fieldId)).toEqual(
      before.fields.slice(0, -1).map((field) => field.fieldId)
    );
    expect(after.inputs).toEqual(before.inputs);
    const graph = projectSemanticWorkbenchRelations(next, after.relation, 'model');
    expect(graph.nodes.some((node) => node.data.label.startsWith('WINDOW'))).toBe(false);
    expect(
      graph.nodes.find((node) => node.data.label.startsWith('UPPER'))?.data.projectExpressionOrdinal
    ).toBe(0);
  });

  it.each(['stale', 'aborted', 'negative', 'fraction', 'missing', 'read', 'retained'])(
    'rejects %s removal without modifying the document',
    async (failure) => {
      const session = scenario();
      const before = session.locate(session.rootId, session.revision);
      const controller = new AbortController();
      if (failure === 'aborted') controller.abort();
      const request = {
        relationId: failure === 'read' ? before.inputs[0]! : session.rootId,
        expectedRevision: session.revision - (failure === 'stale' ? 1 : 0),
        expressionOrdinal:
          failure === 'negative'
            ? -1
            : failure === 'fraction'
              ? 0.5
              : failure === 'missing'
                ? 99
                : 0,
        signal: controller.signal,
      };
      const operation =
        failure === 'retained'
          ? changeSelectedRelationOutputs(session, {
              ...request,
              removeExpressionOrdinal: 0,
              outputs: [{ slot: 2 }],
            })
          : removeCanvasRelationalExpression(session, request);
      await expect(operation).rejects.toThrow();
      expect(session.locate(session.rootId, session.revision)).toEqual(before);
    }
  );
});
