/** Owned concern: graphColumnVisualTokens. */

export const graphNodeColumnClasses = {
  views: 'mt-2 gap-0',
  outputStatus:
    'nodrag nopan px-3 py-2 text-[length:var(--text-meta)] leading-(--text-meta-line-height) text-(--text-subtle) data-[state=unavailable]:text-(--status-danger)',
  viewList:
    'nodrag nopan h-7 w-full justify-start rounded-none border-b border-(--border-default) bg-transparent p-0',
  viewTrigger:
    'flex-none rounded-none border-0 border-b-2 border-transparent px-3 py-1 text-[length:var(--text-meta)] leading-(--text-meta-line-height) data-[state=active]:border-(--primary) data-[state=active]:bg-transparent data-[state=active]:shadow-none',
  shell: 'mt-2 border-t border-(--border-default) pt-2',
  toggle:
    'flex w-full items-center justify-between text-[length:var(--text-meta)] leading-(--text-meta-line-height) text-(--text-muted) transition-colors hover:text-(--text-strong)',
  toggleLabel: 'flex items-center gap-1',
  toggleIcon: 'size-3',
  disclosure: 'mt-2',
  list: 'space-y-1.5',
  row: 'relative px-1 before:pointer-events-none before:absolute before:inset-x-2 before:z-10 before:h-0.5 before:rounded before:bg-(--primary) before:opacity-0 after:pointer-events-none after:absolute after:inset-1 after:z-10 after:rounded-md after:border-2 after:border-(--primary) after:bg-(--surface-selected) after:opacity-0 data-[drop-placement=before]:before:top-[-0.25rem] data-[drop-placement=after]:before:bottom-[-0.25rem] data-[drop-placement=before]:before:opacity-100 data-[drop-placement=after]:before:opacity-100 data-[drop-placement=compose]:cursor-copy data-[drop-placement=compose]:after:animate-pulse data-[drop-placement=compose]:after:opacity-100',
  keyboardMenuAnchor:
    'pointer-events-none absolute left-1/2 top-1/2 size-px border-0 bg-transparent p-0 opacity-0',
  compositionMenuAnchor:
    'pointer-events-none absolute left-1/2 top-1/2 size-px border-0 bg-transparent p-0 opacity-0',
  expressionComposerAnchor:
    'pointer-events-none absolute left-1/2 top-1/2 size-px border-0 bg-transparent p-0 opacity-0',
  expressionComposer:
    'nodrag nopan w-80 border-(--border-default) bg-(--surface-elevated) p-3 text-(--text-strong)',
  expressionComposerFields: 'space-y-3',
  expressionComposerTitle:
    'text-[length:var(--text-body)] leading-(--text-body-line-height) font-semibold text-(--text-strong)',
  expressionComposerLabel:
    'grid gap-1 text-[length:var(--text-meta)] leading-(--text-meta-line-height) font-medium text-(--text-muted)',
  expressionComposerControl:
    'h-8 min-w-0 w-full rounded border border-(--border-default) bg-(--surface-panel) px-2 text-[length:var(--text-meta)] leading-(--text-meta-line-height) text-(--text-strong) focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-(--focus-ring) focus-visible:outline-offset-[var(--focus-ring-offset)]',
  expressionComposerOperands: 'space-y-1.5',
  expressionComposerLegend:
    'mb-1 text-[length:var(--text-meta)] leading-(--text-meta-line-height) font-medium text-(--text-muted)',
  expressionComposerOperand: 'grid grid-cols-[minmax(0,1fr)_1.75rem_1.75rem_1.75rem] gap-1',
  expressionComposerIconButton:
    'inline-flex size-7 items-center justify-center rounded border border-(--border-default) text-(--text-muted) hover:border-(--primary) hover:text-(--text-strong) focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-(--focus-ring) focus-visible:outline-offset-[var(--focus-ring-offset)] disabled:cursor-not-allowed disabled:opacity-35',
  expressionComposerAddOperand:
    'inline-flex items-center gap-1 rounded px-2 py-1 text-[length:var(--text-meta)] leading-(--text-meta-line-height) text-(--status-info) hover:bg-(--surface-selected) focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-(--focus-ring) focus-visible:outline-offset-[var(--focus-ring-offset)] disabled:cursor-not-allowed disabled:opacity-35',
  expressionComposerPreview:
    'grid gap-1 rounded border border-(--border-subtle) bg-(--surface-panel) p-2 text-[length:var(--text-meta)] leading-(--text-meta-line-height) text-(--text-subtle) [&_code]:break-all [&_code]:text-(--text-strong)',
  expressionComposerError:
    'text-[length:var(--text-meta)] leading-(--text-meta-line-height) text-(--status-danger)',
  expressionComposerActions: 'flex justify-end gap-2',
  expressionComposerCancel:
    'rounded px-2 py-1 text-[length:var(--text-meta)] leading-(--text-meta-line-height) text-(--text-muted) hover:bg-(--surface-selected) hover:text-(--text-strong)',
  expressionComposerSubmit:
    'rounded bg-(--primary) px-2 py-1 text-[length:var(--text-meta)] leading-(--text-meta-line-height) font-semibold text-(--text-inverse) hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40',
  piece:
    'nodrag nopan flex min-h-8 w-full flex-wrap items-center gap-2 rounded-md border border-(--border-default) bg-(--surface-elevated) px-3 py-1.5 text-[length:var(--text-meta)] leading-(--text-meta-line-height) shadow-(--elevation-low) transition hover:border-(--primary) hover:bg-(--surface-panel) focus-visible:border-(--primary) focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-(--focus-ring) focus-visible:outline-offset-[var(--focus-ring-offset)]',
  name: 'truncate font-mono text-[length:var(--text-mono)] leading-(--text-mono-line-height) text-(--text-strong)',
  sourceName:
    'truncate font-mono text-[length:var(--text-mono)] leading-(--text-mono-line-height) text-(--text-subtle)',
  aliasArrow: 'shrink-0 text-(--status-info)',
  metadata: 'ml-auto flex shrink-0 items-center gap-1.5',
  type: 'rounded bg-(--surface-selected) px-1.5 py-0.5 text-[length:var(--text-meta)] leading-(--text-meta-line-height) text-(--text-muted)',
  constraint:
    'rounded border border-(--border-strong) px-1 py-0.5 text-[length:var(--text-meta)] leading-(--text-meta-line-height) font-semibold tracking-wide text-(--text-default)',
  outputState:
    'nodrag nopan flex size-4 shrink-0 cursor-pointer items-center justify-center rounded border border-(--border-strong) bg-transparent p-0 text-(--primary) transition hover:border-(--primary) focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-(--focus-ring) focus-visible:outline-offset-[var(--focus-ring-offset)] aria-disabled:cursor-default aria-disabled:hover:border-(--border-strong)',
  outputCheck: 'size-3',
  tooltip:
    'w-auto max-w-72 break-words border border-(--border-default) bg-(--surface-elevated) px-2 py-1 text-[length:var(--text-meta)] leading-(--text-meta-line-height) font-medium text-(--text-strong) shadow-(--elevation-low)',
  remainderToggle:
    'nodrag nopan mt-2 w-full cursor-pointer rounded border border-(--border-default) bg-(--surface-panel) px-2 py-1.5 text-left text-[length:var(--text-meta)] leading-(--text-meta-line-height) font-medium text-(--status-info) transition hover:border-(--primary) hover:bg-(--surface-selected) hover:text-(--status-info) focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-(--focus-ring) focus-visible:outline-offset-[var(--focus-ring-offset)]',
  automap:
    'nodrag nopan mt-2 w-full cursor-pointer rounded border border-(--primary) bg-(--surface-selected) px-2 py-1.5 text-left text-[length:var(--text-meta)] leading-(--text-meta-line-height) font-semibold text-(--text-default) transition hover:border-(--primary) hover:bg-(--surface-selected) focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-(--focus-ring) focus-visible:outline-offset-[var(--focus-ring-offset)]',
  addGap: 'group/add nodrag nopan relative flex h-7 items-center justify-center',
  addTrigger:
    'flex size-5 translate-y-0.5 cursor-pointer items-center justify-center rounded-full border border-(--primary) bg-(--surface-elevated) text-(--status-info) opacity-0 shadow-(--elevation-low) transition-[opacity,transform,background-color] hover:scale-110 hover:bg-(--surface-selected) group-hover/add:opacity-100 focus:opacity-100 focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-(--focus-ring) focus-visible:outline-offset-[var(--focus-ring-offset)]',
  addIcon: 'size-3',
  addForm:
    'nodrag nopan w-72 border-(--border-default) bg-(--surface-elevated) p-3 text-(--text-strong)',
  addFormFields: 'space-y-3',
  addLabel:
    'grid gap-1 text-[length:var(--text-meta)] leading-(--text-meta-line-height) font-medium text-(--text-muted)',
  addControl:
    'h-8 w-full rounded border border-(--border-default) bg-(--surface-panel) px-2 text-[length:var(--text-meta)] leading-(--text-meta-line-height) text-(--text-strong) focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-(--focus-ring) focus-visible:outline-offset-[var(--focus-ring-offset)]',
  addActions: 'flex justify-end gap-2 pt-1',
  addCancel:
    'rounded px-2 py-1 text-[length:var(--text-meta)] leading-(--text-meta-line-height) text-(--text-muted) hover:bg-(--surface-selected) hover:text-(--text-strong)',
  addSubmit:
    'rounded bg-(--primary) px-2 py-1 text-[length:var(--text-meta)] leading-(--text-meta-line-height) font-semibold text-(--text-inverse) hover:brightness-110',
} as const;
