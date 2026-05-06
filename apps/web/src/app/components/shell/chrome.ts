export const topAppBarClasses = {
  shellBar:
    'flex h-10 shrink-0 items-center gap-2 border-b border-[color:var(--border-default)] bg-[var(--surface-shell)] px-3 text-[var(--text-default)]',
  brand: 'text-base leading-none font-semibold text-[var(--text-strong)]',
  selectTrigger:
    'h-8 border-[color:var(--border-default)] bg-[var(--surface-app)] text-[var(--text-default)]',
  selectorLabel: 'text-[11px] font-medium uppercase text-[var(--text-subtle)]',
  gitRef:
    'hidden h-7 items-center gap-1.5 rounded-md border border-transparent px-1.5 text-[11px] text-[var(--text-subtle)] lg:flex',
  gitRefIcon: 'size-3.5 text-[var(--text-subtle)]',
  gitRefSeparator: 'text-[var(--text-subtle)]',
  gitRefSha: 'text-[11px] text-[var(--text-default)]',
  projectIdentityBadge:
    'flex h-8 min-w-0 max-w-[18rem] items-center gap-1.5 rounded-md border border-[color:var(--border-default)] bg-[var(--surface-app)] px-2.5 text-xs text-[var(--text-default)]',
  contextChip:
    'flex h-8 min-w-0 max-w-[12rem] items-center gap-2 rounded-md border border-[color:var(--border-default)] bg-[var(--surface-app)] px-2.5 text-xs text-[var(--text-default)]',
  contextChipIcon: 'size-3.5 text-[var(--text-subtle)]',
  contextChipLabel: 'truncate text-[var(--text-strong)]',
  contextChipMeta: 'hidden shrink-0 text-[var(--text-subtle)] md:inline',
  contextChipSeparator: 'hidden shrink-0 text-[var(--text-subtle)] md:inline',
  smallStatusText: 'flex cursor-default items-center gap-1.5 px-1 text-[11px]',
  menuButton:
    'h-8 gap-1.5 px-2 text-[var(--text-default)] hover:bg-[var(--surface-selected)] hover:text-[var(--text-strong)]',
};

export const leftNavigationRailClasses = {
  rail: 'h-full w-36 shrink-0 border-r border-[color:var(--border-default)] bg-[var(--surface-shell)]',
  nav: 'flex h-full flex-col items-stretch gap-2 overflow-y-auto px-2 py-4',
  link: 'grid h-10 w-full shrink-0 grid-cols-[18px_1fr] items-center gap-2 rounded-xl border border-transparent px-3 text-[var(--text-subtle)] transition-colors',
  linkInteractive:
    'hover:bg-[var(--surface-selected)] hover:text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-shell)]',
  linkActive:
    'border-[color:var(--status-running)] bg-[var(--surface-selected)] text-[var(--text-strong)]',
  icon: 'size-[18px] shrink-0 justify-self-start',
  caption: 'block max-w-full truncate text-left text-[11px] leading-none text-inherit',
};

export const bottomConsoleDrawerClasses = {
  drawer:
    'flex h-full flex-col border-t border-[color:var(--border-default)] bg-[var(--surface-shell)] text-[var(--text-default)]',
  header:
    'flex items-center justify-between border-b border-[color:var(--border-default)] px-4 py-2',
  headerMain: 'flex items-center gap-2',
  titleIcon: 'size-4 text-[var(--text-subtle)]',
  title: 'text-sm font-medium text-[var(--text-strong)]',
  closeButton: 'size-6 text-[var(--text-subtle)] hover:text-[var(--text-strong)]',
  body: 'flex min-h-0 flex-1',
  bodyMessage:
    'flex h-full w-full items-center justify-center px-4 text-center text-sm text-[var(--text-subtle)]',
};
