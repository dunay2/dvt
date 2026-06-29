/** Owned concern: render graph-node card markup from an already-projected card model. */
import { useState, type CSSProperties, type ReactElement } from 'react';
import { ChevronDown, ChevronUp, Play, Table } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '../../components/ui/utils';
import type { GraphNodeCardPlayAction } from './graphNodeCardActions';
import type { GraphNodeCardReadModel } from './graphNodeCardStrategyContracts';
import { graphNodeStatusChipClasses, graphVisualClasses } from './graphVisualTokens';

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
}: GraphNodeCardViewProps): ReactElement {
  const [columnsExpanded, setColumnsExpanded] = useState(false);

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
            <span
              className={cn(
                graphVisualClasses.nodeCardStatus,
                graphNodeStatusChipClasses[cardModel.status.tone]
              )}
            >
              {cardModel.status.label}
            </span>
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

        {cardModel.metrics.length > 0 && (
          <div className={graphVisualClasses.nodeCardMetricRow}>
            {cardModel.metrics.map((metric) => (
              <span key={metric.id} className="inline-flex items-baseline gap-1">
                <span className="text-slate-500">{metric.label}</span>
                <span title={metric.label} className="font-medium text-slate-200">
                  {metric.value}
                </span>
              </span>
            ))}
          </div>
        )}

        {(cardModel.path ?? cardModel.subtitle) && (
          <div className={graphVisualClasses.nodeCardPath}>
            {cardModel.path ?? cardModel.subtitle}
          </div>
        )}

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className={graphVisualClasses.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}

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

      {cardModel.operationalMetrics.length > 0 && (
        <div className={graphVisualClasses.nodeCardOperationalRail}>
          {cardModel.operationalMetrics.map((metric) => (
            <div key={metric.id} className={graphVisualClasses.nodeCardOperationalMetric}>
              <span className={graphVisualClasses.nodeCardOperationalLabel}>{metric.label}</span>
              <span className={graphVisualClasses.nodeCardOperationalValue}>{metric.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
