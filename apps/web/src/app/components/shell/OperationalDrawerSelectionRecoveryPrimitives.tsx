/** Owned concern: provide tokenized presentation primitives for selection recovery. */
import type { ReactNode } from 'react';

import {
  OperationalDrawerCodeToken,
  OperationalDrawerSectionKicker,
} from './OperationalDrawerPanelPrimitives';

const selectionRecoveryClassNames = {
  surface:
    'mt-3 grid gap-3 border-t border-[color:var(--border-muted)] pt-3 text-[var(--text-default)]',
  scopeGrid: 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3',
  scopeGroup: 'min-w-0 space-y-1',
  scopeValues: 'flex min-w-0 flex-wrap gap-1.5',
  empty: 'text-xs text-[var(--text-subtle)]',
  actions: 'flex flex-wrap items-center gap-2',
  receipt:
    'rounded border border-[color:var(--status-success)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-[var(--text-default)]',
  failure:
    'rounded border border-[color:var(--status-danger)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-[var(--status-danger)]',
} as const;

export function OperationalDrawerRecoverySurface({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return <section className={selectionRecoveryClassNames.surface}>{children}</section>;
}

export function OperationalDrawerRecoveryScopeGrid({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return <div className={selectionRecoveryClassNames.scopeGrid}>{children}</div>;
}

export function OperationalDrawerRecoveryScopeGroup({
  emptyLabel,
  label,
  values,
}: Readonly<{ emptyLabel: string; label: string; values: readonly string[] }>): JSX.Element {
  return (
    <div className={selectionRecoveryClassNames.scopeGroup}>
      <OperationalDrawerSectionKicker>{label}</OperationalDrawerSectionKicker>
      <div className={selectionRecoveryClassNames.scopeValues}>
        {values.length === 0 ? (
          <span className={selectionRecoveryClassNames.empty}>{emptyLabel}</span>
        ) : (
          values.map((value) => (
            <OperationalDrawerCodeToken
              key={value}
              dataSlot="bottom-operational-selection-scope-value"
            >
              {value}
            </OperationalDrawerCodeToken>
          ))
        )}
      </div>
    </div>
  );
}

export function OperationalDrawerRecoveryActions({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return <div className={selectionRecoveryClassNames.actions}>{children}</div>;
}

export function OperationalDrawerRecoveryReceipt({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return (
    <p
      role="status"
      aria-live="polite"
      data-slot="bottom-operational-selection-recovery-receipt"
      className={selectionRecoveryClassNames.receipt}
    >
      {children}
    </p>
  );
}

export function OperationalDrawerRecoveryFailure({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return (
    <p
      role="alert"
      data-slot="bottom-operational-selection-recovery-failure"
      className={selectionRecoveryClassNames.failure}
    >
      {children}
    </p>
  );
}
