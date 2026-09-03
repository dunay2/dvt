/** Owned concern: render graph-node card markup from an already-projected card model. */
import { type CSSProperties, type ReactElement } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '../../components/ui/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { GraphNodeColumnSection } from './GraphNodeColumnSection';
import type {
  GraphNodeColumn,
  GraphNodeCalculatedColumnIdentity,
  GraphNodeColumnFunctionApplyIdentity,
  GraphNodeColumnPortDirection,
  GraphNodeColumnPortIdentity,
  GraphNodeColumnReorderIdentity,
  GraphNodeStructuredFieldIdentity,
} from './graphNodeColumnContracts';
import { GraphNodeMetricRow } from './GraphNodeMetricRow';
import { GraphNodeOperationalRail } from './GraphNodeOperationalRail';
import { GraphNodeTagList } from './GraphNodeTagList';
import {
  GraphNodeAlgebraicDropZone,
  type GraphNodeAlgebraicDrop,
} from './GraphNodeAlgebraicDropZone';
import type {
  GraphNodeCardReadModel,
  GraphNodeOperationalDetail,
} from './graphNodeCardStrategyContracts';
import {
  graphNodeCardLayoutClasses,
  graphNodeHealthBorderClasses,
  graphNodeCardSurfaceClasses,
  graphNodeSourceIdentityTooltipClasses,
} from './graphVisualTokens';

export type GraphNodeCardColumn = GraphNodeColumn;

export type GraphNodeCardViewProps = Readonly<{
  cardModel: GraphNodeCardReadModel;
  typeLabel: string;
  tags: readonly Readonly<{ value: string; label: string }>[];
  columns: readonly GraphNodeCardColumn[];
  showColumns: boolean;
  icon?: LucideIcon;
  borderClass?: string;
  selected: boolean;
  hovered: boolean;
  dimmed: boolean;
  overlayStyle?: CSSProperties;
  onOpenOperationalDetails?: (
    detail: GraphNodeOperationalDetail,
    anchorElement: HTMLElement
  ) => void;
  onOpenCode?: () => void;
  onOpenDataSample?: () => void;
  dataSampleInteractionLabel?: string;
  onSelectTag?: (tag: string) => void;
  getSelectTagLabel?: (tag: string) => string;
  nodeId?: string;
  columnPortDirections?: readonly GraphNodeColumnPortDirection[];
  activeColumnHandleId?: string | null;
  columnDisclosureExpanded?: boolean;
  onColumnPortActivate?: (identity: GraphNodeColumnPortIdentity) => void;
  onColumnFunctionApply?: (identity: GraphNodeColumnFunctionApplyIdentity) => void;
  onStructuredFieldApply?: (identity: GraphNodeStructuredFieldIdentity) => void;
  onCalculatedColumnAdd?: (identity: GraphNodeCalculatedColumnIdentity) => void;
  onColumnOutputToggle?: (identity: {
    nodeId: string;
    columnId: string;
    columnType: string;
    output: boolean;
  }) => void;
  onColumnReorder?: (identity: GraphNodeColumnReorderIdentity) => void;
  canReorderTopLevelColumns?: boolean;
  onColumnDisclosureChange?: (nodeId: string, expanded: boolean) => void;
  onColumnLayoutChange?: () => void;
  onAutomapColumns?: (nodeId: string, columns: readonly GraphNodeCardColumn[]) => void;
  algebraicDrop?: GraphNodeAlgebraicDrop;
}>;

function GraphNodeCardTitle({ cardModel }: { cardModel: GraphNodeCardReadModel }): ReactElement {
  const sourceIdentity = cardModel.sourceIdentity;
  if (sourceIdentity == null) {
    return (
      <span
        data-slot="graph-node-card-title"
        className={graphNodeCardLayoutClasses.title}
        title={cardModel.titleDetail ?? undefined}
      >
        {cardModel.title}
      </span>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          data-slot="graph-node-source-identity-trigger"
          tabIndex={0}
          aria-label={sourceIdentity.ariaLabel}
          className={cn(
            graphNodeCardLayoutClasses.title,
            graphNodeCardLayoutClasses.sourceIdentityTrigger
          )}
        >
          {cardModel.title}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={6}
        className={graphNodeSourceIdentityTooltipClasses.root}
      >
        <dl className={graphNodeSourceIdentityTooltipClasses.rows}>
          {sourceIdentity.rows.map((row) => (
            <div key={row.id} className={graphNodeSourceIdentityTooltipClasses.row}>
              <dt className={graphNodeSourceIdentityTooltipClasses.label}>{row.label}</dt>
              <dd className={graphNodeSourceIdentityTooltipClasses.value}>{row.value}</dd>
            </div>
          ))}
        </dl>
      </TooltipContent>
    </Tooltip>
  );
}

export function GraphNodeCardView({
  cardModel,
  typeLabel,
  tags,
  columns,
  showColumns,
  icon: Icon,
  borderClass,
  selected,
  hovered,
  dimmed,
  overlayStyle,
  onOpenOperationalDetails,
  onOpenCode,
  onOpenDataSample,
  dataSampleInteractionLabel,
  onSelectTag,
  getSelectTagLabel,
  nodeId,
  columnPortDirections,
  activeColumnHandleId,
  columnDisclosureExpanded,
  onColumnPortActivate,
  onColumnFunctionApply,
  onStructuredFieldApply,
  onCalculatedColumnAdd,
  onColumnOutputToggle,
  onColumnReorder,
  canReorderTopLevelColumns,
  onColumnDisclosureChange,
  onColumnLayoutChange,
  onAutomapColumns,
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
            <div className={graphNodeCardLayoutClasses.headerActions}>
              <GraphNodeMetricRow metrics={headerMetrics} placement="header" />
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

        {showColumns && (
          <GraphNodeColumnSection
            columns={columns}
            expanded={columnDisclosureExpanded}
            nodeId={nodeId}
            portDirections={columnPortDirections}
            activeColumnHandleId={activeColumnHandleId}
            onColumnPortActivate={onColumnPortActivate}
            onColumnFunctionApply={onColumnFunctionApply}
            onStructuredFieldApply={onStructuredFieldApply}
            onCalculatedColumnAdd={onCalculatedColumnAdd}
            onColumnOutputToggle={onColumnOutputToggle}
            onColumnReorder={onColumnReorder}
            canReorderTopLevelColumns={canReorderTopLevelColumns}
            onDisclosureChange={
              nodeId == null || onColumnDisclosureChange == null
                ? undefined
                : (expanded) => onColumnDisclosureChange(nodeId, expanded)
            }
            onColumnLayoutChange={onColumnLayoutChange}
            onAutomap={
              nodeId == null || onAutomapColumns == null
                ? undefined
                : () => onAutomapColumns(nodeId, columns)
            }
          />
        )}
      </div>

      {(onOpenOperationalDetails == null || interactiveOperationalDetail == null) &&
      onOpenDataSample == null ? (
        <GraphNodeOperationalRail metrics={cardModel.operationalMetrics} />
      ) : (
        <GraphNodeOperationalRail
          metrics={cardModel.operationalMetrics}
          ariaLabel={
            interactiveOperationalDetail?.ariaLabel ?? dataSampleInteractionLabel ?? typeLabel
          }
          dataSampleInteractionLabel={dataSampleInteractionLabel}
          onOpenDataSample={onOpenDataSample}
          onOpen={
            onOpenOperationalDetails == null || interactiveOperationalDetail == null
              ? undefined
              : (anchorElement) =>
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
