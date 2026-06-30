/** Owned concern: own React Flow graph visual tokens for Canvas and plugin graph rendering. */
import type { CSSProperties } from 'react';

import type { PluginNodeKind } from '../../types/canonical';

export const graphVisualClasses = {
  nodeCard:
    'min-w-[220px] overflow-hidden rounded-md border bg-slate-950/95 text-xs text-slate-100 shadow-xl shadow-slate-950/30 transition-opacity',
  nodeCardSelected: 'ring-2 ring-white/40',
  nodeCardHovered: 'ring-1 ring-white/20',
  nodeCardDimmed: 'opacity-30',
  nodeCardBody: 'px-4 pb-3 pt-3',
  nodeCardHeader: 'flex items-start justify-between gap-3',
  nodeCardTitleRow: 'flex min-w-0 flex-1 items-center gap-2',
  nodeCardIcon: 'shrink-0 opacity-80',
  nodeCardTitle: 'truncate text-sm font-semibold leading-tight text-slate-50',
  nodeCardHeaderActions: 'flex shrink-0 items-center gap-2',
  nodeCardKind: 'mt-2 text-xs font-medium text-blue-300',
  nodeCardPath: 'mt-1 truncate text-[11px] text-slate-500',
  nodeCardStatus: 'rounded-full border px-2 py-0.5 text-[10px] font-medium',
  nodeCardPlayButton:
    'nodrag inline-flex size-6 cursor-pointer items-center justify-center rounded-full border border-green-400/30 bg-green-500/15 text-green-300 transition hover:border-green-300/70 hover:bg-green-500/25 hover:text-green-100 disabled:cursor-not-allowed disabled:opacity-40',
  nodeCardPlayIcon: 'size-3.5 fill-current',
  nodeCardMetricRow: 'mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-300',
  nodeCardMetricItem: 'inline-flex items-baseline gap-1',
  nodeCardMetricLabel: 'text-slate-500',
  nodeCardMetricValue: 'font-medium text-slate-200',
  nodeCardTagList: 'mt-3 flex flex-wrap gap-1.5',
  nodeCardOperationalRail:
    'grid grid-cols-[repeat(auto-fit,minmax(4.75rem,1fr))] border-t border-slate-800/90 bg-slate-900/55',
  nodeCardOperationalRailButton:
    'nodrag nopan grid w-full cursor-pointer grid-cols-[repeat(auto-fit,minmax(4.75rem,1fr))] border-t border-slate-800/90 bg-slate-900/55 text-left transition hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
  nodeCardOperationalMetric: 'min-w-0 border-r border-slate-800/80 px-3 py-2 last:border-r-0',
  nodeCardOperationalLabel: 'block truncate text-[9px] uppercase tracking-wide text-slate-500',
  nodeCardOperationalValue: 'mt-0.5 block truncate text-[11px] font-medium text-slate-200',
  nodeHealthPopover:
    'absolute z-40 w-72 rounded-md border border-slate-700 bg-slate-950/95 p-3 text-xs text-slate-100 shadow-2xl shadow-slate-950/40 outline-none',
  nodeHealthPopoverTitle: 'text-sm font-semibold text-slate-50',
  nodeHealthPopoverRows: 'mt-3 space-y-2',
  nodeHealthPopoverRow: 'flex items-center justify-between gap-4',
  nodeHealthPopoverLabel: 'text-slate-400',
  nodeHealthPopoverValue: 'text-right font-medium text-slate-100',
  fallbackNodeCard:
    'min-w-[140px] rounded-md border-2 border-dashed border-slate-500 bg-slate-900/60 px-3 py-2 text-xs text-slate-400',
  fallbackNodeTitle: 'truncate font-semibold text-slate-300',
  metricText: 'mt-2 flex gap-2 text-[10px] text-slate-300',
  tag: 'rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300',
  columnsShell: 'mt-2 border-t border-slate-700 pt-2',
  columnsToggle:
    'flex w-full items-center justify-between text-xs text-slate-300 transition-colors hover:text-white',
  columnsToggleLabel: 'flex items-center gap-1',
  columnsToggleIcon: 'size-3',
  columnsList: 'mt-2 max-h-32 space-y-1 overflow-y-auto',
  columnRow: 'flex items-center justify-between rounded bg-slate-950 px-2 py-1 text-[10px]',
  columnName: 'truncate font-mono text-white',
  columnType: 'ml-2 shrink-0 text-slate-400',
} as const;

