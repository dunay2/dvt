/** Owned concern: resolve a projected node's visual identity without overriding admission. */
import {
  resolveCanvasRelationalOperationPresentation,
  type CanvasPresentationOperation,
} from './canvasRelationalOperationPresentation';
import type {
  CanvasRelationalTreeNode,
  CanvasRelationalTreeOperator,
} from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';

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

export function resolveCanvasRelationalNodeCopy(
  node: CanvasRelationalTreeNode,
  copy: CanvasRelationalTreeWorkbenchCopy
) {
  const resolved = resolveCanvasRelationalNodePresentation(node);
  const subtitle = node.displayName ?? node.substraitKind;
  const title = node.operator === 'read' ? subtitle : copy[resolved.presentation.labelKey];
  const summary = node.projectionSummary;
  const template =
    resolved.operation === 'expression'
      ? copy.relationalTreeExpressionStageSummaryTemplate
      : resolved.operation === 'window' || resolved.operation === 'field_transform'
        ? copy.relationalTreeFieldTransformationStageSummaryTemplate
        : null;
  const detail =
    template == null || summary == null
      ? subtitle
      : template
          .replace('{scalar}', String(summary.scalarFieldCount))
          .replace('{window}', String(summary.windowFieldCount))
          .replace('{passthrough}', String(summary.passthroughFieldCount));
  return { ...resolved, title, detail };
}
