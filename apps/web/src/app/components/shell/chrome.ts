export const topAppBarClasses = {
  shellBar:
    'flex h-10 shrink-0 items-center gap-2 border-b border-[color:var(--border-default)] bg-[var(--surface-shell)] px-3 text-[var(--text-default)]',
  brand: 'text-base leading-none font-semibold text-[var(--text-strong)]',
  selectTrigger:
    'h-8 border-[color:var(--border-default)] bg-[var(--surface-app)] text-[var(--text-default)]',
  gitRef:
    'flex h-8 items-center gap-2 rounded-md border border-[color:var(--border-default)] bg-[var(--surface-app)] px-2.5 text-xs text-[var(--text-default)]',
  gitRefIcon: 'size-3.5 text-[var(--text-subtle)]',
  gitRefSeparator: 'text-[var(--text-subtle)]',
  gitRefSha: 'text-xs text-[var(--text-strong)]',
  smallStatusText: 'flex cursor-default items-center gap-1.5 px-1 text-[11px]',
  menuButton:
    'h-8 gap-1.5 px-2 text-[var(--text-default)] hover:bg-[var(--surface-selected)] hover:text-[var(--text-strong)]',
};

export const leftNavigationRailClasses = {
  rail: 'h-full w-16 shrink-0 border-r border-[color:var(--border-default)] bg-[var(--surface-shell)]',
  nav: 'flex h-full flex-col items-center gap-3.5 overflow-y-auto py-4',
  link: 'flex size-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-[var(--text-subtle)] transition-colors',
  linkInteractive:
    'hover:bg-[var(--surface-selected)] hover:text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-shell)]',
  linkActive:
    'border-[color:var(--status-running)] bg-[var(--surface-selected)] text-[var(--text-strong)]',
  icon: 'size-[18px] shrink-0',
};
