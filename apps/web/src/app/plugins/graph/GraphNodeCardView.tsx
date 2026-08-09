/** Owned concern: render graph-node card markup from an already-projected card model. */
import { type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactElement } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
import { cn } from '../../components/ui/utils';
import { GraphNodeColumnSection, type GraphNodeColumn } from './GraphNodeColumnSection';
import { GraphNodeMetricRow } from './GraphNodeMetricRow';
import { GraphNodeOperationalRail } from './GraphNodeOperationalRail';
import { GraphNodeStatusChip } from './GraphNodeStatusChip';
import { GraphNodeTagList } from './GraphNodeTagList';
import type { GraphNodeCardPlayAction } from './graphNodeCardActions';
import type {
  GraphNodeCardReadModel,
  GraphNodeOperationalDetail,
} from './graphNodeCardStrategyContracts';
import { graphNodeCardLayoutClasses, graphNodeCardSurfaceClasses } from './graphVisualTokens';

export type GraphNodeCardColumn = GraphNodeColumn;

export type GraphNodeCardViewProps = Readonly<{
  cardModel: GraphNodeCardReadModel;
  typeLabel: string;
  tags: readonly string[];
  columns: readonly GraphNodeCardColumn[];
  showColumns: boolean;
  icon?: LucideIcon;
  borderClass?: string;
  statusRingClass?: string;
  selected: boolean;
  hovered: boolean;
  dimmed: boolean;
  overlayStyle?: CSSProperties;
  /** Compatibility input while callers converge; execution selection is rendered only in the ellipsis menu. */
  playAction?: GraphNodeCardPlayAction | null;
  onOpenOperationalDetails?: (
    detail: GraphNodeOperationalDetail,
    anchorElement: HTMLElement
  ) => void;
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

export function GraphNodeCardView({
  cardModel,
  typeLabel,
  tags,
  columns,
  showColumns,
  icon: Icon,
  borderClass,
  statusRingClass,
  selected,
  hovered,
  dimmed,
  overlayStyle,
  onOpenOperationalDetails,
}: GraphNodeCardViewProps): ReactElement {
  const operationalDetail = cardModel.operationalDetail;
  const interactiveOperationalDetail =
    operationalDetail != null && operationalDetail.rows.length > 0 ? operationalDetail : null;

  return (
    <div
      data-slot="graph-node-card"
      className={cn(
        graphNodeCardSurfaceClasses.root,
        borderClass,
        selected && graphNodeCardSurfaceClasses.selected,
        hovered && !selected && graphNodeCardSurfaceClasses.hovered,
        statusRingClass,
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
            <span
              data-slot="graph-node-card-title"
              className={graphNodeCardLayoutClasses.title}
              title={cardModel.technicalName ?? cardModel.title}
            >
              {cardModel.title}
            </span>
          </div>
          <div className={graphNodeCardLayoutClasses.headerActions}>
            <GraphNodeStatusChip status={cardModel.status} />
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

        <GraphNodeMetricRow metrics={cardModel.metrics} />

        {(cardModel.path ?? cardModel.subtitle) && (
          <div className={graphNodeCardLayoutClasses.path}>
            {cardModel.path ?? cardModel.subtitle}
          </div>
        )}

        <GraphNodeTagList tags={tags} tone={cardModel.accentTone} />

        {showColumns && <GraphNodeColumnSection columns={columns} />}
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
    </div>
  );
}
