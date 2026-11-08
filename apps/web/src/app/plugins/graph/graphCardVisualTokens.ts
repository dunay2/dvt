/** Card surface, identity and layout presentation. */
export const graphNodeCardSurfaceClasses = {
  root: 'group relative w-[24rem] min-w-[24rem] max-w-[24rem] overflow-hidden rounded-md border bg-(--surface-elevated) text-[length:var(--text-body)] leading-(--text-body-line-height) text-(--text-default) shadow-(--elevation-low) transition-[border-color,opacity] focus-within:outline-[length:var(--focus-ring-width)] focus-within:outline-(--focus-ring) focus-within:outline-offset-[var(--focus-ring-offset)]',
  selected: 'ring-2 ring-(--primary)',
  hovered: 'ring-1 ring-(--border-strong)',
  dimmed: 'opacity-30',
  overlayBorder:
    'pointer-events-none absolute inset-0 z-10 rounded-[inherit] border-2 border-solid',
} as const;

export const graphNodeCardLayoutClasses = {
  body: 'px-4 pb-3 pt-3',
  header: 'flex items-start justify-between gap-3',
  titleRow: 'flex min-w-0 flex-1 items-center gap-2',
  icon: 'shrink-0 opacity-80',
  title:
    'truncate text-[length:var(--text-body)] leading-(--text-body-line-height) font-semibold text-(--text-strong)',
  sourceIdentityTrigger:
    'min-w-0 cursor-help rounded-sm text-left focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-(--focus-ring) focus-visible:outline-offset-[var(--focus-ring-offset)]',
  headerActions: 'flex shrink-0 items-center justify-end gap-2',
  kind: 'mt-2 text-[length:var(--text-meta)] leading-(--text-meta-line-height) font-medium text-(--text-muted)',
  path: 'mt-1 truncate text-[length:var(--text-meta)] leading-(--text-meta-line-height) text-(--text-subtle)',
  iconTone: {
    source: 'text-(--canvas-node-port-source-ring)',
    model: 'text-(--canvas-node-port-model-ring)',
    test: 'text-(--canvas-node-port-test-ring)',
    output: 'text-(--canvas-node-port-output-ring)',
    control: 'text-(--canvas-node-port-control-ring)',
    unknown: 'text-(--text-subtle)',
  },
} as const;

export const graphNodeSourceIdentityTooltipClasses = {
  root: 'w-64 border border-(--border-default) bg-(--surface-elevated) px-3 py-2 text-(--text-strong) shadow-(--elevation-low)',
  rows: 'space-y-1.5',
  row: 'grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3',
  label: 'text-(--text-subtle)',
  value: 'min-w-0 break-all text-right font-medium text-(--text-strong)',
} as const;

export const graphNodeTagListClasses = {
  root: 'mt-3 flex flex-wrap gap-1.5',
  tag: 'max-w-64 truncate rounded border border-(--border-default) bg-(--surface-panel) px-2 py-0.5 text-[length:var(--text-meta)] leading-(--text-meta-line-height) text-(--text-muted)',
  interactiveTag:
    'nodrag nopan cursor-pointer transition hover:brightness-125 focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-(--focus-ring) focus-visible:outline-offset-[var(--focus-ring-offset)]',
  tone: {
    source:
      'border-(--canvas-node-port-source-ring) bg-(--canvas-node-port-source-fill) text-(--text-default)',
    model:
      'border-(--canvas-node-port-model-ring) bg-(--canvas-node-port-model-fill) text-(--text-default)',
    test: 'border-(--canvas-node-port-test-ring) bg-(--canvas-node-port-test-fill) text-(--text-default)',
    output:
      'border-(--canvas-node-port-output-ring) bg-(--canvas-node-port-output-fill) text-(--text-default)',
    control:
      'border-(--canvas-node-port-control-ring) bg-(--canvas-node-port-control-fill) text-(--text-default)',
    unknown: 'border-(--border-default) bg-(--surface-panel) text-(--text-muted)',
  },
} as const;

export const graphNodeHealthBorderClasses = {
  healthy: 'border-solid border-(--status-success)',
  failed: 'border-dashed border-(--status-danger)',
  neutral: 'border-solid border-(--border-strong)',
} as const;
