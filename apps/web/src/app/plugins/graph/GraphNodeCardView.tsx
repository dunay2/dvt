/** Owned concern: render graph-node card markup from an already-projected card model. */
import { useState, type CSSProperties, type ReactElement } from 'react';
import { ChevronDown, ChevronUp, Play, Table } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '../../components/ui/utils';
import { GraphNodeMetricRow } from './GraphNodeMetricRow';
import { GraphNodeOperationalRail } from './GraphNodeOperationalRail';
import { GraphNodeStatusChip } from './GraphNodeStatusChip';
import { GraphNodeTagList } from './GraphNodeTagList';
import type { GraphNodeCardPlayAction } from './graphNodeCardActions';
import type {
  GraphNodeCardReadModel,
  GraphNodeOperationalDetail,
} from './graphNodeCardStrategyContracts';
import {
  graphNodeCardLayoutClasses,
  graphNodeCardSurfaceClasses,
  graphNodeColumnClasses,
} from './graphVisualTokens';

export type GraphNodeCardColumn = Readonly<{
  name: string;
  type: string;
}>;

export type GraphNodeCardViewProps = Readonly<{
  cardModel: GraphNodeCardReadModel;
  typeLabel: string;
  tags: readonly string[];
  columns: readonly GraphNodeCardColumn[];
  showColumns: boolean;
  icon?: LucideIcon;
  iconColor?: string;
  borderClass?: string;
  statusRingClass?: string;
  selected: boolean;
  hovered: boolean;
  dimmed: boolean;
  overlayStyle?: CSSProperties;
  playAction?: GraphNodeCardPlayAction | null;
  onOpenOperationalDetails?: (detail: GraphNodeOperationalDetail, anchorRect: DOMRect) => void;
}>;

export function GraphNodeCardView({
  cardModel,
  typeLabel,
  tags,
  columns,
  showColumns,
  icon: Icon,
  iconColor,
  borderClass,
  statusRingClass,
  selected,
  hovered,
  dimmed,
  overlayStyle,
  playAction,
  onOpenOperationalDetails,
}: GraphNodeCardViewProps): ReactElement {
  const [columnsExpanded, setColumnsExpanded] = useState(false);
  const operationalDetail = cardModel.operationalDetail;

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
                className={graphNodeCardLayoutClasses.icon}
                {...(iconColor ? { style: { color: iconColor } as CSSProperties } : {})}
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
            {playAction ? (
              <button
                type="button"
                aria-label={playAction.label}
                title={playAction.label}
                disabled={playAction.disabled}
                onClick={(event) => {
                  event.stopPropagation();
                  playAction.onPress();
                }}
                className={graphNodeCardLayoutClasses.playButton}
              >
                <Play className={graphNodeCardLayoutClasses.playIcon} />
              </button>
            ) : null}
          </div>
        </div>

        <div className={graphNodeCardLayoutClasses.kind}>{cardModel.kindLabel || typeLabel}</div>

        <GraphNodeMetricRow metrics={cardModel.metrics} />

        {(cardModel.path ?? cardModel.subtitle) && (
          <div className={graphNodeCardLayoutClasses.path}>
            {cardModel.path ?? cardModel.subtitle}
          </div>
        )}

        <GraphNodeTagList tags={tags} />

        {showColumns && (
          <div className={graphNodeColumnClasses.shell}>
            <button
              type="button"
              onClick={() => setColumnsExpanded((value) => !value)}
              className={graphNodeColumnClasses.toggle}
            >
              <span className={graphNodeColumnClasses.toggleLabel}>
                <Table className={graphNodeColumnClasses.toggleIcon} />
                Columns ({columns.length})
              </span>
              {columnsExpanded ? (
                <ChevronUp className={graphNodeColumnClasses.toggleIcon} />
              ) : (
                <ChevronDown className={graphNodeColumnClasses.toggleIcon} />
              )}
            </button>

            {columnsExpanded && (
              <div className={graphNodeColumnClasses.list}>
                {columns.map((column) => (
                  <div key={column.name} className={graphNodeColumnClasses.row}>
                    <span className={graphNodeColumnClasses.name}>{column.name}</span>
                    <span className={graphNodeColumnClasses.type}>{column.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <GraphNodeOperationalRail
        metrics={cardModel.operationalMetrics}
        ariaLabel={operationalDetail?.ariaLabel}
        onOpen={
          onOpenOperationalDetails == null || operationalDetail == null
            ? undefined
            : (anchorRect) => onOpenOperationalDetails(operationalDetail, anchorRect)
        }
      />
    </div>
  );
}
