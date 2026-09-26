/** Owned concern: graphColumnVisualTokens. */

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
  expressionComposerAnchor:
    'pointer-events-none absolute left-1/2 top-1/2 size-px border-0 bg-transparent p-0 opacity-0',
  expressionComposer: 'nodrag nopan w-80 border-slate-700 bg-slate-950 p-3 text-slate-100',
  expressionComposerFields: 'space-y-3',
  expressionComposerTitle: 'text-sm font-semibold text-slate-50',
  expressionComposerLabel: 'grid gap-1 text-xs font-medium text-slate-300',
  expressionComposerControl:
    'h-8 min-w-0 w-full rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400',
  expressionComposerOperands: 'space-y-1.5',
  expressionComposerLegend: 'mb-1 text-xs font-medium text-slate-300',
  expressionComposerOperand: 'grid grid-cols-[minmax(0,1fr)_1.75rem_1.75rem_1.75rem] gap-1',
  expressionComposerIconButton:
    'inline-flex size-7 items-center justify-center rounded border border-slate-700 text-slate-300 hover:border-blue-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-35',
  expressionComposerAddOperand:
    'inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-35',
  expressionComposerPreview:
    'grid gap-1 rounded border border-slate-800 bg-slate-900/70 p-2 text-[11px] text-slate-400 [&_code]:break-all [&_code]:text-slate-100',
  expressionComposerError: 'text-xs text-red-300',
  expressionComposerActions: 'flex justify-end gap-2',
  expressionComposerCancel:
    'rounded px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white',
  expressionComposerSubmit:
    'rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40',
  piece:
    'nodrag nopan flex min-h-8 w-full flex-wrap items-center gap-2 rounded-md border border-slate-700/90 bg-slate-950/90 px-3 py-1.5 text-xs shadow-sm transition hover:border-blue-400/70 hover:bg-slate-900 focus-visible:border-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70',
  name: 'truncate font-mono text-white',
  sourceName: 'truncate font-mono text-slate-400',
  aliasArrow: 'shrink-0 text-blue-300',
  metadata: 'ml-auto flex shrink-0 items-center gap-1.5',
  type: 'rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300',
  constraint:
    'rounded border border-slate-600 px-1 py-0.5 text-[9px] font-semibold tracking-wide text-slate-200',
  outputState:
    'nodrag nopan flex size-4 shrink-0 cursor-pointer items-center justify-center rounded border border-slate-600 bg-transparent p-0 text-emerald-300 transition hover:border-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 aria-disabled:cursor-default aria-disabled:hover:border-slate-600',
  outputCheck: 'size-3',
  tooltip:
    'w-auto max-w-72 break-words border border-slate-700 bg-slate-950 px-2 py-1 text-xs font-medium text-slate-100 shadow-xl shadow-slate-950/40',
  remainderToggle:
    'nodrag nopan mt-2 w-full cursor-pointer rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-left text-xs font-medium text-blue-200 transition hover:border-blue-400/60 hover:bg-slate-800 hover:text-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
  automap:
    'nodrag nopan mt-2 w-full cursor-pointer rounded border border-purple-500/50 bg-purple-500/10 px-2 py-1.5 text-left text-xs font-semibold text-purple-100 transition hover:border-purple-400 hover:bg-purple-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400',
  addGap: 'group/add nodrag nopan relative flex h-7 items-center justify-center',
  addTrigger:
    'flex size-5 translate-y-0.5 cursor-pointer items-center justify-center rounded-full border border-blue-400/70 bg-slate-950 text-blue-200 opacity-0 shadow transition-[opacity,transform,background-color] hover:scale-110 hover:bg-blue-500/20 group-hover/add:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300',
  addIcon: 'size-3',
  addForm: 'nodrag nopan w-72 border-slate-700 bg-slate-950 p-3 text-slate-100',
  addFormFields: 'space-y-3',
  addLabel: 'grid gap-1 text-xs font-medium text-slate-300',
  addControl:
    'h-8 w-full rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400',
  addActions: 'flex justify-end gap-2 pt-1',
  addCancel: 'rounded px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white',
  addSubmit: 'rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-500',
} as const;
