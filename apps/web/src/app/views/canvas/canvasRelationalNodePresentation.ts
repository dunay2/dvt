/** Owned concern: resolve a projected node's visual identity without overriding admission. */
import {
  resolveCanvasRelationalOperationPresentation,
  type CanvasPresentationOperation,
} from './canvasRelationalOperationPresentation';
import type {
  CanvasRelationalTreeNode,
  CanvasRelationalTreeOperator,
} from './canvasRelationalTreeProjection';

const fallbackOperations = {
  read: 'read',
  project: 'projection',
  filter: 'filter',
  join: 'unsupported',
  cross: 'cross_join',
  set: 'unsupported',
  aggregate: 'aggregate',
  sort: 'sort',
  fetch: 'fetch',
  unsupported: 'unsupported',
} as const satisfies Record<CanvasRelationalTreeOperator, CanvasPresentationOperation>;

export function resolveCanvasRelationalNodePresentation(node: CanvasRelationalTreeNode) {
  const operation =
    node.operator === 'unsupported'
      ? 'unsupported'
      : (node.operation ?? fallbackOperations[node.operator]);
  return { operation, presentation: resolveCanvasRelationalOperationPresentation(operation) };
}
