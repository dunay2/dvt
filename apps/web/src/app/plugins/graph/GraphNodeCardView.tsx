/** Owned concern: render graph-node card markup from an already-projected card model. */
import { type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactElement } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
import { cn } from '../../components/ui/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { GraphNodeColumnSection, type GraphNodeColumn } from './GraphNodeColumnSection';
import type {
  GraphNodeColumnPortDirection,
  GraphNodeColumnPortIdentity,
} from './GraphNodeColumnSection';
import { GraphNodeMetricRow } from './GraphNodeMetricRow';
import { GraphNodeOperationalRail } from './GraphNodeOperationalRail';
import { GraphNodeTagList } from './GraphNodeTagList';
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
  onColumnPortActivate?: (identity: GraphNodeColumnPortIdentity) => void;
  onColumnDisclosureChange?: (nodeId: string, expanded: boolean) => void;
  onColumnLayoutChange?: () => void;
  onAutomapColumns?: (nodeId: string, columns: readonly GraphNodeCardColumn[]) => void;
}>;

function openGovernedNodeActions(event: ReactMouseEvent<HTMLButtonElement>): void {
  event.preventDefault();
  event.stopPropagation();

  const trigger = event.currentTarget;
  const rect = trigger.getBoundingClientRect();
  const MouseEventConstructor =
    trigger.ownerDocument.defaultView?.MouseEvent ?? globalThis.MouseEvent;
  const contextMenuEvent = new MouseEventConstructor('contextmenu', {
    bubbles: true,
    cancelable: true,
    button: 2,
    clientX: Math.max(8, rect.left),
    clientY: Math.max(8, rect.bottom),
  });
  Object.defineProperty(contextMenuEvent, 'dvtNodeActionsRequest', {
    configurable: false,
    enumerable: false,
    value: true,
  });
  trigger.dispatchEvent(contextMenuEvent);
}

function GraphNodeCardTitle({ cardModel }: { cardModel: GraphNodeCardReadModel }): ReactElement {
  const sourceIdentity = cardModel.sourceIdentity;
  if (sourceIdentity == null) {
    return (
      <span
        data-slot="graph-node-card-title"
        className={graphNodeCardLayoutClasses.title}
        title={cardModel.technicalName ?? cardModel.title}
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
  onColumnPortActivate,
  onColumnDisclosureChange,
  onColumnLayoutChange,
  onAutomapColumns,
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
      {...(overlayStyle ? { style: overlayStyle } : {})}
    >
      <div className={graphNodeCardLayoutClasses.body}>
        <div className={graphNodeCardLayoutClasses.header}>
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
          <div className={graphNodeCardLayoutClasses.headerActions}>
            <span data-slot="graph-node-health-description" className="sr-only">
              {cardModel.health.label}
            </span>
            <button
              type="button"
              data-slot="graph-node-card-actions"
              {...canvasNodeEmbeddedControlProps}
              aria-label={cardModel.nodeActionsLabel}
              title={cardModel.nodeActionsLabel}
              onClick={openGovernedNodeActions}
              className={graphNodeCardLayoutClasses.actionsButton}
            >
              <MoreHorizontal className={graphNodeCardLayoutClasses.actionsIcon} />
            </button>
          </div>
        </div>

        <div className={graphNodeCardLayoutClasses.kind}>{cardModel.kindLabel || typeLabel}</div>

        <GraphNodeMetricRow metrics={cardModel.metrics} onOpenCode={onOpenCode} />

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
            nodeId={nodeId}
            portDirections={columnPortDirections}
            activeColumnHandleId={activeColumnHandleId}
            onColumnPortActivate={onColumnPortActivate}
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
    </div>
  );
}
