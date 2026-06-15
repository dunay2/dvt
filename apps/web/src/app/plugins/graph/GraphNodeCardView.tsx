/** Owned concern: render graph-node card markup from an already-projected card model. */
import { useState, type CSSProperties, type ReactElement } from 'react';
import { ChevronDown, ChevronUp, Table } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '../../components/ui/badge';
import { cn } from '../../components/ui/utils';
import type { GraphNodeCardReadModel } from './graphNodeCardStrategyContracts';
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
}: GraphNodeCardViewProps): ReactElement {
  const [columnsExpanded, setColumnsExpanded] = useState(false);

  return (
    <div
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
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {Icon && (
            <Icon
              size={12}
              className="shrink-0 opacity-70"
              {...(iconColor ? { style: { color: iconColor } as CSSProperties } : {})}
            />
          )}
          <span className="truncate font-semibold leading-tight">{cardModel.title}</span>
        </div>
        <div className={cn('size-2 shrink-0 rounded-full', statusDotClass)} />
      </div>

      <div className="mt-2">
        <Badge variant="secondary" className="px-1.5 py-0.5 text-[10px]">
          {cardModel.kindLabel || typeLabel}
        </Badge>
      </div>

      {cardModel.metrics.length > 0 && (
        <div className={graphVisualClasses.metricText}>
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

      {cardModel.subtitle && (
        <div className="mt-1 truncate text-[10px] opacity-50">{cardModel.subtitle}</div>
      )}

      {tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-0.5">
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
  );
}
