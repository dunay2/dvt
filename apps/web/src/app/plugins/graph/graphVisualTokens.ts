/** Owned concern: own React Flow graph visual tokens for Canvas and plugin graph rendering. */
import type { CSSProperties } from 'react';

import type { PluginNodeKind } from '../../types/canonical';

export const graphNodeCardSurfaceClasses = {
  root: 'group relative w-[24rem] min-w-[24rem] max-w-[24rem] overflow-hidden rounded-md border bg-slate-950/95 text-sm text-slate-100 shadow-xl shadow-slate-950/30 transition-[border-color,opacity] focus-within:ring-2 focus-within:ring-white/40',
  selected: 'ring-2 ring-white/40',
  hovered: 'ring-1 ring-white/20',
  dimmed: 'opacity-30',
  overlayBorder:
    'pointer-events-none absolute inset-0 z-10 rounded-[inherit] border-2 border-solid',
} as const;

export const graphNodeCardLayoutClasses = {
  body: 'px-4 pb-3 pt-3',
  header: 'flex items-start justify-between gap-3',
  titleRow: 'flex min-w-0 flex-1 items-center gap-2',
  icon: 'shrink-0 opacity-80',
  title: 'truncate text-sm font-semibold leading-tight text-slate-50',
  sourceIdentityTrigger:
    'min-w-0 cursor-help rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300',
  headerActions: 'flex shrink-0 items-center gap-2',
  kind: 'mt-2 text-xs font-medium text-blue-200',
  path: 'mt-1 truncate text-xs text-slate-400',
  actionsButton:
    'nodrag inline-flex size-6 cursor-pointer items-center justify-center rounded-full border border-slate-700/70 bg-slate-900/80 text-slate-400 transition hover:border-slate-500 hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300',
  actionsIcon: 'size-4',
  iconTone: {
    source: 'text-purple-300',
    model: 'text-blue-300',
    test: 'text-red-300',
    output: 'text-pink-300',
    control: 'text-slate-300',
    unknown: 'text-slate-400',
  },
} as const;

export const graphNodeSourceIdentityTooltipClasses = {
  root: 'w-64 border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 shadow-xl',
  rows: 'space-y-1.5',
  row: 'grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3',
  label: 'text-slate-400',
  value: 'min-w-0 break-all text-right font-medium text-slate-100',
} as const;

export const graphNodeMetricRowClasses = {
  root: {
    body: 'mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300',
    header:
      'flex shrink-0 items-center rounded border border-blue-400/40 bg-blue-950/45 px-2 py-1 text-[11px] text-slate-300',
  },
  item: 'inline-flex items-center gap-1',
  icon: 'inline-flex shrink-0 text-blue-300',
  iconSvg: 'size-3.5',
  label: 'text-slate-500',
  value: 'font-medium text-slate-200',
  interactiveValue: 'nodrag nopan',
  valueTone: {
    neutral: 'text-slate-200',
    info: 'text-blue-200',
    success: 'text-green-300',
    warning: 'text-amber-200',
    danger: 'text-red-200',
    running: 'text-sky-200',
  },
} as const;

export const graphNodeTagListClasses = {
  root: 'mt-3 flex flex-wrap gap-1.5',
  tag: 'rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-slate-300',
  interactiveTag:
    'nodrag nopan cursor-pointer transition hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
  tone: {
    source: 'border-purple-300/55 bg-purple-500/10 text-purple-100',
    model: 'border-blue-400/35 bg-blue-500/10 text-blue-200',
    test: 'border-red-400/35 bg-red-500/10 text-red-200',
    output: 'border-pink-400/35 bg-pink-500/10 text-pink-200',
    control: 'border-slate-500/45 bg-slate-800/70 text-slate-200',
    unknown: 'border-slate-700 bg-slate-900 text-slate-300',
  },
} as const;

export const graphNodeOperationalRailClasses = {
  root: 'grid grid-cols-[repeat(auto-fit,minmax(4.75rem,1fr))] border-t border-slate-800/90 bg-slate-900/55',
  button:
    'nodrag nopan grid w-full cursor-pointer grid-cols-[repeat(auto-fit,minmax(4.75rem,1fr))] border-t border-slate-800/90 bg-slate-900/55 text-left transition hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
  metric: 'flex min-w-0 items-center gap-2 border-r border-slate-800/80 px-3 py-2 last:border-r-0',
  icon: 'flex size-5 shrink-0 items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/70 text-slate-400',
  iconSvg: 'size-3',
  metricText: 'min-w-0',
  label: 'block truncate text-xs uppercase tracking-wide text-slate-500',
  value: 'mt-0.5 block truncate text-sm font-medium text-slate-200',
  valueTone: {
    neutral: 'text-slate-200',
    info: 'text-blue-200',
    success: 'text-green-300',
    warning: 'text-amber-200',
    danger: 'text-red-200',
    running: 'text-sky-200',
  },
  accessibleDescription: 'sr-only',
} as const;

