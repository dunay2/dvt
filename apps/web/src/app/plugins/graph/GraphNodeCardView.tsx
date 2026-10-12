/** Owned concern: GraphNodeCardView. */

import { type ReactElement } from 'react';
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
import { GraphNodeCardTitle } from './GraphNodeCardTitle';

export function GraphNodeCardView({
  materializationControl,
  columnSection,
  cardModel,
  tags,
  icon: Icon,
  borderClass,
  selected,
  hovered,
  dimmed,
  overlayStyle,
  onOpenOperationalDetails,
  onOpenCode,
  onSelectTag,
  getSelectTagLabel,
  algebraicDrop,
}: GraphNodeCardViewProps): ReactElement {
  const operationalDetail = cardModel.operationalDetail;
  const interactiveOperationalDetail =
    operationalDetail != null && operationalDetail.rows.length > 0 ? operationalDetail : null;
  const backingPath = cardModel.path;
  const pathIsRepresentedByCodeMetric =
    backingPath != null &&
    cardModel.metrics.some(
      (metric) => metric.id === 'code' && metric.detail?.includes(backingPath) === true
    );
  const visibleSubtitle =
    cardModel.subtitle != null &&
    (cardModel.subtitle !== cardModel.path || !pathIsRepresentedByCodeMetric)
      ? cardModel.subtitle
      : null;
  const headerMetrics = cardModel.metrics.filter((metric) => metric.placement === 'header');
  const bodyMetrics = cardModel.metrics.filter((metric) => metric.placement !== 'header');
  const { borderColor: overlayBorderColor, ...cardOverlayStyle } = overlayStyle ?? {};
  const hasCardOverlayStyle = Object.keys(cardOverlayStyle).length > 0;

  return (
    <div
      data-slot="graph-node-card"
      className={cn(
        graphNodeCardSurfaceClasses.root,
        borderClass,
        graphNodeHealthBorderClasses[cardModel.health.tone],
        selected && graphNodeCardSurfaceClasses.selected,
        hovered && !selected && graphNodeCardSurfaceClasses.hovered,
        dimmed && graphNodeCardSurfaceClasses.dimmed
      )}
      {...(hasCardOverlayStyle ? { style: cardOverlayStyle } : {})}
    >
      <div className={graphNodeCardLayoutClasses.body}>
        <div data-slot="graph-node-card-header" className={graphNodeCardLayoutClasses.header}>
          <div className={graphNodeCardLayoutClasses.titleRow}>
            {Icon && (
              <Icon
                size={18}
                data-slot="graph-node-card-icon"
                data-tone={cardModel.accentTone}
                className={cn(
                  graphNodeCardLayoutClasses.icon,
                  graphNodeCardLayoutClasses.iconTone[cardModel.accentTone]
                )}
              />
            )}
            <GraphNodeCardTitle cardModel={cardModel} />
          </div>
          {headerMetrics.length === 0 ? null : (
            <div
              data-slot="graph-node-card-header-rail"
              className={graphNodeCardLayoutClasses.headerActions}
            >
              <GraphNodeMetricRow
                metrics={headerMetrics}
                placement="header"
                materializationControl={materializationControl}
              />
            </div>
          )}
        </div>

        {cardModel.kindLabel != null && (
          <div data-slot="graph-node-card-kind" className={graphNodeCardLayoutClasses.kind}>
            {cardModel.kindLabel}
          </div>
        )}

        <GraphNodeMetricRow metrics={bodyMetrics} onOpenCode={onOpenCode} />

        {visibleSubtitle && (
          <div className={graphNodeCardLayoutClasses.path}>{visibleSubtitle}</div>
        )}

        <GraphNodeTagList
          tags={tags}
          tone={cardModel.accentTone}
          onSelectTag={onSelectTag}
          getSelectTagLabel={getSelectTagLabel}
        />

        {columnSection == null ? null : <GraphNodeColumnViews {...columnSection} />}
      </div>

      {onOpenOperationalDetails == null || interactiveOperationalDetail == null ? (
        <GraphNodeOperationalRail metrics={cardModel.operationalMetrics} />
      ) : (
        <GraphNodeOperationalRail
          metrics={cardModel.operationalMetrics}
          ariaLabel={interactiveOperationalDetail.ariaLabel}
          onOpen={(anchorElement) =>
            onOpenOperationalDetails(interactiveOperationalDetail, anchorElement)
          }
        />
      )}
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
