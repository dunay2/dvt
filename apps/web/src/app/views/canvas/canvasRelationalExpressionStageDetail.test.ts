import { describe, expect, it } from 'vitest';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { buildCanvasRelationalTreeRelation } from './canvasRelationalTreeRelationProjection';

import {
  projectExpressionStage,
  withScalarOutput,
  withWindowOutput,
  withoutLastOutput,
  withPublicExpressionStage,
} from './canvasRelationalExpressionStage.test-support';
import { projectCanvasRelationalTreeDetails } from './canvasRelationalTreeDetails';
import { graphModel } from './canvasRelationGraph.test-support';

describe('Canvas Expression stage card detail', () => {
  it.each([withScalarOutput, withWindowOutput])(
    'shows the internal calculation under its public output alias and identity',
    async (build) => {
      const document = await withPublicExpressionStage(build(), true);
      const indexed = indexSubstraitRelations(document);
      if (!indexed.ok) throw indexed.error;
      const root = buildCanvasRelationalTreeRelation({ index: indexed.index, digest: 'group' });
      const detail = projectCanvasRelationalTreeDetails(root, {
        transformNode: graphModel(document),
      });
      expect(detail.graphs.size).toBe(2);
      const graph = detail.graphs.get(root.locator)!;
      const output = graph.nodes.find((entry) => entry.data.label === 'OUTPUT')!;
      const calculated = root.output.fields[2]!;
      const expression = graph.nodes.find(
        (entry) => entry.data.fieldReference?.fieldId === calculated.fieldId
      )!;
      expect(expression.data).toMatchObject({
        projectExpressionOrdinal: 0,
        fieldSelection: 'output',
        fieldReference: { fieldId: calculated.fieldId, relationId: root.relationId },
      });
      expect(expression.data.label).toContain(calculated.displayName);
      expect(expression.data.label).toMatch(build === withScalarOutput ? /^UPPER/ : /^WINDOW/);
      expect(graph.edges).toContainEqual(
        expect.objectContaining({ source: expression.id, target: output.id })
      );
      expect(
        graph.nodes.filter((entry) => entry.data.fieldReference?.fieldId === calculated.fieldId)
      ).toHaveLength(1);
      expect(graph.nodes.filter((entry) => entry.data.fieldSelection === 'input')).toHaveLength(2);
    }
  );

  it.each([withScalarOutput, withWindowOutput])(
    'places published calculated roots under OUTPUT without a duplicate field token',
    (build) => {
      const { node, projection } = projectExpressionStage(build());
      const graph = projectCanvasRelationalTreeDetails(projection.root, {
        transformNode: node,
      }).graphs.get(projection.root.locator)!;
      const output = graph.nodes.find((entry) => entry.data.label === 'OUTPUT')!;
      const expression = graph.nodes.find((entry) => entry.data.projectExpressionOrdinal === 0)!;
      expect(graph.edges).toContainEqual(
        expect.objectContaining({ source: expression.id, target: output.id })
      );
      expect(
        graph.nodes.filter(
          (entry) => entry.data.fieldReference?.fieldId === expression.data.fieldReference?.fieldId
        )
      ).toHaveLength(1);
      expect(graph.nodes.filter((entry) => entry.data.fieldSelection === 'input')).toHaveLength(2);
    }
  );

  it('does not present a retained but excluded expression as published OUTPUT', () => {
    const draft = withoutLastOutput(withScalarOutput());
    const { node } = projectExpressionStage(withScalarOutput());
    const indexed = indexSubstraitRelations(draft);
    if (!indexed.ok) throw indexed.error;
    const root = buildCanvasRelationalTreeRelation({ index: indexed.index, digest: 'inspection' });
    const graph = projectCanvasRelationalTreeDetails(root, {
      transformNode: node,
      draft,
    }).graphs.get(root.locator)!;
    const output = graph.nodes.find((entry) => entry.data.label === 'OUTPUT')!;
    const expression = graph.nodes.find((entry) => entry.data.projectExpressionOrdinal === 0)!;
    expect(expression.data.fieldReference).toBeUndefined();
    expect(
      graph.edges.some((edge) => edge.source === expression.id && edge.target === output.id)
    ).toBe(false);
  });
  it.each(['hidden', 'unavailable'])(
    'keeps a %s internal definition inspectable without an incorrect public removal target',
    async (state) => {
      const full = await withPublicExpressionStage(withScalarOutput(), true);
      const document = state === 'hidden' ? withoutLastOutput(full) : full;
      const indexed = indexSubstraitRelations(document);
      if (!indexed.ok) throw indexed.error;
      const root = buildCanvasRelationalTreeRelation({
        index: indexed.index,
        digest: state,
        publication: new Map([
          [
            indexed.index.rootId,
            {
              rowUnavailable: false,
              unavailableFieldIds:
                state === 'unavailable'
                  ? [indexed.index.relations.get(indexed.index.rootId)!.fields[2]!.fieldId]
                  : [],
            },
          ],
        ]),
      });
      const graph = projectCanvasRelationalTreeDetails(root, {
        transformNode: graphModel(document),
      }).graphs.get(root.locator)!;
      const expression = graph.nodes.find((entry) => entry.data.label.startsWith('UPPER'))!;
      expect(expression).toBeDefined();
      expect(expression.data.fieldReference).toBeUndefined();
      expect(expression.data.projectExpressionOrdinal).toBe(0);
      expect(expression.data.projectExpressionRelationId).toBe(
        document.sidecar.relations.find(
          (binding) => binding.authoringOwnerRelationId === root.relationId
        )!.relationId
      );
      expect(graph.nodes.filter((entry) => entry.data.unavailable === true)).toHaveLength(
        state === 'unavailable' ? 1 : 0
      );
      expect(root.projectionSummary?.scalarFieldCount).toBe(0);
      const output = graph.nodes.find((entry) => entry.data.label === 'OUTPUT')!;
      expect(
        graph.edges.some((edge) => edge.source === expression.id && edge.target === output.id)
      ).toBe(false);
    }
  );
  it('reuses the canonical scalar graph without a second expression model', () => {
    const { node, projection } = projectExpressionStage(withScalarOutput());
    const detail = projectCanvasRelationalTreeDetails(projection.root, {
      transformNode: node,
    });
    const graph = detail.graphs.get(projection.root.locator);

    expect(graph?.nodes.some((entry) => entry.data.label.startsWith('UPPER'))).toBe(true);
    expect(graph?.nodes.some((entry) => entry.data.semanticKind === 'field')).toBe(true);
    expect(detail.sizes.has(projection.root.locator)).toBe(true);
  });
});
