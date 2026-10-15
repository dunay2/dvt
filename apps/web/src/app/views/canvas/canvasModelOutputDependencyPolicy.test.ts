/** Owned concern: prove atomic cross-model publication admission on real canonical documents. */
import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { modelOutputDependencyRejection } from './canvasModelOutputDependencyPolicy';
import {
  createModelOutputDependencyFixture,
  selectModelDependencyOutputs,
} from './canvasModelOutputDependency.test-support';
import { resolveCanvasProducerDocument } from './canvasProducerDocument';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { composeDvtSubstraitProjectionFields } from './canvasDvtSubstraitStructuredFieldMutation';
import { decodeDvtSubstraitProjectionDocument } from './canvasDvtSubstraitProjection';
import { encodeDvtSubstraitStructuredFieldDocument } from './canvasDvtSubstraitStructuredField';
import { applyCanvasStructuredField } from './canvasStructuredFieldAuthoring';

type Fixture = Awaited<ReturnType<typeof createModelOutputDependencyFixture>>;
function rejection(
  fixture: Fixture,
  candidate: Fixture['producer']
): ReturnType<typeof modelOutputDependencyRejection> {
  return modelOutputDependencyRejection({
    node: fixture.producer,
    candidate,
    nodes: fixture.nodes,
    edges: fixture.edges,
  });
}

