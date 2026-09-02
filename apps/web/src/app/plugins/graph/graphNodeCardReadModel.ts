/** Owned concern: choose the strategy-owned graph node card projection. */
import type { CanonicalNode } from '../../types/canonical';
import type { NodeRendererProps } from '../contracts/NodeRendering';
import { resolveNodeKindRegistration } from '../nodeTypeRegistry';
import { defaultGraphNodeCardStrategy } from './defaultGraphNodeCardStrategy';
import { resolveGraphNodeColumnInteractionProps } from './graphNodeColumnContracts';
import type {
  GraphNodeCardReadModel,
  GraphNodeCardStrategy,
} from './graphNodeCardStrategyContracts';
import type { GraphNodeCardViewProps } from './GraphNodeCardView';
import { resolveGraphNodeTagActionProps } from './GraphNodeTagList';

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
  ) as GraphNodeCardViewProps['columns'];
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
  const openSourceDataSample = data.onOpenSourceDataSample;
  const openOperationalDetails = data.onOpenOperationalDetails;

  return {
    cardModel: buildGraphNodeCardReadModel(node, data, graphNodeCardStrategies),
    typeLabel:
      typeof data.typeLabel === 'string'
        ? data.typeLabel
        : typeof data.type === 'string'
          ? data.type
          : kindMeta.label,
    tags,
    columns,
    showColumns:
      data.showColumns === true &&
      columns.length > 0 &&
      (kindMeta.supportsColumns || node.role === 'input' || node.role === 'transform'),
    icon: kindMeta.icon,
    borderClass: kindMeta.borderClass,
    selected,
    hovered,
    dimmed: overlayDecoration?.dimmed ?? false,
    ...(Object.keys(overlayStyle).length > 0 ? { overlayStyle } : {}),
    ...resolveGraphNodeTagActionProps(data),
    ...resolveGraphNodeColumnInteractionProps({ nodeId: node.id, nodeRole: node.role, data }),
    onOpenCode:
      data.canOpenNodeCode !== false && typeof inspectNode === 'function'
        ? () => inspectNode(node.id, 'code')
        : undefined,
    onOpenDataSample:
      typeof openSourceDataSample === 'function' ? () => openSourceDataSample(node.id) : undefined,
    dataSampleInteractionLabel:
      typeof data.sourceDataSampleInteractionLabel === 'string'
        ? data.sourceDataSampleInteractionLabel
        : undefined,
    onOpenOperationalDetails:
      typeof openOperationalDetails === 'function'
        ? (detail, anchorElement) => openOperationalDetails(detail, anchorElement)
        : undefined,
  };
}
