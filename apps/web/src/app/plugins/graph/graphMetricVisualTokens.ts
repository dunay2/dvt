/** Shared metric presentation, with explicit surface-specific variants. */
const metricValueTones = {
  neutral: 'text-(--text-default)',
  info: 'text-(--status-info)',
  success: 'text-(--status-success)',
  warning: 'text-(--status-warning)',
  danger: 'text-(--status-danger)',
  running: 'text-(--status-running)',
} as const;
const operationalRail =
  'grid grid-cols-[repeat(auto-fit,minmax(4.75rem,1fr))] border-t border-(--border-subtle) bg-(--surface-panel)';
export const graphNodeMetricRowClasses = {
  root: {
    body: 'mt-3 flex flex-wrap items-center gap-2 text-[length:var(--text-meta)] leading-(--text-meta-line-height) text-(--text-muted)',
    header:
      'inline-flex shrink-0 items-center gap-1 text-[length:var(--text-meta)] leading-(--text-meta-line-height) text-(--text-muted)',
  },
  item: {
    body: 'inline-flex items-center gap-1',
    header: 'inline-flex min-w-0 items-center px-2 py-1',
  },
  headerTrigger:
    'inline-flex w-full min-w-0 cursor-help items-center justify-center gap-1 rounded-sm focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-(--focus-ring) focus-visible:outline-offset-[var(--focus-ring-offset)]',
  icon: 'inline-flex size-3.5 shrink-0 text-(--status-info)',
  iconSvg: 'size-3.5',
  label: {
    body: 'text-(--text-subtle)',
    header: 'sr-only',
  },
  value: 'min-w-0 truncate font-medium text-(--text-default)',
  interactiveValue: 'nodrag nopan',
  valueTone: metricValueTones,
} as const;

export const graphNodeMaterializationClasses = {
  trigger:
    'nodrag nopan inline-flex min-w-[5.5rem] cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-[length:var(--text-meta)] leading-(--text-meta-line-height) font-medium text-(--text-muted) hover:bg-(--surface-selected) hover:text-(--text-strong) focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-(--focus-ring) focus-visible:outline-offset-[var(--focus-ring-offset)] disabled:cursor-default disabled:opacity-60',
  value: 'flex-1 text-left',
  chevron: 'size-3 shrink-0 text-(--text-subtle)',
  menu: 'nodrag nopan min-w-28 border-(--border-default) bg-(--surface-elevated) text-(--text-default)',
  option:
    'cursor-pointer text-[length:var(--text-meta)] leading-(--text-meta-line-height) focus:bg-(--surface-selected) focus:text-(--text-strong)',
} as const;

export const graphNodeOperationalRailClasses = {
  root: operationalRail,
  button: `${operationalRail} nodrag nopan w-full cursor-pointer text-left transition hover:bg-(--surface-selected) focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-(--focus-ring) focus-visible:outline-offset-[var(--focus-ring-offset)]`,
  metric:
    'flex min-w-0 items-center gap-2 border-r border-(--border-subtle) px-3 py-2 last:border-r-0',
  icon: 'flex size-5 shrink-0 items-center justify-center rounded-full border border-(--border-default) bg-(--surface-elevated) text-(--text-subtle)',
  iconSvg: 'size-3',
  metricText: 'min-w-0',
  label:
    'block truncate text-[length:var(--text-meta)] leading-(--text-meta-line-height) uppercase tracking-wide text-(--text-subtle)',
  value:
    'mt-0.5 block truncate text-[length:var(--text-body)] leading-(--text-body-line-height) font-medium text-(--text-default)',
  valueTone: metricValueTones,
  accessibleDescription: 'sr-only',
} as const;

export const graphNodeHealthPopoverClasses = {
  root: 'absolute z-40 w-72 rounded-md border border-(--border-default) bg-(--surface-elevated) p-3 text-[length:var(--text-meta)] leading-(--text-meta-line-height) text-(--text-strong) shadow-(--elevation-low) outline-none',
  title:
    'text-[length:var(--text-body)] leading-(--text-body-line-height) font-semibold text-(--text-strong)',
  rows: 'mt-3 space-y-2',
  row: 'grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1',
  label: 'text-(--text-subtle)',
  value: 'text-right font-medium text-(--text-strong)',
  detail:
    'col-span-2 text-[length:var(--text-meta)] leading-(--text-meta-line-height) text-(--text-subtle)',
  valueTone: {
    ...metricValueTones,
    neutral: 'text-(--text-strong)',
  },
} as const;