export const graphNodeHealthPopoverClasses = {
  root: 'absolute z-40 w-72 rounded-md border border-slate-700 bg-slate-950/95 p-3 text-xs text-slate-100 shadow-2xl shadow-slate-950/40 outline-none',
  title: 'text-sm font-semibold text-slate-50',
  rows: 'mt-3 space-y-2',
  row: 'grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1',
  label: 'text-slate-400',
  value: 'text-right font-medium text-slate-100',
  detail: 'col-span-2 text-[11px] leading-4 text-slate-500',
  valueTone: {
    neutral: 'text-slate-100',
    info: 'text-blue-200',
    success: 'text-green-300',
    warning: 'text-amber-200',
    danger: 'text-red-200',
    running: 'text-sky-200',
  },
} as const;

export const fallbackGraphNodeClasses = {
  card: 'min-w-[140px] rounded-md border-2 border-dashed border-slate-500 bg-slate-900/60 px-3 py-2 text-sm text-slate-400',
  title: 'truncate font-semibold text-slate-300',
  kind: 'mt-0.5 font-mono text-xs uppercase tracking-wide',
} as const;

export const graphNodeColumnClasses = {
  shell: 'mt-2 border-t border-slate-700 pt-2',
  toggle:
    'flex w-full items-center justify-between text-xs text-slate-300 transition-colors hover:text-white',
  toggleLabel: 'flex items-center gap-1',
  toggleIcon: 'size-3',
  disclosure: 'mt-2',
  list: 'space-y-1.5',
  row: 'relative px-1 before:pointer-events-none before:absolute before:inset-x-2 before:z-10 before:h-0.5 before:rounded before:bg-blue-400 before:opacity-0 after:pointer-events-none after:absolute after:inset-1 after:z-10 after:rounded-md after:border-2 after:border-purple-400 after:bg-purple-500/10 after:opacity-0 data-[drop-placement=before]:before:top-[-0.25rem] data-[drop-placement=after]:before:bottom-[-0.25rem] data-[drop-placement=before]:before:opacity-100 data-[drop-placement=after]:before:opacity-100 data-[drop-placement=compose]:cursor-copy data-[drop-placement=compose]:after:animate-pulse data-[drop-placement=compose]:after:opacity-100',
  keyboardMenuAnchor:
    'pointer-events-none absolute left-1/2 top-1/2 size-px border-0 bg-transparent p-0 opacity-0',
  compositionMenuAnchor:
    'pointer-events-none absolute left-1/2 top-1/2 size-px border-0 bg-transparent p-0 opacity-0',
  piece:
    'nodrag nopan flex min-h-8 w-full items-center gap-2 rounded-md border border-slate-700/90 bg-slate-950/90 px-3 py-1.5 text-xs shadow-sm transition hover:border-blue-400/70 hover:bg-slate-900 focus-visible:border-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70',
  name: 'truncate font-mono text-white',
  metadata: 'ml-auto flex shrink-0 items-center gap-1.5',
  type: 'rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300',
  constraint:
    'rounded border border-slate-600 px-1 py-0.5 text-[9px] font-semibold tracking-wide text-slate-200',
  outputState:
    'nodrag nopan flex size-4 shrink-0 cursor-pointer items-center justify-center rounded border border-slate-600 bg-transparent p-0 text-emerald-300 transition hover:border-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-default disabled:hover:border-slate-600',
  outputCheck: 'size-3',
  tooltip:
    'w-72 border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 shadow-xl shadow-slate-950/40',
  tooltipRows: 'space-y-1.5',
  tooltipRow: 'grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2',
  tooltipLabel: 'text-slate-400',
  tooltipValue: 'break-words font-medium text-slate-100',
  remainderToggle:
    'nodrag nopan mt-2 w-full cursor-pointer rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-left text-xs font-medium text-blue-200 transition hover:border-blue-400/60 hover:bg-slate-800 hover:text-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
  automap:
    'nodrag nopan mt-2 w-full cursor-pointer rounded border border-purple-500/50 bg-purple-500/10 px-2 py-1.5 text-left text-xs font-semibold text-purple-100 transition hover:border-purple-400 hover:bg-purple-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400',
} as const;

export const graphNodeHealthBorderClasses = {
  healthy: 'border-solid border-green-500',
  failed: 'border-dashed border-red-500',
  neutral: 'border-solid border-slate-700',
} as const;

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
  'dvt:object_file_load': graphNodeKindToneClasses.input,
  'dvt:transform': graphNodeKindToneClasses.transform,
  'dvt:sink': graphNodeKindToneClasses.output,
  'dvt:unknown': graphNodeKindToneClasses.control,
};

export const graphFlowPalette = {
  edgeStroke: '#cbd5e1',
  edgeStrokeWidth: 2.5,
  edgeInteractionWidth: 18,
  directionCueTargetClearance: 2,
  directionCueLength: 12,
  directionCueHalfWidth: 5,
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
