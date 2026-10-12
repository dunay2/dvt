/** Owned concern: own React Flow graph visual tokens for edges, node kinds, and fallback rendering. */

import type { CSSProperties } from 'react';
import type { PluginNodeKind } from '../../types/canonical';

export const fallbackGraphNodeClasses = {
  card: 'min-w-[140px] rounded-md border-2 border-dashed border-slate-500 bg-slate-900/60 px-3 py-2 text-sm text-slate-400',
  title: 'truncate font-semibold text-slate-300',
  kind: 'mt-0.5 font-mono text-xs uppercase tracking-wide',
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
  closedEdgeDashArray: '8 6',
  closedEdgeOpacity: 0.58,
  gateGlyphRadius: 7,
  gateGlyphStrokeWidth: 2,
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
