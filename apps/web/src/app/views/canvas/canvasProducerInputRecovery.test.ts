/** Owned concern: prove bounded structural recovery never grants executable producer resolution. */
import { describe, expect, it } from 'vitest';
import { deriveSubstraitPublication } from '@dvt/substrait-analysis';
import { create } from '@bufbuild/protobuf';
import {
  TypeSchema,
  Type_Nullability,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import {
  createModelOutputDependencyFixture,
  selectModelDependencyOutputs,
  modelDependencyDocument,
} from './canvasModelOutputDependency.test-support';
import { readCanvasProducerInputRecovery } from './canvasProducerInputRecovery';
import { resolveCanvasProducerDocument } from './canvasProducerDocument';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';

describe('retained producer input inspection', () => {
  it('keeps the saved consumer plan and identities while denying removed producer fields', async () => {
    const graph = await createModelOutputDependencyFixture();
    const producer = await selectModelDependencyOutputs(graph.producer, ['customer']);
    const nodes = graph.nodes.map((node) => (node.id === producer.id ? producer : node));
    const args = { node: graph.consumer, nodes, edges: graph.edges };
    const before = structuredClone(args);
    expect(() => resolveCanvasProducerDocument(args.node, nodes)).toThrow();
    const recovery = readCanvasProducerInputRecovery(args);
    expect(recovery).not.toBeNull();
    expect(recovery!.document).toEqual(graph.consumerDocument);
    expect(recovery!.denied.size).toBeGreaterThan(0);
    expect(recovery!.missing.every((field) => field.producerNodeId === producer.id)).toBe(true);
    const publication = deriveSubstraitPublication(recovery!.document, recovery!.denied);
    expect([...publication.values()].some((relation) => relation.rowUnavailable)).toBe(true);
    expect(args).toEqual(before);
  });

  it('does not reclassify a valid consumer as incomplete', async () => {
    const graph = await createModelOutputDependencyFixture();
    expect(
      readCanvasProducerInputRecovery({
        node: graph.consumer,
        nodes: graph.nodes,
        edges: graph.edges,
      })
    ).toBeNull();
  });

  it('lets the strict resolver rebase a genuinely unused removed field', async () => {
    const graph = await createModelOutputDependencyFixture();
    const consumer = await selectModelDependencyOutputs(graph.consumer, ['customer', 'country']);
    const producer = await selectModelDependencyOutputs(graph.producer, ['order_id', 'customer']);
    const nodes = graph.nodes.map((node) =>
      node.id === producer.id ? producer : node.id === consumer.id ? consumer : node
    );
    expect(
      readCanvasProducerInputRecovery({ node: consumer, nodes, edges: graph.edges })
    ).toBeNull();
    expect(() => resolveCanvasProducerDocument(consumer, nodes)).not.toThrow();
  });

  it('refuses malformed retained authority rather than masking it as missing publications', async () => {
    const graph = await createModelOutputDependencyFixture();
    const producer = await selectModelDependencyOutputs(graph.producer, ['customer']);
    const consumer = structuredClone(graph.consumer);
    const document = modelDependencyDocument(consumer);
    document.sidecar.relations[0]!.relAnchor = 9999;
    const authority = consumer.metadata!.transformAuthoring as {
      semanticDocument: { sidecar: unknown };
    };
    authority.semanticDocument.sidecar = document.sidecar;
    const nodes = graph.nodes.map((node) =>
      node.id === producer.id ? producer : node.id === consumer.id ? consumer : node
    );
    expect(
      readCanvasProducerInputRecovery({ node: consumer, nodes, edges: graph.edges })
    ).toBeNull();
  });

  it('does not admit inspection when a still-published field also has an incompatible type', async () => {
    const graph = await createModelOutputDependencyFixture();
    const narrowed = await selectModelDependencyOutputs(graph.producer, ['customer']);
    const document = modelDependencyDocument(narrowed);
    const root = document.plan.relations[0]!.relType;
    if (
      root.case !== 'root' ||
      root.value.input?.relType.case !== 'project' ||
      root.value.input.relType.value.input?.relType.case !== 'read'
    )
      throw new Error('Expected real projection fixture');
    root.value.input.relType.value.input.relType.value.baseSchema!.struct!.types[1] = create(
      TypeSchema,
      { kind: { case: 'i64', value: { nullability: Type_Nullability.NULLABLE } } }
    );
    const producer = applyDvtSubstraitSemanticDocument(
      narrowed,
      encodeDvtSubstraitSemanticDocument(document)
    );
    const nodes = graph.nodes.map((node) => (node.id === producer.id ? producer : node));
    expect(
      readCanvasProducerInputRecovery({ node: graph.consumer, nodes, edges: graph.edges })
    ).toBeNull();
  });

  it('never turns a cyclic producer closure into a retained inspection success', async () => {
    const graph = await createModelOutputDependencyFixture();
    const document = modelDependencyDocument(graph.producer);
    const read = document.sidecar.relations.find((relation) => relation.sourceRef != null)!;
    delete read.sourceRef;
    read.producerRef = {
      nodeId: graph.consumer.id,
      fields: document.sidecar.fields
        .filter((field) => field.relationId === read.relationId)
        .map((field, ordinal) => ({
          fieldId: field.fieldId,
          producerFieldId: graph.consumerDocument.sidecar.fields.filter(
            (field) =>
              field.relationId === graph.consumerDocument.sidecar.relations.at(-1)!.relationId
          )[ordinal]!.fieldId,
        })),
    };
    const producer = applyDvtSubstraitSemanticDocument(
      graph.producer,
      encodeDvtSubstraitSemanticDocument(document)
    );
    const nodes = graph.nodes.map((node) => (node.id === producer.id ? producer : node));
    expect(() => resolveCanvasProducerDocument(graph.consumer, nodes)).toThrow();
    expect(
      readCanvasProducerInputRecovery({ node: graph.consumer, nodes, edges: graph.edges })
    ).toBeNull();
  });

  it('does not recover a foreign or disconnected producer from a retained document', async () => {
    const graph = await createModelOutputDependencyFixture();
    const producer = await selectModelDependencyOutputs(graph.producer, ['customer']);
    const nodes = graph.nodes.map((node) => (node.id === producer.id ? producer : node));
    expect(
      readCanvasProducerInputRecovery({
        node: graph.consumer,
        nodes: nodes.filter((node) => node.id !== producer.id),
        edges: graph.edges,
      })
    ).toBeNull();
    expect(
      readCanvasProducerInputRecovery({
        node: graph.consumer,
        nodes,
        edges: graph.edges.filter((edge) => edge.sourceId !== producer.id),
      })
    ).toBeNull();
    expect(
      readCanvasProducerInputRecovery({
        node: graph.consumer,
        nodes,
        edges: graph.edges.filter((edge) => edge.sourceId !== graph.source.id),
      })
    ).toBeNull();
  });
});