export const graphNodeStatusChipClasses = {
  neutral: 'border-slate-500/50 bg-slate-800/70 text-slate-200',
  info: 'border-blue-400/40 bg-blue-500/15 text-blue-200',
  success: 'border-green-400/40 bg-green-500/15 text-green-300',
  warning: 'border-amber-400/40 bg-amber-500/15 text-amber-200',
  danger: 'border-red-400/50 bg-red-500/15 text-red-200',
} as const;

export const graphStatusRingClasses: Record<string, string> = {
  running: 'ring-2 ring-blue-400',
  success: 'ring-2 ring-green-500',
  failed: 'ring-2 ring-red-500',
  skipped: 'ring-1 ring-yellow-400 opacity-60',
};

export const graphStatusBadgeClasses: Record<string, string> = {
  idle: 'border-gray-500/80 bg-gray-900/60 text-slate-100',
  running: 'border-blue-500/80 bg-blue-950/60 text-blue-200',
  success: 'border-green-500/80 bg-green-950/60 text-green-200',
  failed: 'border-red-500/80 bg-red-950/60 text-red-200',
  skipped: 'border-yellow-500/80 bg-yellow-950/60 text-yellow-200',
};

type GraphNodeKindTone = Readonly<{
  borderClass: string;
  minimapColor: string;
}>;

export const graphNodeKindToneClasses: Record<string, GraphNodeKindTone> = {
  input: { borderClass: 'border-purple-500', minimapColor: '#a855f7' },
  transform: { borderClass: 'border-blue-500', minimapColor: '#3b82f6' },
  seed: { borderClass: 'border-green-500', minimapColor: '#22c55e' },
  snapshot: { borderClass: 'border-yellow-500', minimapColor: '#eab308' },
  check: { borderClass: 'border-red-500', minimapColor: '#ef4444' },
  output: { borderClass: 'border-pink-500', minimapColor: '#ec4899' },
  metric: { borderClass: 'border-orange-500', minimapColor: '#f97316' },
  control: { borderClass: 'border-slate-500', minimapColor: '#64748b' },
};

const graphNodeKindToneByKind: Partial<Record<PluginNodeKind, GraphNodeKindTone>> = {
  'dbt:source': graphNodeKindToneClasses.input,
  'dbt:model': graphNodeKindToneClasses.transform,
  'dbt:seed': graphNodeKindToneClasses.seed,
  'dbt:snapshot': graphNodeKindToneClasses.snapshot,
  'dbt:test': graphNodeKindToneClasses.check,
  'dbt:exposure': graphNodeKindToneClasses.output,
  'dbt:metric': graphNodeKindToneClasses.metric,
  'dbt:macro': graphNodeKindToneClasses.control,
  'dvt:source': graphNodeKindToneClasses.input,
  'dvt:sql_transform': graphNodeKindToneClasses.transform,
  'dvt:sink': graphNodeKindToneClasses.output,
  'dvt:unknown': graphNodeKindToneClasses.control,
};

export const graphFlowPalette = {
  edgeStroke: '#6b7280',
  edgeStrokeWidth: 2,
  edgeMarkerWidth: 20,
  edgeMarkerHeight: 20,
} as const;

export function resolveGraphNodeKindTone(kind: PluginNodeKind): GraphNodeKindTone {
  const fallbackTone = graphNodeKindToneClasses.control;
  if (!fallbackTone) {
    throw new Error('Missing graph control tone.');
  }
  return graphNodeKindToneByKind[kind] ?? fallbackTone;
}

export function createGraphFlowEdgeStyle(): CSSProperties {
  return {
    stroke: graphFlowPalette.edgeStroke,
    strokeWidth: graphFlowPalette.edgeStrokeWidth,
  };
}
