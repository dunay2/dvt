import { describe, expect, it } from 'vitest';
import {
  reorderCanvasColumnOutput,
  setCanvasColumnOutputIncluded,
} from './canvasColumnOutputAuthoring';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import { decodeDvtSubstraitProjectionDocument } from './canvasDvtSubstraitProjection';
import {
  encodeDvtSubstraitStructuredFieldDocument,
  inspectDvtSubstraitStructuredFieldDraft,
} from './canvasDvtSubstraitStructuredField';
import { composeDvtSubstraitProjectionFields } from './canvasDvtSubstraitStructuredFieldMutation';
import { createModelOutputDependencyFixture } from './canvasModelOutputDependency.test-support';
import { applyCanvasRelationOutput } from './canvasRelationOutputAuthoring';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import { createCanvasRelationalTreeProjectionDraft } from './canvasRelationalTreeProjectionAuthoring';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import {
  emptyModel,
  sourceNode,
  sourceColumns,
  outputFixture,
  projectedModel,
  projectionDraft,
} from './canvasColumnOutputAuthoring.test-support';

describe('Non-relational output command boundary', () => {
  it('preserves a structured root used by a canonical model consumer and its typed rejection', async () => {
    const fixture = await createModelOutputDependencyFixture();
    const structured = composeDvtSubstraitProjectionFields(
      projectionDraft(fixture.source, ['order_id', 'customer', 'amount']),
      {
        draggedFieldId: 'output:customer',
        targetFieldId: 'output:amount',
        parentFieldId: 'output:identity',
        parentName: 'identity',
      }
    );
    const producer = applyDvtSubstraitSemanticDocument(
      fixture.producer,
      encodeDvtSubstraitStructuredFieldDocument(structured)
    );
    const nodes = [fixture.source, producer, fixture.consumer];
    const edges = fixture.edges.filter((edge) => edge.sourceId !== fixture.right.id);
    const input = resolveCanvasDvtCompositionInputs({
      nodes,
      edges,
      targetNodeId: fixture.consumer.id,
    })[0]!;
    const consumer = applyDvtSubstraitSemanticDocument(
      fixture.consumer,
      encodeDvtSubstraitSemanticDocument(
        createCanvasRelationalTreeProjectionDraft({ input, targetNodeId: fixture.consumer.id })
      )
    );
    const catalog = new Map([fixture.source, producer, consumer].map((node) => [node.id, node]));
    const draftSession = {
      ...fixture.draftSession,
      workingSet: {
        ...fixture.draftSession.workingSet,
        visibleNodeIds: [...catalog.keys()],
        visibleEdges: edges.map(({ sourceId, targetId }) => ({ sourceId, targetId })),
      },
    };
    const before = structuredClone(draftSession);
    expect(
      setCanvasColumnOutputIncluded({
        draftSession,
        canonicalNodesById: catalog,
        targetNodeId: producer.id,
        columnId: 'output:identity',
        output: false,
      })
    ).toMatchObject({
      outcome: 'rejected',
      reason: 'model_output_required',
      consumer: { nodeId: consumer.id },
      fields: [
        { fieldId: 'output:identity:child:output:amount', name: 'amount' },
        { fieldId: 'output:identity:child:output:customer', name: 'customer' },
        { fieldId: 'output:identity', name: 'identity' },
      ],
    });
    expect(draftSession).toEqual(before);
  });

  it.each(['order_id', 'amount'])(
    'rejects card removal of %s before returning a changed aggregate',
    async (removed) => {
      const fixture = await createModelOutputDependencyFixture();
      const before = structuredClone(fixture.draftSession);
      expect(
        await applyCanvasRelationOutput({
          ...fixture,
          intent: {
            nodeId: fixture.producer.id,
            columnId: `output:${removed}`,
            output: false,
            columnType: 'string',
          },
        })
      ).toMatchObject({ outcome: 'rejected', reason: 'model_output_required' });
      expect(fixture.draftSession).toEqual(before);
    }
  );

  it.each(['empty', 'array', 'record', 'projection', 'sql'])(
    'does not manufacture or edit native Output through %s fallback',
    (shape) => {
      const source = sourceNode();
      const model =
        shape === 'projection' ? projectedModel(source, ['order_id', 'customer']) : emptyModel();
      if (shape === 'array') model.metadata = { columns: sourceColumns };
      if (shape === 'record')
        model.metadata = {
          columns: Object.fromEntries(
            sourceColumns.map((field) => [field.name, { type: field.type }])
          ),
        };
      if (shape === 'sql') model.metadata = { sql: 'select customer from source' };
      const fixture = outputFixture(source, model);
      const before = structuredClone(fixture.draftSession);
      for (const output of [true, false]) {
        expect(
          setCanvasColumnOutputIncluded({
            ...fixture,
            targetNodeId: model.id,
            columnId: shape === 'projection' ? 'output:customer' : 'customer',
            output,
          })
        ).toEqual({ outcome: 'rejected', reason: 'invalid_transform_authority' });
      }
      expect(
        reorderCanvasColumnOutput({
          ...fixture,
          targetNodeId: model.id,
          columnId: 'output:customer',
          targetColumnId: 'output:order_id',
          placement: 'before',
        })
      ).toEqual({ outcome: 'rejected', reason: 'invalid_transform_authority' });
      expect(fixture.draftSession).toEqual(before);
    }
  );

  it('preserves the explicit structured-root lifecycle without inventing a projection', () => {
    const source = sourceNode();
    const structured = composeDvtSubstraitProjectionFields(
      projectionDraft(source, ['order_id', 'customer', 'amount']),
      {
        draggedFieldId: 'output:customer',
        targetFieldId: 'output:order_id',
        parentFieldId: 'output:identity',
        parentName: 'identity',
      }
    );
    const model = applyDvtSubstraitSemanticDocument(
      emptyModel(),
      encodeDvtSubstraitStructuredFieldDocument(structured)
    );
    const fixture = outputFixture(source, model);
    const reordered = reorderCanvasColumnOutput({
      ...fixture,
      targetNodeId: model.id,
      columnId: 'output:identity',
      targetColumnId: 'output:order_id',
      placement: 'before',
    });
    expect(reordered.outcome).toBe('applied');
    if (reordered.outcome !== 'applied') throw new Error('Expected structured reorder');
    const reorderedDocument = readDvtTransformAuthoringAuthority(
      reordered.draftSession.localNodeCatalog![model.id]!
    )!.semanticDocument;
    const reorderedFields = inspectDvtSubstraitStructuredFieldDraft(
      decodeDvtSubstraitProjectionDocument(reorderedDocument)
    );
    expect(reorderedFields.ok && reorderedFields.fields.map((field) => field.fieldId)).toEqual([
      'output:identity',
      'output:order_id',
      'output:customer',
      'output:amount',
    ]);
    const removed = setCanvasColumnOutputIncluded({
      ...fixture,
      draftSession: reordered.draftSession,
      targetNodeId: model.id,
      columnId: 'output:identity',
      output: false,
    });
    expect(removed.outcome).toBe('applied');
    if (removed.outcome !== 'applied') throw new Error('Expected structured removal');
    const document = readDvtTransformAuthoringAuthority(
      removed.draftSession.localNodeCatalog![model.id]!
    )!.semanticDocument;
    const fields = inspectDvtSubstraitStructuredFieldDraft(
      decodeDvtSubstraitProjectionDocument(document)
    );
    expect(fields.ok && fields.fields.map((field) => field.fieldId)).toEqual([
      'output:order_id',
      'output:customer',
      'output:amount',
    ]);
  });
});
