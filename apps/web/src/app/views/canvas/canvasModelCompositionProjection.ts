/** Project the canonical relational tree into a dependency-first Model summary. */
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';

export type CanvasModelCompositionStep = Readonly<{
  locator: string;
  kind: 'input' | 'operation';
  node: CanvasRelationalTreeNode;
}>;

export function projectCanvasModelComposition(
  root: CanvasRelationalTreeNode
): readonly CanvasModelCompositionStep[] {
  const steps: CanvasModelCompositionStep[] = [];
  const visit = (node: CanvasRelationalTreeNode): void => {
    [...node.children]
      .sort((left, right) => left.ordinal - right.ordinal)
      .forEach((child) => visit(child.node));
    steps.push({
      locator: node.locator,
      kind: node.operator === 'read' ? 'input' : 'operation',
      node,
    });
  };
  visit(root);
  return steps;
}
