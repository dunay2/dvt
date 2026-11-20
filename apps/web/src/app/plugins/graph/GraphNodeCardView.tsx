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
import { GraphNodeCardTitle } from './GraphNodeCardTitle';
import { isRuntimeSummaryMetric } from './graphNodeCardReadModel';
import { ModelIdentitySelect } from '../../components/inspector/ModelIdentitySelect';

export function GraphNodeCardView({
  materializationControl,
  columnSection,
  cardModel,
  showOperationalMetrics = false,
  sourceCardAppearance,
  tags,
  icon: Icon,
  modelIdentity,
  onChangeModelIcon,
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
    sourceCardAppearance?.qualifiedName !== false &&
    cardModel.subtitle != null &&
    (cardModel.subtitle !== cardModel.path || !pathIsRepresentedByCodeMetric)
      ? cardModel.subtitle
      : null;
  const summary = showOperationalMetrics
    ? cardModel.metrics
    : cardModel.metrics.filter((metric) => !isRuntimeSummaryMetric(metric));
  const headerMetrics = summary.filter((metric) => metric.placement === 'header');
  const bodyMetrics = summary.filter((metric) => metric.placement !== 'header');
  const operationalMetrics =
    sourceCardAppearance == null
      ? showOperationalMetrics
        ? cardModel.operationalMetrics
        : []
      : cardModel.operationalMetrics.filter(
          ({ id }) =>
            (id === 'rows' && sourceCardAppearance.rows) ||
            (id === 'size' && sourceCardAppearance.size)
        );
  const { borderColor: overlayBorderColor, ...cardOverlayStyle } = overlayStyle ?? {};
  const sourceColor = sourceCardAppearance?.color;
  const cardStyle = {
    ...cardOverlayStyle,
    ...(sourceColor == null ? {} : { '--source-card-color': sourceColor }),
  } as CSSProperties;

  return (
    <div
      data-slot="graph-node-card"
      className={cn(
        graphNodeCardSurfaceClasses.root,
        sourceColor != null && graphNodeCardSurfaceClasses.sourceTint,
        borderClass,
        graphNodeHealthBorderClasses[cardModel.health.tone],
        selected && graphNodeCardSurfaceClasses.selected,
        hovered && !selected && graphNodeCardSurfaceClasses.hovered,
        dimmed && graphNodeCardSurfaceClasses.dimmed,
        sourceCardAppearance?.types === false && '[&_[data-slot=graph-node-column-type]]:hidden',
        sourceCardAppearance?.nullability === false &&
          '[&_[data-slot=graph-node-column-nullability]]:hidden'
      )}
      style={cardStyle}
    >
      <div className={graphNodeCardLayoutClasses.body}>
        <div
          data-slot="graph-node-card-header"
          className={cn(
            graphNodeCardLayoutClasses.header,
            sourceColor != null && graphNodeCardLayoutClasses.sourceTintedHeader
          )}
        >
          <div className={graphNodeCardLayoutClasses.titleRow}>
            {modelIdentity != null ? (
              <span data-slot="graph-node-card-icon">
                <ModelIdentitySelect
                  identity={modelIdentity}
                  modelName={cardModel.title}
                  onChange={onChangeModelIcon}
                  presentation="icon"
                />
              </span>
            ) : (
              Icon && (
                <Icon
                  size={18}
                  data-slot="graph-node-card-icon"
                  data-tone={cardModel.accentTone}
                  className={cn(
                    graphNodeCardLayoutClasses.icon,
                    graphNodeCardLayoutClasses.iconTone[cardModel.accentTone]
                  )}
                />
              )
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

        {sourceCardAppearance?.tags !== false && (
          <GraphNodeTagList
            tags={tags}
            tone={cardModel.accentTone}
            onSelectTag={onSelectTag}
            getSelectTagLabel={getSelectTagLabel}
          />
        )}

        {columnSection == null || sourceCardAppearance?.columns === false ? null : (
          <GraphNodeColumnViews {...columnSection} />
        )}
      </div>

      {operationalMetrics.length > 0 &&
        (interactiveOperationalDetail && onOpenOperationalDetails ? (
          <GraphNodeOperationalRail
            metrics={operationalMetrics}
            ariaLabel={interactiveOperationalDetail.ariaLabel}
            onOpen={(anchor) => onOpenOperationalDetails(interactiveOperationalDetail, anchor)}
          />
        ) : (
          <GraphNodeOperationalRail metrics={operationalMetrics} />
        ))}
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
