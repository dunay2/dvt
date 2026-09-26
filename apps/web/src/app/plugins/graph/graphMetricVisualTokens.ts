/** Shared metric presentation, with explicit surface-specific variants. */
const metricValueTones = {
  neutral: 'text-slate-200',
  info: 'text-blue-200',
  success: 'text-green-300',
  warning: 'text-amber-200',
  danger: 'text-red-200',
  running: 'text-sky-200',
} as const;
const operationalRail =
  'grid grid-cols-[repeat(auto-fit,minmax(4.75rem,1fr))] border-t border-slate-800/90 bg-slate-900/55';
export const graphNodeMetricRowClasses = {
  root: {
    body: 'mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300',
    header: 'inline-flex shrink-0 items-center gap-1 text-xs text-slate-300',
  },
  item: {
    body: 'inline-flex items-center gap-1',
    header: 'inline-flex min-w-0 items-center px-2 py-1',
  },
  headerTrigger:
    'inline-flex w-full min-w-0 cursor-help items-center justify-center gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300',
  icon: 'inline-flex size-3.5 shrink-0 text-blue-300',
  iconSvg: 'size-3.5',
  label: {
    body: 'text-slate-500',
    header: 'sr-only',
  },
  value: 'min-w-0 truncate font-medium text-slate-200',
  interactiveValue: 'nodrag nopan',
  valueTone: metricValueTones,
} as const;

export const graphNodeMaterializationClasses = {
  trigger:
    'nodrag nopan inline-flex min-w-[5.5rem] cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-default disabled:opacity-60',
  value: 'flex-1 text-left',
  chevron: 'size-3 shrink-0 text-slate-400',
  menu: 'nodrag nopan min-w-28 border-slate-700 bg-slate-950 text-slate-200',
  option: 'cursor-pointer text-xs focus:bg-slate-800 focus:text-slate-100',
} as const;

export const graphNodeOperationalRailClasses = {
  root: operationalRail,
  button: `${operationalRail} nodrag nopan w-full cursor-pointer text-left transition hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400`,
  metric: 'flex min-w-0 items-center gap-2 border-r border-slate-800/80 px-3 py-2 last:border-r-0',
  icon: 'flex size-5 shrink-0 items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/70 text-slate-400',
  iconSvg: 'size-3',
  metricText: 'min-w-0',
  label: 'block truncate text-xs uppercase tracking-wide text-slate-500',
  value: 'mt-0.5 block truncate text-sm font-medium text-slate-200',
  valueTone: metricValueTones,
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
    ...metricValueTones,
    neutral: 'text-slate-100',
  },
} as const;