describe('Model output dependency policy', () => {
  it.each(['order_id', 'customer', 'amount'])(
    'rejects required %s with stable field and consumer identity',
    async (removed) => {
      const fixture = await createModelOutputDependencyFixture();
      const candidate = await selectModelDependencyOutputs(
        fixture.producer,
        ['order_id', 'customer', 'amount'].filter((name) => name !== removed)
      );
      const before = JSON.stringify(fixture.nodes);
      expect(rejection(fixture, candidate)).toEqual({
        outcome: 'rejected',
        reason: 'model_output_required',
        consumer: { nodeId: fixture.consumer.id, name: 'Model 2' },
        fields: [{ fieldId: `output:${removed}`, name: removed }],
      });
      expect(JSON.stringify(fixture.nodes)).toBe(before);
    }
  );

  it('reproduces strict invalid_binding when an authored JOIN operand is removed', async () => {
    const fixture = await createModelOutputDependencyFixture();
    const candidate = await selectModelDependencyOutputs(fixture.producer, ['customer']);
    expect(() =>
      resolveCanvasProducerDocument(
        fixture.consumer,
        fixture.nodes.map((node) => (node.id === candidate.id ? candidate : node))
      )
    ).toThrow('A consumer still uses a field removed from its input.');
  });

  it('allows unused removal without pruning the consumer publication', async () => {
    const fixture = await createModelOutputDependencyFixture();
    fixture.consumer = await selectModelDependencyOutputs(fixture.consumer, [
      'customer',
      'country',
    ]);
    fixture.nodes = fixture.nodes.map((node) =>
      node.id === fixture.consumer.id ? fixture.consumer : node
    );
    const candidate = await selectModelDependencyOutputs(fixture.producer, [
      'order_id',
      'customer',
    ]);
    expect(rejection(fixture, candidate)).toBeNull();
    const resolved = resolveCanvasProducerDocument(
      fixture.consumer,
      fixture.nodes.map((node) => (node.id === candidate.id ? candidate : node))
    )!;
    expect(resolved.plan.relations[0]!.relType.case).toBe('root');
    const indexed = deriveSubstraitSchemas(resolved).index;
    expect(indexed.relations.get(indexed.rootId)!.fields.map((field) => field.displayName)).toEqual(
      ['customer', 'country']
    );
  });

  it('permits alias, reorder and common metadata edits without identity-based false positives', async () => {
    const fixture = await createModelOutputDependencyFixture();
    const reordered = await selectModelDependencyOutputs(
      fixture.producer,
      ['amount', 'customer', 'order_id'],
      { amount: 'total' }
    );
    expect(rejection(fixture, reordered)).toBeNull();
    expect(rejection(fixture, { ...fixture.producer, name: 'Renamed' })).toBeNull();
    expect(
      resolveCanvasProducerDocument(
        fixture.consumer,
        fixture.nodes.map((node) => (node.id === reordered.id ? reordered : node))
      )
    ).toBeDefined();
  });

  it('permits additive restoration of the original stable fields in a broken graph', async () => {
    const fixture = await createModelOutputDependencyFixture();
    const reduced = await selectModelDependencyOutputs(fixture.producer, ['customer']);
    expect(
      modelOutputDependencyRejection({
        node: reduced,
        candidate: fixture.producer,
        nodes: fixture.nodes,
        edges: fixture.edges,
      })
    ).toBeNull();
    expect(resolveCanvasProducerDocument(fixture.consumer, fixture.nodes)).toBeDefined();
  });

  it('does not protect a deliberately disconnected consumer as an active computation', async () => {
    const fixture = await createModelOutputDependencyFixture();
    const candidate = await selectModelDependencyOutputs(fixture.producer, ['customer']);
    fixture.edges = fixture.edges.filter((edge) => edge.sourceId !== fixture.producer.id);
    expect(rejection(fixture, candidate)).toBeNull();
  });

  it('fails closed when a connected consumer document cannot be verified', async () => {
    const fixture = await createModelOutputDependencyFixture();
    const invalid = structuredClone(fixture.consumerDocument);
    invalid.sidecar.fields[0]!.relationId = 'missing-relation';
    const authority = readDvtTransformAuthoringAuthority(fixture.consumer)!;
    const consumer = {
      ...fixture.consumer,
      metadata: {
        ...fixture.consumer.metadata,
        transformAuthoring: {
          ...authority,
          semanticDocument: { ...authority.semanticDocument, sidecar: invalid.sidecar },
        },
      },
    };
    fixture.nodes = fixture.nodes.map((node) => (node.id === consumer.id ? consumer : node));
    expect(
      rejection(fixture, await selectModelDependencyOutputs(fixture.producer, ['customer']))
    ).toEqual({ outcome: 'rejected', reason: 'model_output_dependency_unavailable' });
  });

  it('protects a hidden authored calculated definition even when excluded from Output', async () => {
    const fixture = await createModelOutputDependencyFixture();
    const session = new CanvasRelationAnalysisSession(fixture.consumer.id);
    try {
      session.receive(fixture.consumerDocument);
      const root = await session.query(null);
      const amount = root.bindings.find((field) => field.displayName === 'amount')!;
      const calculated = await applySelectedRelationDerivedOutput(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        intent: 'insert',
        alias: 'retained_amount',
        expression: { kind: 'field-ref', inputFieldId: amount.fieldId },
      });
      const model = applyDvtSubstraitSemanticDocument(
        fixture.consumer,
        encodeDvtSubstraitSemanticDocument(calculated)
      );
      fixture.consumer = await selectModelDependencyOutputs(model, ['customer', 'country']);
      fixture.nodes = fixture.nodes.map((node) =>
        node.id === fixture.consumer.id ? fixture.consumer : node
      );
      expect(
        rejection(
          fixture,
          await selectModelDependencyOutputs(fixture.producer, ['order_id', 'customer'])
        )
      ).toMatchObject({ reason: 'model_output_required', fields: [{ name: 'amount' }] });
    } finally {
      session.dispose();
    }
  });

  it('permits additive structs while retaining the published root field identities', async () => {
    const fixture = await createModelOutputDependencyFixture();
    const draft = decodeDvtSubstraitProjectionDocument(
      encodeDvtSubstraitSemanticDocument(fixture.producerDocument)
    );
    const structured = composeDvtSubstraitProjectionFields(draft, {
      draggedFieldId: 'output:customer',
      targetFieldId: 'output:amount',
      parentFieldId: 'identity',
      parentName: 'identity',
    });
    const candidate = applyDvtSubstraitSemanticDocument(
      fixture.producer,
      encodeDvtSubstraitStructuredFieldDocument(structured)
    );
    expect(rejection(fixture, candidate)).toBeNull();
    expect(
      applyCanvasStructuredField({
        ...fixture,
        request: {
          nodeId: fixture.producer.id,
          draggedFieldId: 'output:customer',
          targetFieldId: 'output:amount',
          parentName: 'identity',
        },
      })
    ).toMatchObject({ outcome: 'applied' });
  });
});
