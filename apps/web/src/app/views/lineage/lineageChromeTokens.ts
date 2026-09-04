/**
 * Owned concern: own Lineage route chrome visual tokens for graph and impact panels.
 */
export const lineageChromeClasses = {
  panel: 'border-[color:var(--border-default)] bg-[var(--surface-panel)]',
  mutedText: 'text-[var(--text-muted)]',
  focusBadge: 'bg-[var(--status-success)] text-[var(--surface-app)]',
} as const;

const nodeKindClasses: Record<string, string> = {
  'dbt:source': 'border-[color:var(--status-info)] bg-[var(--surface-elevated)]',
  'dbt:seed': 'border-[color:var(--status-success)] bg-[var(--surface-elevated)]',
  'dbt:model': 'border-[color:var(--status-running)] bg-[var(--surface-elevated)]',
  'dbt:snapshot': 'border-[color:var(--status-warning)] bg-[var(--surface-elevated)]',
  'dbt:test': 'border-[color:var(--status-danger)] bg-[var(--surface-elevated)]',
  'dbt:exposure': 'border-[color:var(--status-degraded)] bg-[var(--surface-elevated)]',
  'dbt:metric': 'border-[color:var(--status-readonly)] bg-[var(--surface-elevated)]',
  'dbt:macro': 'border-[color:var(--border-strong)] bg-[var(--surface-elevated)]',
};

export function resolveLineageNodeKindClassName(kind: string): string {
  return (
    nodeKindClasses[kind] ?? 'border-[color:var(--border-default)] bg-[var(--surface-elevated)]'
  );
}
