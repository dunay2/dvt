/**
 * Owned concern: expose dense table visual tokens for route workbench tables
 * without owning row identity, filters, sorting, navigation, or API semantics.
 */
export const routeWorkbenchDenseTableClasses = {
  field:
    'h-9 rounded border border-[color:var(--border-default)] bg-[var(--surface-app)] px-3 text-sm text-[var(--text-default)]',
  mutedText: 'text-[var(--text-muted)]',
  subtleText: 'text-[var(--text-subtle)]',
  emptyCell: 'text-[var(--text-muted)]',
} as const;

export const routeWorkbenchStatusToneClasses = {
  danger: 'bg-[var(--status-danger)] text-[var(--text-inverse)]',
  info: 'bg-[var(--status-info)] text-[var(--text-inverse)]',
  neutral:
    'border border-[color:var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-default)]',
  running: 'bg-[var(--status-running)] text-[var(--text-inverse)]',
  success: 'bg-[var(--status-success)] text-[var(--text-inverse)]',
  warning: 'bg-[var(--status-warning)] text-[var(--text-inverse)]',
} as const;

export type RouteWorkbenchStatusTone = keyof typeof routeWorkbenchStatusToneClasses;

export function getRouteWorkbenchStatusToneClassName(tone: RouteWorkbenchStatusTone): string {
  return routeWorkbenchStatusToneClasses[tone];
}
