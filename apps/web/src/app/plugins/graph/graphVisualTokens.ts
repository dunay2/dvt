/** Owned concern: own React Flow graph visual tokens for Canvas and plugin graph rendering. */
import type { CSSProperties } from 'react';

import type { PluginNodeKind } from '../../types/canonical';

export const graphVisualClasses = {
  nodeCard:
    'min-w-[140px] rounded-md border bg-neutral-900 px-3 py-2 text-xs text-neutral-100 transition-opacity',
  fallbackNodeCard:
    'min-w-[140px] rounded-md border-2 border-dashed border-slate-500 bg-slate-900/60 px-3 py-2 text-xs text-slate-400',
  fallbackNodeTitle: 'truncate font-semibold text-slate-300',
  metricText: 'mt-2 flex gap-2 text-[10px] text-slate-300',
  tag: 'rounded bg-neutral-700 px-1 py-0.5 text-[9px] text-neutral-300',
  columnsShell: 'mt-2 border-t border-slate-700 pt-2',
  columnsToggle:
    'flex w-full items-center justify-between text-xs text-slate-300 transition-colors hover:text-white',
  columnRow: 'flex items-center justify-between rounded bg-slate-950 px-2 py-1 text-[10px]',
  columnName: 'truncate font-mono text-white',
  columnType: 'ml-2 shrink-0 text-slate-400',
  inspectorCard: 'border-slate-700 bg-slate-950 p-3 text-slate-50',
  inspectorTitle: 'mb-2 text-sm font-medium text-slate-100',
  inspectorLabel: 'text-slate-400',
  inspectorLabelFixed: 'shrink-0 text-slate-400',
  inspectorBody: 'text-xs text-slate-300',
  inspectorMuted: 'text-sm text-slate-400',
  inspectorMutedBlock: 'space-y-2 text-sm text-slate-400',
  inspectorSubtle: 'text-slate-500',
  inspectorCodeBlock:
    'whitespace-pre-wrap rounded border border-slate-700 bg-slate-900 p-3 font-mono text-xs text-slate-50',
  inspectorCodeText: 'whitespace-pre-wrap font-mono text-xs text-slate-50',
  contextPanelLeftShell: 'flex h-full flex-col border-r border-slate-700 bg-slate-900',
  contextPanelRightShell:
    'flex h-full flex-col border-l border-slate-700 bg-slate-900 text-slate-50',
  contextPanelHeader: 'border-b border-slate-700 px-4 py-3',
  contextPanelHeaderRow: 'flex items-start justify-between border-b border-slate-700 px-4 py-3',
  contextPanelTitle: 'text-sm font-semibold text-slate-50',
  contextPanelSubtitle: 'mt-0.5 text-xs text-slate-300',
  contextPanelHelpText: 'text-[11px] leading-5 text-slate-400',
  contextPanelIconButton: 'size-7 text-slate-300 hover:text-white',
  contextPanelActionButton:
    'h-8 justify-start gap-2 border-slate-600 bg-slate-950/40 px-3 text-xs font-medium text-slate-100 hover:bg-slate-800 hover:text-white',
  contextPanelSection: 'border-b border-slate-700 px-4 py-3',
  contextPanelSectionTitle: 'text-xs font-semibold uppercase text-slate-300',
  contextPanelAccordionItem: 'border-b border-slate-700',
  contextPanelAccordionTrigger: 'px-2 py-2 text-sm hover:bg-slate-950',
  contextPanelInteractiveRow: 'cursor-move hover:bg-slate-950',
  contextPanelReadOnlyRow: 'cursor-default text-slate-300',
  contextPanelSecondaryText: 'text-[10px] text-slate-400',
  contextPanelEmptyText: 'max-w-xs text-center text-sm text-slate-400',
  contextPanelTabsList: 'justify-start rounded-md border border-slate-700 bg-transparent p-1',
  contextPanelTabsTrigger:
    'text-slate-200 data-[state=active]:bg-slate-900 data-[state=active]:text-white',
  inspectorErrorText: 'text-xs text-red-300',
} as const;

export const graphStatusRingClasses: Record<string, string> = {
  running: 'ring-2 ring-blue-400',
  success: 'ring-2 ring-green-500',
  failed: 'ring-2 ring-red-500',
  skipped: 'ring-1 ring-yellow-400 opacity-60',
};

export const graphStatusDotClasses: Record<string, string> = {
  idle: 'bg-gray-500',
  running: 'bg-blue-500 animate-pulse',
  success: 'bg-green-500',
  failed: 'bg-red-500',
  skipped: 'bg-yellow-500',
  warn: 'bg-orange-500',
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
