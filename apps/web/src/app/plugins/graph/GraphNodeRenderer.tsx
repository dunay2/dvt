/** Owned concern: render generic canonical graph nodes independent of plugin-specific panels. */
import type { CSSProperties, ReactElement } from 'react';

import { resolveNodeKindRegistration } from '../nodeTypeRegistry';
import { resolveGraphNodeColumnInteractionProps } from './GraphNodeColumnSection';
import type { NodeRendererProps } from '../contracts/NodeRendering';
import { graphStatusRingClasses } from './graphVisualTokens';
import { buildGraphNodeCardReadModel } from './graphNodeCardReadModel';
import type { GraphNodeOperationalDetail } from './graphNodeCardStrategyContracts';
import { GraphNodeCardView } from './GraphNodeCardView';
import { resolveGraphNodeTagActionProps } from './GraphNodeTagList';

type ColumnMeta = {
  name: string;
  type: string;
  description?: string;
  nullable?: boolean;
};

function buildOverlayProps(
  borderColor?: string,
  backgroundColor?: string
): { style?: CSSProperties } {
  const style: CSSProperties = {};
  if (borderColor) style.borderColor = borderColor;
  if (backgroundColor) style.backgroundColor = backgroundColor;
  return Object.keys(style).length > 0 ? { style } : {};
}

function resolveColumns(
  data: Record<string, unknown>,
  metadata: Record<string, unknown> | undefined
): ColumnMeta[] {
  if (Array.isArray(data.columns)) {
    return data.columns as ColumnMeta[];
  }
  if (Array.isArray(metadata?.columns)) {
    return metadata.columns as ColumnMeta[];
  }
  return [];
}

export function GraphNodeRenderer({
  node,
  selected,
  hovered,
  overlayDecoration,
  graphNodeCardStrategies,
  data,
}: Readonly<NodeRendererProps>): ReactElement {
  const kindMeta = resolveNodeKindRegistration(node.kind);

  const statusRing = graphStatusRingClasses[node.status] ?? '';
  const dimmed = overlayDecoration?.dimmed ?? false;
  const overlayProps = buildOverlayProps(
    overlayDecoration?.borderColor,
    overlayDecoration?.backgroundColor
  );
  const typeLabel =
    typeof data.typeLabel === 'string'
      ? data.typeLabel
      : typeof data.type === 'string'
        ? data.type
        : kindMeta.label;
  const cardModel = buildGraphNodeCardReadModel(node, data, graphNodeCardStrategies);
  const openOperationalDetails = data.onOpenOperationalDetails;
  const inspectNode = data.onInspectNode;
  const columns = resolveColumns(data, node.metadata);
  const showColumns =
    data.showColumns === true &&
    columns.length > 0 &&
    (kindMeta.supportsColumns || node.role === 'input' || node.role === 'transform');
  const displayTags = Array.isArray(data.displayTags)
    ? data.displayTags.filter(
        (tag): tag is Readonly<{ value: string; label: string }> =>
          typeof tag === 'object' &&
          tag != null &&
          typeof (tag as { value?: unknown }).value === 'string' &&
          typeof (tag as { label?: unknown }).label === 'string'
      )
    : node.tags.map((tag) => ({ value: tag, label: tag }));
  const tagActionProps = resolveGraphNodeTagActionProps(data);
  const columnInteractionProps = resolveGraphNodeColumnInteractionProps({
    nodeId: node.id,
    nodeRole: node.role,
    data,
  });

  return (
    <GraphNodeCardView
      cardModel={cardModel}
      typeLabel={typeLabel}
      tags={displayTags}
      columns={columns}
      showColumns={showColumns}
      icon={kindMeta.icon}
      borderClass={kindMeta.borderClass}
      statusRingClass={statusRing}
      selected={selected}
      hovered={hovered}
      dimmed={dimmed}
      overlayStyle={overlayProps.style}
      {...tagActionProps}
      {...columnInteractionProps}
      onOpenCode={
        data.canOpenNodeCode !== false && typeof inspectNode === 'function'
          ? () => inspectNode(node.id, 'code')
          : undefined
      }
      onOpenDataSample={
        typeof data.onOpenSourceDataSample === 'function'
          ? () => (data.onOpenSourceDataSample as (nodeId: string) => void)(node.id)
          : undefined
      }
      dataSampleInteractionLabel={
        typeof data.sourceDataSampleInteractionLabel === 'string'
          ? data.sourceDataSampleInteractionLabel
          : undefined
      }
      onOpenOperationalDetails={
        typeof openOperationalDetails === 'function'
          ? (detail: GraphNodeOperationalDetail, anchorElement: HTMLElement) => {
              openOperationalDetails(detail, anchorElement);
            }
          : undefined
      }
    />
  );
}
