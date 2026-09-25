import { describe, expect, it } from 'vitest';

import {
  projectExpressionStage,
  withScalarOutput,
} from './canvasRelationalExpressionStage.test-support';
import { projectCanvasRelationalTreeSemanticZoom } from './canvasRelationalTreeSemanticZoom';

describe('Canvas Expression stage semantic zoom', () => {
  it('reuses the canonical scalar graph without a second expression model', () => {
    const { node, projection } = projectExpressionStage(withScalarOutput());
    const detail = projectCanvasRelationalTreeSemanticZoom(projection.root, {
      transformNode: node,
    });
    const graph = detail.graphs.get(projection.root.locator);

    expect(graph?.nodes.some((entry) => entry.data.label.startsWith('UPPER'))).toBe(true);
    expect(graph?.nodes.some((entry) => entry.data.semanticKind === 'field')).toBe(true);
    expect(detail.sizes.has(projection.root.locator)).toBe(true);
  });
});
