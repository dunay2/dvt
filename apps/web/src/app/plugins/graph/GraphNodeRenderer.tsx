/** Owned concern: render generic canonical graph nodes independent of plugin-specific panels. */
import { useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { ChevronDown, ChevronUp, Table } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '../../components/ui/badge';
import { cn } from '../../components/ui/utils';
import { resolveNodeKindRegistration } from '../nodeTypeRegistry';
import type { NodeRendererProps } from '../contracts/NodeRendering';

const STATUS_RING: Record<string, string> = {
  running: 'ring-2 ring-blue-400',
  success: 'ring-2 ring-green-500',
  failed: 'ring-2 ring-red-500',
  skipped: 'ring-1 ring-yellow-400 opacity-60',
};

const STATUS_DOT: Record<string, string> = {
  idle: 'bg-gray-500',
  running: 'bg-blue-500 animate-pulse',
  success: 'bg-green-500',
  failed: 'bg-red-500',
  skipped: 'bg-yellow-500',
  warn: 'bg-orange-500',
};

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

  const statusRing = STATUS_RING[node.status] ?? '';
  const statusDot = STATUS_DOT[node.status] ?? STATUS_DOT.idle;
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
        'min-w-[140px] rounded-md border bg-neutral-900 px-3 py-2 text-xs text-neutral-100 transition-opacity',
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
        <div className="mt-2 flex gap-2 text-[10px] text-slate-300">
          {node.lastDuration != null && <span>{node.lastDuration}s</span>}
          {node.lastCost != null && <span>${node.lastCost.toFixed(2)}</span>}
        </div>
      )}

      {node.path && <div className="mt-1 truncate text-[10px] opacity-50">{node.path}</div>}

      {node.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-0.5">
          {node.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-neutral-700 px-1 py-0.5 text-[9px] text-neutral-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {showColumns && (
        <div className="mt-2 border-t border-slate-700 pt-2">
          <button
            type="button"
            onClick={() => setColumnsExpanded((value) => !value)}
            className="flex w-full items-center justify-between text-xs text-slate-300 transition-colors hover:text-white"
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
                <div
                  key={`${node.id}:${column.name}`}
                  className="flex items-center justify-between rounded bg-slate-950 px-2 py-1 text-[10px]"
                >
                  <span className="truncate font-mono text-white">{column.name}</span>
                  <span className="ml-2 shrink-0 text-slate-400">{column.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
