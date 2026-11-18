/** Prove independent native definitions preserve meaning and real input provenance. */
import { describe, expect, it } from 'vitest';
import { createModelOutputDependencyFixture } from './canvasModelOutputDependency.test-support';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { prepareCanvasModelWorkingCopy } from './canvasModelWorkingCopy';

describe('Model working copy', () => {
  it('copies a composed Model with new local identities and the same external producers', async () => {
    const graph = await createModelOutputDependencyFixture();
    const original = {
      ...graph.consumer,
      status: 'success' as const,
      lastDuration: 75,
      metadata: {
        ...graph.consumer.metadata,
        config: { materialized: 'table' },
        resultTarget: { table: 'original' },
      },
    };
    const before = structuredClone(original);
    const copy = prepareCanvasModelWorkingCopy({
      sourceId: original.id,
      nodes: [...graph.nodes.filter((n) => n.id !== original.id), original],
      edges: graph.edges,
    });
    const source = readDvtTransformAuthoringAuthority(original)!.semanticDocument;
    const document = readDvtTransformAuthoringAuthority(copy.node)!.semanticDocument;
    expect(copy.node.id).not.toBe(original.id);
    expect(copy.node.definitionId).toBeUndefined();
    expect(copy.node.sourceDefinitionId).toBeUndefined();
    expect(copy.node.status).toBe('idle');
    expect(copy.node.lastDuration).toBeUndefined();
    expect(copy.node.metadata?.config).toBeUndefined();
    expect(copy.node.metadata?.resultTarget).toBeUndefined();
    expect(document.semanticPlan).toEqual(source.semanticPlan);
    const fields = new Set(document.sidecar.fields.map((field) => field.fieldId));
    expect(source.sidecar.fields.some((field) => fields.has(field.fieldId))).toBe(false);
    for (const [index, relation] of source.sidecar.relations.entries()) {
      const copied = document.sidecar.relations[index]!;
      expect(copied.relationId).not.toBe(relation.relationId);
      expect(copied.producerRef?.nodeId).toBe(relation.producerRef?.nodeId);
      for (const mapping of copied.producerRef?.fields ?? [])
        expect(fields.has(mapping.fieldId)).toBe(true);
      expect(copied.producerRef?.fields.map((field) => field.producerFieldId)).toEqual(
        relation.producerRef?.fields.map((field) => field.producerFieldId)
      );
    }
    expect(copy.edges.map((edge) => edge.sourceId)).toEqual(
      graph.edges.filter((edge) => edge.targetId === original.id).map((edge) => edge.sourceId)
    );
    expect(copy.edges.every((edge) => edge.targetId === copy.node.id)).toBe(true);
    expect(original).toEqual(before);
  });

  it('rejects a file-backed definition instead of retaining its file authority', async () => {
    const graph = await createModelOutputDependencyFixture();
    const source = { ...graph.producer, path: 'models/original.sql' };
    expect(() =>
      prepareCanvasModelWorkingCopy({ sourceId: source.id, nodes: [source], edges: [] })
    ).toThrow();
  });

  it('preserves the shared physical connection while creating a separate Source Model', async () => {
    const graph = await createModelOutputDependencyFixture();
    const copy = prepareCanvasModelWorkingCopy({
      sourceId: graph.source.id,
      nodes: graph.nodes,
      edges: graph.edges,
    });
    expect(copy.node.id).not.toBe(graph.source.id);
    expect(copy.node.kind).toBe(graph.source.kind);
    expect(copy.node.metadata?.connectedSourceRef).toEqual(
      graph.source.metadata?.connectedSourceRef
    );
    expect(copy.node.metadata?.columns).toEqual(graph.source.metadata?.columns);
  });

  it('rejects structural non-execution edges before offering an unrepresentable copy', async () => {
    const graph = await createModelOutputDependencyFixture();
    const edges = graph.edges.map((edge) =>
      edge.targetId === graph.producer.id
        ? { ...edge, metadata: { executionDependency: false } }
        : edge
    );
    expect(() =>
      prepareCanvasModelWorkingCopy({ sourceId: graph.producer.id, nodes: graph.nodes, edges })
    ).toThrow('lossless');
  });

  it('preserves the independent closed execution gate', async () => {
    const graph = await createModelOutputDependencyFixture();
    const edges = graph.edges.map((edge) =>
      edge.targetId === graph.producer.id
        ? { ...edge, metadata: { executionGate: 'closed' } }
        : edge
    );
    const copy = prepareCanvasModelWorkingCopy({
      sourceId: graph.producer.id,
      nodes: graph.nodes,
      edges,
    });
    expect(copy.edges[0]?.metadata?.executionGate).toBe('closed');
  });
});
