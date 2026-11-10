import { readWorkspaceDbtModelReference } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { DvtTransformSelection } from '../../../src/application/services/dvtProtectedTransformSelection.js';
import { selectCanvasTransformProducerDependencies } from '../../../src/application/services/selectCanvasTransformProducerDependencies.js';
import { buildDbtInputPreviewFixture } from '../../fixtures/dvtDbtInputPreviewFixture.js';
import { consumerNode } from '../../fixtures/dvtProducerPreviewFixture.js';

function selection(): Readonly<{
  fixture: ReturnType<typeof buildDbtInputPreviewFixture>;
  input: DvtTransformSelection;
}> {
  const fixture = buildDbtInputPreviewFixture();
  return {
    fixture,
    input: {
      draft: fixture.draft,
      selectedNodeIds: fixture.draft.nodeIds,
      selectedEdgeIds: fixture.draft.edges.map((edge) => edge.id),
      previewTargetId: fixture.targetId,
    },
  };
}

describe('protected semantic producer dependencies', () => {
  it('retains a consumed mixed producer without changing its protected authority', () => {
    const { fixture, input } = selection();
    const before = JSON.stringify(input.draft);
    const selected = selectCanvasTransformProducerDependencies(input);
    expect([...selected.externalNodeIds]).toEqual([...fixture.externalProducers.keys()]);
    expect(selected.transformNodeIds.has(fixture.targetId)).toBe(true);
    expect(JSON.stringify(input.draft)).toBe(before);
  });

  it('selects only a physical relation and leaves the original full-plan digest intact', () => {
    const { fixture, input } = selection();
    const before = JSON.stringify(input.draft);
    const selected = selectCanvasTransformProducerDependencies(input, fixture.physicalRelationId);
    expect(selected.externalNodeIds.size).toBe(0);
    expect(
      selected.documents
        .get(fixture.targetId)!
        .sidecar.relations.map((relation) => relation.relationId)
    ).toEqual([fixture.physicalRelationId]);
    expect(selected.documents.get(fixture.targetId)!.sidecar.semanticPlanSha256).not.toBe(
      fixture.semanticPlanSha256
    );
    expect(JSON.stringify(input.draft)).toBe(before);
  });

  it('retains an external leaf reached through a native producer', () => {
    const { fixture, input } = selection();
    const native = fixture.draft.nodes.find((node) => node.id === fixture.targetId)!;
    const consumer = consumerNode(native, 'native-consumer');
    const draft = {
      ...input.draft,
      nodes: [...input.draft.nodes, consumer],
      nodeIds: [...input.draft.nodeIds, consumer.id],
      nodePositions: { ...input.draft.nodePositions, [consumer.id]: { x: 600, y: 0 } },
      edges: [
        ...input.draft.edges,
        {
          id: 'native-consumer',
          sourceId: native.id,
          targetId: consumer.id,
          relation: 'lineage' as const,
        },
      ],
    };
    const selected = selectCanvasTransformProducerDependencies({
      draft,
      selectedNodeIds: draft.nodeIds,
      selectedEdgeIds: draft.edges.map((edge) => edge.id),
      previewTargetId: consumer.id,
    });
    expect([...selected.externalNodeIds]).toEqual([...fixture.externalProducers.keys()]);
    expect([...selected.documents.keys()]).toEqual([native.id, consumer.id]);
  });

  it('includes a selected external target without inventing a native document', () => {
    const { input } = selection();
    const target = input.draft.nodes.find((node) => readWorkspaceDbtModelReference(node) != null)!;
    const selected = selectCanvasTransformProducerDependencies({
      ...input,
      selectedNodeIds: [target.id],
      selectedEdgeIds: [],
      previewTargetId: target.id,
    });
    expect([...selected.externalNodeIds]).toEqual([target.id]);
    expect(selected.documents.size).toBe(0);
  });

  it('rejects a consumed producer without its authorized direct edge', () => {
    const { fixture, input } = selection();
    const externalId = [...fixture.externalProducers.keys()][0]!;
    input.draft.edges = input.draft.edges.filter((edge) => edge.sourceId !== externalId);
    expect(() =>
      selectCanvasTransformProducerDependencies({
        ...input,
        selectedEdgeIds: input.draft.edges.map((edge) => edge.id),
      })
    ).toThrow('authorized direct dependency');
  });

  it('rejects an invalid unused edge in the complete selection before narrowing it', () => {
    const { fixture, input } = selection();
    const externalId = [...fixture.externalProducers.keys()][0]!;
    const physical = input.draft.nodes.find((node) => node.role === 'input')!;
    input.draft.edges.push({
      id: 'invalid-unused',
      sourceId: externalId,
      targetId: physical.id,
      relation: 'lineage',
    });
    expect(() =>
      selectCanvasTransformProducerDependencies(
        {
          ...input,
          selectedEdgeIds: input.draft.edges.map((edge) => edge.id),
        },
        fixture.physicalRelationId
      )
    ).toThrow('every effective producer dependency');
  });
});
