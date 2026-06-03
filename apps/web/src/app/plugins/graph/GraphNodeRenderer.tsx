/** Owned concern: render generic canonical graph nodes independent of plugin-specific panels. */
import { useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { ChevronDown, ChevronUp, Table } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '../../components/ui/badge';
import { cn } from '../../components/ui/utils';
import { resolveNodeKindRegistration } from '../nodeTypeRegistry';
import type { NodeRendererProps } from '../contracts/NodeRendering';
import {
  graphStatusDotClasses,
  graphStatusRingClasses,
  graphVisualClasses,
} from './graphVisualTokens';

type ColumnMeta = {
  name: string;
  type: string;
  description?: string;
  nullable?: boolean;
};

function buildOverlayProps(
  borderColor?: string,
  backgroundColor?: string
): { style?: CSSProperties } {
  const style: CSSProperties = {};
  if (borderColor) style.borderColor = borderColor;
  if (backgroundColor) style.backgroundColor = backgroundColor;
  return Object.keys(style).length > 0 ? { style } : {};
}

function resolveColumns(
  data: Record<string, unknown>,
  metadata: Record<string, unknown> | undefined
): ColumnMeta[] {
  if (Array.isArray(data.columns)) {
    return data.columns as ColumnMeta[];
  }
  if (Array.isArray(metadata?.columns)) {
    return metadata.columns as ColumnMeta[];
  }
  return [];
}

export function GraphNodeRenderer({
  node,
  selected,
  hovered,
  overlayDecoration,
  data,
}: Readonly<NodeRendererProps>): ReactElement {
  const kindMeta = resolveNodeKindRegistration(node.kind);
  const Icon: LucideIcon | undefined = kindMeta.icon;
  const [columnsExpanded, setColumnsExpanded] = useState(false);

  const statusRing = graphStatusRingClasses[node.status] ?? '';
  const statusDot = graphStatusDotClasses[node.status] ?? graphStatusDotClasses.idle;
  const dimmed = overlayDecoration?.dimmed ?? false;
  const overlayProps = buildOverlayProps(
    overlayDecoration?.borderColor,
    overlayDecoration?.backgroundColor
  );
  const typeLabel =
    typeof data.typeLabel === 'string'
      ? data.typeLabel
      : typeof data.type === 'string'
        ? data.type
        : kindMeta.label;
  const columns = resolveColumns(data, node.metadata);
  const showColumns =
    data.showColumns === true &&
    columns.length > 0 &&
    (kindMeta.supportsColumns || node.role === 'input' || node.role === 'transform');

  return (
    <div
      className={cn(
        graphVisualClasses.nodeCard,
        kindMeta.borderClass,
        selected && 'ring-2 ring-white/40',
        hovered && !selected && 'ring-1 ring-white/20',
        statusRing,
        dimmed && 'opacity-30'
      )}
      {...overlayProps}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Icon
            size={12}
            className="shrink-0 opacity-70"
            style={{ color: kindMeta.minimapColor } as CSSProperties}
          />
          <span className="truncate font-semibold leading-tight">{node.name}</span>
        </div>
        <div className={cn('size-2 shrink-0 rounded-full', statusDot)} />
      </div>

      <div className="mt-2">
        <Badge variant="secondary" className="px-1.5 py-0.5 text-[10px]">
          {typeLabel}
        </Badge>
      </div>

      {(node.lastDuration != null || node.lastCost != null) && (
        <div className={graphVisualClasses.metricText}>
          {node.lastDuration != null && <span>{node.lastDuration}s</span>}
          {node.lastCost != null && <span>${node.lastCost.toFixed(2)}</span>}
        </div>
      )}

      {node.path && <div className="mt-1 truncate text-[10px] opacity-50">{node.path}</div>}

      {node.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-0.5">
          {node.tags.slice(0, 3).map((tag) => (
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
                <div key={`${node.id}:${column.name}`} className={graphVisualClasses.columnRow}>
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
