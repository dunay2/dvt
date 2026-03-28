import React from 'react';

import type { LucideIcon } from 'lucide-react';
import { cn } from '../../components/ui/utils';
import type { NodeRendererProps } from '../contracts/NodeRendering';
import { DBT_NODE_KINDS } from '../nodeTypeCatalog.dbt';

// ---------------------------------------------------------------------------
// DbtNodeRenderer
//
// Plugin-system renderer for all dbt:* node kinds. Takes NodeRendererProps
// (canonical node data) — does NOT depend on ReactFlow internals.
// Handles are the shell's (ReactFlow's) responsibility.
// ---------------------------------------------------------------------------

const STATUS_RING: Record<string, string> = {
  running: 'ring-2 ring-blue-400',
  success: 'ring-2 ring-green-500',
  failed: 'ring-2 ring-red-500',
  skipped: 'ring-1 ring-yellow-400 opacity-60',
};

const OVERLAY_BORDER: Record<string, string> = {
  // overlay borderColor is a CSS hex/named color — applied inline
};

function resolveKindMeta(kind: string) {
  return DBT_NODE_KINDS.find((k) => k.kind === kind);
}

export function DbtNodeRenderer({
  node,
  selected,
  hovered,
  overlayDecoration,
}: Readonly<NodeRendererProps>): React.ReactElement {
  const meta = resolveKindMeta(node.kind);
  const Icon: LucideIcon | undefined = meta?.icon;

  const statusRing = STATUS_RING[node.status] ?? '';
  const dimmed = overlayDecoration?.dimmed ?? false;

  return (
    <div
      className={cn(
        'min-w-[140px] rounded-md border bg-neutral-900 px-3 py-2 text-xs text-neutral-100 transition-opacity',
        meta?.borderClass ?? 'border-neutral-600',
        selected && 'ring-2 ring-white/40',
        hovered && !selected && 'ring-1 ring-white/20',
        statusRing,
        dimmed && 'opacity-30'
      )}
      style={
        overlayDecoration?.borderColor
          ? { borderColor: overlayDecoration.borderColor }
          : overlayDecoration?.backgroundColor
            ? { backgroundColor: overlayDecoration.backgroundColor }
            : undefined
      }
    >
      <div className="flex items-center gap-1.5">
        {Icon && (
          <Icon
            size={12}
            className="shrink-0 opacity-70"
            style={meta?.minimapColor ? { color: meta.minimapColor } : undefined}
          />
        )}
        <span className="truncate font-semibold leading-tight">{node.name}</span>
      </div>

      {node.path && <div className="mt-0.5 truncate text-[10px] opacity-50">{node.path}</div>}

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
    </div>
  );
}
