import { describe, expect, it } from 'vitest';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { buildCanvasRelationalTreeRelation } from './canvasRelationalTreeRelationProjection';

import {
  projectExpressionStage,
  withScalarOutput,
  withWindowOutput,
  withoutLastOutput,
} from './canvasRelationalExpressionStage.test-support';
import { projectCanvasRelationalTreeDetails } from './canvasRelationalTreeDetails';

describe('Canvas Expression stage card detail', () => {
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
