/** Owned concern: GraphNodeCardView. */

import type { CSSProperties, ReactElement } from 'react';
import { cn } from '../../components/ui/utils';
import { GraphNodeColumnViews } from './GraphNodeColumnViews';
import { GraphNodeMetricRow } from './GraphNodeMetricRow';
import { GraphNodeOperationalRail } from './GraphNodeOperationalRail';
import { GraphNodeTagList } from './GraphNodeTagList';
import { GraphNodeAlgebraicDropZone } from './GraphNodeAlgebraicDropZone';
import {
  graphNodeCardLayoutClasses,
  graphNodeHealthBorderClasses,
  graphNodeCardSurfaceClasses,
} from './graphCardVisualTokens';
import type { GraphNodeCardViewProps } from './graphNodeCardViewContracts';
import { GraphNodeCardHeader } from './GraphNodeCardHeader';
import { visibleCardMetrics, visibleCardSubtitle } from './graphNodeCardVisibility';

function cardClassName({
  sourceCardAppearance,
  selected,
  hovered,
  dimmed,
  borderClass,
  cardModel,
}: GraphNodeCardViewProps) {
  const { color: sourceColor, types, nullability } = sourceCardAppearance ?? {};
  return cn(
    graphNodeCardSurfaceClasses.root,
    sourceColor != null && graphNodeCardSurfaceClasses.sourceTint,
    borderClass,
    graphNodeHealthBorderClasses[cardModel.health.tone],
    selected && graphNodeCardSurfaceClasses.selected,
    hovered && !selected && graphNodeCardSurfaceClasses.hovered,
    dimmed && graphNodeCardSurfaceClasses.dimmed,
    types === false && '[&_[data-slot=graph-node-column-type]]:hidden',
    nullability === false && '[&_[data-slot=graph-node-column-nullability]]:hidden'
  );
}

function cardOperationalRail(
  metrics: GraphNodeCardViewProps['cardModel']['operationalMetrics'],
  { cardModel, onOpenOperationalDetails }: GraphNodeCardViewProps
) {
  const detail = cardModel.operationalDetail;
  if (!detail?.rows.length || !onOpenOperationalDetails)
    return <GraphNodeOperationalRail metrics={metrics} />;
  return (
    <GraphNodeOperationalRail
      metrics={metrics}
      ariaLabel={detail.ariaLabel}
      onOpen={(anchor) => onOpenOperationalDetails(detail, anchor)}
    />
  );
}

export function GraphNodeCardView(props: GraphNodeCardViewProps): ReactElement {
  const {
    materializationControl,
    columnSection,
    cardModel,
    showOperationalMetrics = false,
    sourceCardAppearance,
    tags,
    icon,
    modelIdentity,
    onChangeModelIcon,
    onOpenCode,
    onSelectTag,
    getSelectTagLabel,
    algebraicDrop,
  } = props;
  const { borderColor: overlayBorderColor, ...overlay } = props.overlayStyle ?? {};
  const {
    tags: showTags = true,
    columns: showColumns = true,
    color: sourceColor,
  } = sourceCardAppearance ?? {};
  const cardStyle = { ...overlay, '--source-card-color': sourceColor } as CSSProperties;
  const metrics = visibleCardMetrics(cardModel, showOperationalMetrics, sourceCardAppearance);
  const subtitle = visibleCardSubtitle(cardModel, sourceCardAppearance);

  return (
    <div data-slot="graph-node-card" className={cardClassName(props)} style={cardStyle}>
      <div className={graphNodeCardLayoutClasses.body}>
        <GraphNodeCardHeader
          cardModel={cardModel}
          icon={icon}
          modelIdentity={modelIdentity}
          onChangeModelIcon={onChangeModelIcon}
          materializationControl={materializationControl}
          metrics={metrics.header}
          tinted={sourceColor != null}
        />

        {cardModel.kindLabel != null && (
          <div data-slot="graph-node-card-kind" className={graphNodeCardLayoutClasses.kind}>
            {cardModel.kindLabel}
          </div>
        )}

        <GraphNodeMetricRow metrics={metrics.body} onOpenCode={onOpenCode} />

        {subtitle && <div className={graphNodeCardLayoutClasses.path}>{subtitle}</div>}

        {showTags && (
          <GraphNodeTagList
            tags={tags}
            tone={cardModel.accentTone}
            onSelectTag={onSelectTag}
            getSelectTagLabel={getSelectTagLabel}
          />
        )}

        {showColumns && columnSection && <GraphNodeColumnViews {...columnSection} />}
      </div>

      {cardOperationalRail(metrics.operational, props)}
      {overlayBorderColor != null && (
        <span
          aria-hidden="true"
          data-slot="graph-node-overlay-border"
          className={graphNodeCardSurfaceClasses.overlayBorder}
          style={{ borderColor: overlayBorderColor }}
        />
      )}
      {algebraicDrop == null ? null : <GraphNodeAlgebraicDropZone drop={algebraicDrop} />}
    </div>
  );
}
