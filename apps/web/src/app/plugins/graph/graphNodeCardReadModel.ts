/** Owned concern: choose the strategy-owned graph node card projection. */
import type { CanonicalNode } from '../../types/canonical';
import type { NodeRendererProps } from '../contracts/NodeRendering';
import { resolveNodeKindRegistration } from '../nodeTypeRegistry';
import { defaultGraphNodeCardStrategy } from './defaultGraphNodeCardStrategy';
import {
  resolveGraphNodeColumnInteractionProps,
  type GraphNodeColumn,
} from './graphNodeColumnContracts';
import type {
  GraphNodeCardReadModel,
  GraphNodeCardStrategy,
} from './graphNodeCardStrategyContracts';
import type { GraphNodeCardViewProps } from './graphNodeCardViewContracts';
import { resolveGraphNodeTagActionProps } from './GraphNodeTagList';
import { readGraphNodeMaterializationControl } from './graphNodeMaterializationControl';

export type {
  GraphNodeCardMetric,
  GraphNodeCardReadModel,
  GraphNodeSourceIdentity,
  GraphNodeCardStrategy,
} from './graphNodeCardStrategyContracts';

export function buildGraphNodeCardReadModel(
  node: CanonicalNode,
  data: Record<string, unknown>,
  strategies: readonly GraphNodeCardStrategy[] = []
): GraphNodeCardReadModel {
  return (
    strategies.find((strategy) => strategy.matches(node)) ?? defaultGraphNodeCardStrategy
  ).build(node, data);
}

export function projectGraphNodeCardViewProps(
  props: Readonly<NodeRendererProps>
): GraphNodeCardViewProps {
  const { node, selected, hovered, overlayDecoration, graphNodeCardStrategies, data } = props;
  const kindMeta = resolveNodeKindRegistration(node.kind);
  const overlayStyle: NonNullable<GraphNodeCardViewProps['overlayStyle']> = {};
  if (overlayDecoration?.borderColor) {
    overlayStyle.borderColor = overlayDecoration.borderColor;
  }
  if (overlayDecoration?.backgroundColor) {
    overlayStyle.backgroundColor = overlayDecoration.backgroundColor;
  }

  const columns = (
    Array.isArray(data.columns)
      ? data.columns
      : Array.isArray(node.metadata?.columns)
        ? node.metadata.columns
        : []
  ) as readonly GraphNodeColumn[];
  const columnInteractionProps = resolveGraphNodeColumnInteractionProps({
    nodeId: node.id,
    nodeRole: node.role,
    data,
  });
  const tags = Array.isArray(data.displayTags)
    ? data.displayTags.filter(
        (tag): tag is Readonly<{ value: string; label: string }> =>
          typeof tag === 'object' &&
          tag != null &&
          typeof (tag as { value?: unknown }).value === 'string' &&
          typeof (tag as { label?: unknown }).label === 'string'
      )
    : node.tags.map((tag) => ({ value: tag, label: tag }));
  const inspectNode = data.onInspectNode;
  const openOperationalDetails = data.onOpenOperationalDetails;
  const {
    columnPortDirections,
    columnDisclosureExpanded,
    onColumnDisclosureChange,
    onAutomapColumns,
    ...columnProps
  } = columnInteractionProps;
  const showColumns =
    data.showColumns === true &&
    (columns.length > 0 || columnProps.expressionInputs.length > 0) &&
    (kindMeta.supportsColumns || node.role === 'input' || node.role === 'transform');

  return {
    cardModel: buildGraphNodeCardReadModel(node, data, graphNodeCardStrategies),
    materializationControl: readGraphNodeMaterializationControl(data.materializationControl),
    tags,
    columnSection: showColumns
      ? {
          ...columnProps,
          columns,
          portDirections: columnPortDirections,
          expanded: columnDisclosureExpanded,
          onDisclosureChange:
            onColumnDisclosureChange == null
              ? undefined
              : (expanded) => onColumnDisclosureChange(node.id, expanded),
          onAutomap:
            onAutomapColumns == null ? undefined : () => onAutomapColumns(node.id, columns),
        }
      : null,
    icon: kindMeta.icon,
    borderClass: kindMeta.borderClass,
    selected,
    hovered,
    dimmed: overlayDecoration?.dimmed ?? false,
    ...(Object.keys(overlayStyle).length > 0 ? { overlayStyle } : {}),
    ...resolveGraphNodeTagActionProps(data),
    onOpenCode:
      data.canOpenNodeCode !== false && typeof inspectNode === 'function'
        ? () => inspectNode(node.id, 'code')
        : undefined,
    onOpenOperationalDetails:
      typeof openOperationalDetails === 'function'
        ? (detail, anchorElement) => openOperationalDetails(detail, anchorElement)
        : undefined,
  };
}
