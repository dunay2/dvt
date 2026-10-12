/** Card surface, identity and layout presentation. */
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
  headerActions: 'flex shrink-0 items-center justify-end gap-2',
  kind: 'mt-2 text-xs font-medium text-blue-200',
  path: 'mt-1 truncate text-xs text-slate-400',
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

export const graphNodeTagListClasses = {
  root: 'mt-3 flex flex-wrap gap-1.5',
  tag: 'max-w-64 truncate rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-slate-300',
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

export const graphNodeHealthBorderClasses = {
  healthy: 'border-solid border-green-500',
  failed: 'border-dashed border-red-500',
  neutral: 'border-solid border-slate-700',
} as const;
