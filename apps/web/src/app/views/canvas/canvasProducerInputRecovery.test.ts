/**
 * Owned concern: prove classified retained reads reuse admitted publications and never hide rejection.
 * @baseline ADR-0064 / GH-3628: missing required fields cannot disappear through normal refresh.
 * @decision Exercise mixed-type rejection, unchanged authority and catalog identity/call boundaries.
 * @consequence Healthy updates stay on their existing rail while repair-only inspection remains explicit.
 * @version 1.1.0
 */
import { describe, expect, it, vi } from 'vitest';
import { createProducerInput, deriveSubstraitPublication } from '@dvt/substrait-analysis';
import * as substraitAnalysis from '@dvt/substrait-analysis';
import * as graphBindings from './canvasSubstraitGraphBindings';
import { create } from '@bufbuild/protobuf';
import {
  TypeSchema,
  Type_Nullability,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import {
  createModelOutputDependencyFixture,
  selectModelDependencyOutputs,
  modelDependencyDocument,
  createIncompatibleRetainedModelFixture,
} from './canvasModelOutputDependency.test-support';
import { readCanvasProducerInputRecovery } from './canvasProducerInputRecovery';
import { resolveCanvasProducerDocument } from './canvasProducerDocument';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { resolveCanvasSubstraitGraphBindings } from './canvasSubstraitGraphBindings';
import { readCanvasDvtCompositionInputCatalog } from './canvasDvtCompositionInputCatalog';
import { composeDvtSubstraitProjectionFields } from './canvasDvtSubstraitStructuredFieldMutation';
import { createSourceDocument } from './canvasSourceDocument';

describe('retained producer input inspection', () => {
  it('rejects a required missing publication combined with an incompatible present type', async () => {
    const graph = await createIncompatibleRetainedModelFixture();
    const args = { node: graph.consumer, nodes: graph.nodes, edges: graph.edges };
    expect(() =>
      resolveCanvasSubstraitGraphBindings({ ...args, node: graph.producer })
    ).not.toThrow();
    const before = structuredClone(args);
    expect(readCanvasProducerInputRecovery(args)).toEqual({
      kind: 'rejected',
      failure: 'invalid-semantic-authority',
    });
    expect(args).toEqual(before);
  });
  it('keeps the saved consumer plan and identities while denying removed producer fields', async () => {
    const graph = await createModelOutputDependencyFixture();
    const producer = await selectModelDependencyOutputs(graph.producer, ['customer']);
    const nodes = graph.nodes.map((node) => (node.id === producer.id ? producer : node));
    const args = { node: graph.consumer, nodes, edges: graph.edges };
    const before = structuredClone(args);
    expect(() => resolveCanvasProducerDocument(args.node, nodes)).toThrow();
    const recovery = readCanvasProducerInputRecovery(args);
    expect(recovery.kind).toBe('retained');
    if (recovery.kind !== 'retained') throw new Error('Expected retained inspection');
    expect(recovery.document).toEqual(graph.consumerDocument);
    expect(recovery.denied.size).toBeGreaterThan(0);
    expect(recovery.missing.every((field) => field.producerNodeId === producer.id)).toBe(true);
    const publication = deriveSubstraitPublication(recovery.document, recovery.denied);
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
    ).toEqual({ kind: 'not-needed' });
  });

  it('lets the strict resolver rebase a genuinely unused removed field', async () => {
    const graph = await createModelOutputDependencyFixture();
    const consumer = await selectModelDependencyOutputs(graph.consumer, ['customer', 'country']);
    const producer = await selectModelDependencyOutputs(graph.producer, ['order_id', 'customer']);
    const nodes = graph.nodes.map((node) =>
      node.id === producer.id ? producer : node.id === consumer.id ? consumer : node
    );
    expect(readCanvasProducerInputRecovery({ node: consumer, nodes, edges: graph.edges })).toEqual({
      kind: 'not-needed',
    });
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
    expect(readCanvasProducerInputRecovery({ node: consumer, nodes, edges: graph.edges })).toEqual({
      kind: 'rejected',
      failure: 'invalid-semantic-authority',
    });
  });

  it('rejects a producer whose current physical schema is incompatible with its document', async () => {
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
    ).toEqual({ kind: 'rejected', failure: 'input-identity-unavailable' });
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
    ).toEqual({ kind: 'rejected', failure: 'input-identity-unavailable' });
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
    ).toEqual({ kind: 'rejected', failure: 'input-identity-unavailable' });
    expect(
      readCanvasProducerInputRecovery({
        node: graph.consumer,
        nodes,
        edges: graph.edges.filter((edge) => edge.sourceId !== producer.id),
      })
    ).toEqual({ kind: 'rejected', failure: 'input-identity-unavailable' });
    expect(
      readCanvasProducerInputRecovery({
        node: graph.consumer,
        nodes,
        edges: graph.edges.filter((edge) => edge.sourceId !== graph.source.id),
      })
    ).toEqual({ kind: 'rejected', failure: 'input-identity-unavailable' });
  });

  it('reuses the catalog publication without producer resolution or healthy consumer schema work', async () => {
    const graph = await createModelOutputDependencyFixture();
    const args = { node: graph.consumer, nodes: graph.nodes, edges: graph.edges };
    const resolve = vi.spyOn(graphBindings, 'resolveCanvasSubstraitGraphBindings');
    try {
      const catalog = readCanvasDvtCompositionInputCatalog({
        ...args,
        targetNodeId: graph.consumer.id,
      });
      expect(resolve).toHaveBeenCalledTimes(1);
      const publication = catalog.publicationsByProducerId.get(graph.producer.id)!;
      expect(
        catalog.inputs.find((input) => input.nodeId === graph.producer.id)!.producer!.document
      ).toBe(publication.document);
      const derive = vi.spyOn(substraitAnalysis, 'deriveSubstraitSchemas');
      try {
        expect(readCanvasProducerInputRecovery(args, catalog)).toEqual({ kind: 'not-needed' });
        expect(resolve).toHaveBeenCalledTimes(1);
        expect(derive).not.toHaveBeenCalled();
      } finally {
        derive.mockRestore();
      }
    } finally {
      resolve.mockRestore();
    }
  });

  it('retains valid publication before filtering an explicit stale edge and classifies from that same catalog', async () => {
    const graph = await createModelOutputDependencyFixture();
    const producer = await selectModelDependencyOutputs(graph.producer, ['order_id', 'customer']);
    const producerRoot = graph.producerDocument.sidecar.relations.at(-1)!.relationId;
    const removed = graph.producerDocument.sidecar.fields.find(
      (field) => field.relationId === producerRoot && field.displayName === 'amount'
    )!.fieldId;
    const nodes = graph.nodes.map((node) => (node.id === producer.id ? producer : node));
    const edges = graph.edges.map((edge) =>
      edge.sourceId === producer.id && edge.targetId === graph.consumer.id
        ? {
            ...edge,
            inputBindings: {
              version: 'v1' as const,
              fields: [{ inputId: 'retained-amount-slot', producerFieldId: removed }],
            },
          }
        : edge
    );
    const args = { node: graph.consumer, nodes, edges };
    const resolve = vi.spyOn(graphBindings, 'resolveCanvasSubstraitGraphBindings');
    try {
      const catalog = readCanvasDvtCompositionInputCatalog({
        ...args,
        targetNodeId: graph.consumer.id,
      });
      expect(catalog.inputs.some((input) => input.nodeId === producer.id)).toBe(false);
      const publication = catalog.publicationsByProducerId.get(producer.id)!;
      expect(publication.document).toEqual(modelDependencyDocument(producer));
      expect(publication.publishedFieldIds.has(removed)).toBe(false);
      expect(resolve).toHaveBeenCalledTimes(1);
      const recovery = readCanvasProducerInputRecovery(args, catalog);
      expect(recovery.kind).toBe('retained');
      expect(resolve).toHaveBeenCalledTimes(1);
      if (recovery.kind !== 'retained') throw new Error('Expected retained inspection');
      expect(recovery.missing).toContainEqual(
        expect.objectContaining({ producerFieldId: removed, producerNodeId: producer.id })
      );
    } finally {
      resolve.mockRestore();
    }
  });

  it('rejects a required missing publication omitted from the explicit Input slots', async () => {
    const graph = await createModelOutputDependencyFixture();
    const producer = await selectModelDependencyOutputs(graph.producer, ['order_id', 'customer']);
    const publication = modelDependencyDocument(producer);
    const rootId = publication.sidecar.relations.at(-1)!.relationId;
    const bindings = publication.sidecar.fields
      .filter((field) => field.relationId === rootId && field.parentFieldId == null)
      .map((field) => ({ inputId: `existing:${field.fieldId}`, producerFieldId: field.fieldId }));
    const nodes = graph.nodes.map((node) => (node.id === producer.id ? producer : node));
    const edges = graph.edges.map((edge) =>
      edge.sourceId === producer.id && edge.targetId === graph.consumer.id
        ? { ...edge, inputBindings: { version: 'v1' as const, fields: bindings } }
        : edge
    );
    const args = { node: graph.consumer, nodes, edges };
    const before = structuredClone(args);
    expect(readCanvasProducerInputRecovery(args)).toEqual({
      kind: 'rejected',
      failure: 'input-identity-unavailable',
    });
    expect(args).toEqual(before);
  });

  it('retains a represented required slot when another omitted missing field is unused', async () => {
    const graph = await createModelOutputDependencyFixture();
    const consumer = await selectModelDependencyOutputs(graph.consumer, ['customer', 'country']);
    const producer = await selectModelDependencyOutputs(graph.producer, ['customer']);
    const producerRoot = graph.producerDocument.sidecar.relations.at(-1)!.relationId;
    const bindings = graph.producerDocument.sidecar.fields
      .filter(
        (field) =>
          field.relationId === producerRoot &&
          ['order_id', 'customer'].includes(field.displayName ?? '')
      )
      .map((field) => ({ inputId: `existing:${field.fieldId}`, producerFieldId: field.fieldId }));
    const nodes = graph.nodes.map((node) =>
      node.id === producer.id ? producer : node.id === consumer.id ? consumer : node
    );
    const edges = graph.edges.map((edge) =>
      edge.sourceId === producer.id && edge.targetId === consumer.id
        ? { ...edge, inputBindings: { version: 'v1' as const, fields: bindings } }
        : edge
    );
    const recovery = readCanvasProducerInputRecovery({ node: consumer, nodes, edges });
    expect(recovery.kind).toBe('retained');
    if (recovery.kind !== 'retained') throw new Error('Expected retained inspection');
    expect(recovery.missing.map((field) => field.name).sort()).toEqual(['amount', 'order_id']);
    expect(recovery.document).toEqual(modelDependencyDocument(consumer));
  });

  it.each(['child-only', 'complete-tree'] as const)(
    'classifies missing %s identities by their existing root repair slot',
    async (scenario) => {
      const graph = await createModelOutputDependencyFixture();
      const original = modelDependencyDocument(graph.producer);
      const rootId = original.sidecar.relations.at(-1)!.relationId;
      const roots = original.sidecar.fields.filter((field) => field.relationId === rootId);
      const nested = composeDvtSubstraitProjectionFields(original, {
        draggedFieldId: roots.find((field) => field.displayName === 'customer')!.fieldId,
        targetFieldId: roots.find((field) => field.displayName === 'order_id')!.fieldId,
        parentFieldId: 'published:identity',
        parentName: 'identity',
      });
      const input = createProducerInput(
        { nodeId: graph.producer.id, name: graph.producer.name, document: nested },
        1
      );
      const consumer = applyDvtSubstraitSemanticDocument(
        graph.consumer,
        encodeDvtSubstraitSemanticDocument(createSourceDocument([input], input))
      );
      const changed = structuredClone(nested);
      const child = changed.sidecar.fields.find(
        (field) => field.parentFieldId === 'published:identity'
      )!;
      expect(child, 'real published nested child').toBeDefined();
      child.fieldId = `${child.fieldId}:replacement`;
      if (scenario === 'complete-tree') {
        changed.sidecar.fields = changed.sidecar.fields.map((field) =>
          field.fieldId === 'published:identity'
            ? { ...field, fieldId: 'replacement:identity' }
            : field.parentFieldId === 'published:identity'
              ? {
                  ...field,
                  fieldId: `${field.fieldId}:replacement`,
                  parentFieldId: 'replacement:identity',
                }
              : field
        );
      }
      const producer = applyDvtSubstraitSemanticDocument(
        graph.producer,
        encodeDvtSubstraitSemanticDocument(changed)
      );
      const nodes = [graph.source, producer, consumer];
      const edges = graph.edges.filter(
        (edge) => edge.targetId === producer.id || edge.sourceId === producer.id
      );
      const args = { node: consumer, nodes, edges };
      expect(() => resolveCanvasSubstraitGraphBindings({ ...args, node: producer })).not.toThrow();
      const before = structuredClone(args);
      const recovery = readCanvasProducerInputRecovery(args);
      if (scenario === 'child-only') {
        expect(recovery).toEqual({ kind: 'rejected', failure: 'input-identity-unavailable' });
      } else {
        expect(recovery.kind).toBe('retained');
        if (recovery.kind !== 'retained') throw new Error('Expected retained root repair');
        expect(recovery.document).toEqual(modelDependencyDocument(consumer));
      }
      expect(args).toEqual(before);
    }
  );

  it('keeps normal type refresh when a removed field is genuinely unused by the retained consumer', async () => {
    const graph = await createIncompatibleRetainedModelFixture();
    const consumer = await selectModelDependencyOutputs(graph.consumer, ['customer', 'country']);
    const nodes = graph.nodes.map((node) => (node.id === consumer.id ? consumer : node));
    const args = { node: consumer, nodes, edges: graph.edges };
    expect(readCanvasProducerInputRecovery(args)).toEqual({ kind: 'not-needed' });
    expect(() => resolveCanvasProducerDocument(consumer, nodes)).not.toThrow();
  });
});
