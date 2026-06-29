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
import { graphVisualClasses } from './graphVisualTokens';

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
  statusDotClass?: string;
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
  statusDotClass,
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
        graphVisualClasses.nodeCard,
        borderClass,
        selected && 'ring-2 ring-white/40',
        hovered && !selected && 'ring-1 ring-white/20',
        statusRingClass,
        dimmed && 'opacity-30'
      )}
      {...(overlayStyle ? { style: overlayStyle } : {})}
    >
      <div className={graphVisualClasses.nodeCardBody}>
        <div className={graphVisualClasses.nodeCardHeader}>
          <div className={graphVisualClasses.nodeCardTitleRow}>
            {Icon && (
              <Icon
                size={18}
                className="shrink-0 opacity-80"
                {...(iconColor ? { style: { color: iconColor } as CSSProperties } : {})}
              />
            )}
            <span className={graphVisualClasses.nodeCardTitle}>{cardModel.title}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <GraphNodeStatusChip status={cardModel.status} />
            <div className={cn('size-2 rounded-full', statusDotClass)} />
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
                className={graphVisualClasses.nodeCardPlayButton}
              >
                <Play className="size-3.5 fill-current" />
              </button>
            ) : null}
          </div>
        </div>

        <div className={graphVisualClasses.nodeCardKind}>{cardModel.kindLabel || typeLabel}</div>

        <GraphNodeMetricRow metrics={cardModel.metrics} />

        {(cardModel.path ?? cardModel.subtitle) && (
          <div className={graphVisualClasses.nodeCardPath}>
            {cardModel.path ?? cardModel.subtitle}
          </div>
        )}

        <GraphNodeTagList tags={tags} />

        {showColumns && (
          <div className={graphVisualClasses.columnsShell}>
            <button
              type="button"
              onClick={() => setColumnsExpanded((value) => !value)}
              className={graphVisualClasses.columnsToggle}
            >
              <span className="flex items-center gap-1">
                <Table className="size-3" />
                Columns ({columns.length})
              </span>
              {columnsExpanded ? (
                <ChevronUp className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
            </button>

            {columnsExpanded && (
              <div className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                {columns.map((column) => (
                  <div key={column.name} className={graphVisualClasses.columnRow}>
                    <span className={graphVisualClasses.columnName}>{column.name}</span>
                    <span className={graphVisualClasses.columnType}>{column.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <GraphNodeOperationalRail
        metrics={cardModel.operationalMetrics}
        onOpen={
          onOpenOperationalDetails == null || operationalDetail == null
            ? undefined
            : (anchorRect) => onOpenOperationalDetails(operationalDetail, anchorRect)
        }
      />
    </div>
  );
}
