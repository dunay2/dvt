/**
 * Owned concern: resolve a projected node's visual identity without overriding admission.
 * @baseline ADR-0064: canonical relations own type; sidecar names are not semantic authority.
 * @decision Omit exact JOIN operation codes from secondary text through the existing catalog.
 * @consequence Saved names remain intact; cards and Model summaries cannot imply a second JOIN type.
 * @version 1.0.0
 */
import {
  resolveCanvasRelationalOperationPresentation,
  type CanvasPresentationOperation,
} from './canvasRelationalOperationPresentation';
import type {
  CanvasRelationalTreeNode,
  CanvasRelationalTreeOperator,
} from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { isCanvasJoinOperation } from './canvasRelationalTreeJoinType';

const fallbackOperations = {
  read: 'read',
  project: 'field_transform',
  filter: 'filter',
  join: 'unsupported',
  cross: 'cross_join',
  set: 'unsupported',
  aggregate: 'aggregate',
  window: 'window',
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

function relationNameDetail(node: CanvasRelationalTreeNode): string {
  if (node.operator === 'join' && isCanvasJoinOperation(node.displayName)) return '';
  return node.displayName ?? node.substraitKind;
}

function sourceReferenceDetail(
  node: CanvasRelationalTreeNode,
  copy: CanvasRelationalTreeWorkbenchCopy
): string {
  const source = node.physicalSource;
  if (node.sourceRef == null || source == null) return '';
  if (node.displayName === source.name || node.displayName === source.qualifiedName) return '';
  return copy.relationalTreeConnectedSourceTemplate.replace('{source}', source.qualifiedName);
}

export function resolveCanvasRelationalNodeCopy(
  node: CanvasRelationalTreeNode,
  copy: CanvasRelationalTreeWorkbenchCopy
) {
  const resolved = resolveCanvasRelationalNodePresentation(node);
  const subtitle = relationNameDetail(node);
  const title = node.operator === 'read' ? subtitle : copy[resolved.presentation.labelKey];
  const summary = node.projectionSummary;
  const template =
    resolved.operation === 'field_transform'
      ? copy.relationalTreeFieldTransformationStageSummaryTemplate
      : null;
  const detail =
    node.operator === 'read'
      ? sourceReferenceDetail(node, copy)
      : template == null || summary == null
        ? subtitle
        : template
            .replace('{scalar}', String(summary.scalarFieldCount))
            .replace('{window}', String(summary.windowFieldCount))
            .replace('{passthrough}', String(summary.passthroughFieldCount));
  return { ...resolved, title, detail };
}
