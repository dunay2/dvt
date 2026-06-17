/** Owned concern: provide reusable presentation primitives for shell operational drawer panels. */
import type { ReactNode } from 'react';

import { Button } from '../ui/button';
import type {
  OperationalDrawerTab,
  OperationalDrawerTabId,
} from './operationalDrawerContributionStore';

const operationalDrawerPanelClassNames = {
  panelSurface: 'h-full min-h-0 overflow-auto px-4 py-3',
  emptyState: 'text-sm text-[var(--text-subtle)]',
  warningBadge:
    'h-fit rounded border border-amber-400/50 px-2 py-0.5 text-[11px] font-semibold uppercase text-amber-100',
  codeToken: 'rounded border border-amber-400/40 px-2 py-0.5 font-mono text-[11px] text-amber-100',
  detailCode: 'mt-1 block font-mono text-[11px] text-[var(--text-muted)]',
  sectionKicker: 'text-[11px] font-semibold uppercase text-[var(--text-muted)]',
  tabList: 'flex shrink-0 items-center gap-1 border-b border-[color:var(--border-default)] px-3',
  tabButton:
    'h-9 border-b-2 border-transparent px-2 text-xs font-semibold text-[var(--text-muted)] data-[active=true]:border-[color:var(--focus-ring)] data-[active=true]:text-[var(--text-strong)]',
} as const;

export function OperationalDrawerPanelSurface({
  ariaLabel,
  children,
  dataSlot,
  textSm = false,
}: Readonly<{
  ariaLabel: string;
  children: ReactNode;
  dataSlot: string;
  textSm?: boolean;
}>): JSX.Element {
  return (
    <section
      data-slot={dataSlot}
      className={
        textSm
          ? `${operationalDrawerPanelClassNames.panelSurface} text-sm`
          : operationalDrawerPanelClassNames.panelSurface
      }
      aria-label={ariaLabel}
    >
      {children}
    </section>
  );
}

export function OperationalDrawerEmptyState({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return <p className={operationalDrawerPanelClassNames.emptyState}>{children}</p>;
}

export function OperationalDrawerWarningBadge({
  children,
  dataSlot,
}: Readonly<{
  children: ReactNode;
  dataSlot: string;
}>): JSX.Element {
  return (
    <span data-slot={dataSlot} className={operationalDrawerPanelClassNames.warningBadge}>
      {children}
    </span>
  );
}

export function OperationalDrawerDetailCode({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return (
    <span
      data-slot="bottom-operational-detail-code"
      className={operationalDrawerPanelClassNames.detailCode}
    >
      {children}
    </span>
  );
}

export function OperationalDrawerCodeToken({
  children,
  dataSlot,
}: Readonly<{
  children: ReactNode;
  dataSlot: string;
}>): JSX.Element {
  return (
    <code data-slot={dataSlot} className={operationalDrawerPanelClassNames.codeToken}>
      {children}
    </code>
  );
}

export function OperationalDrawerSectionKicker({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return <div className={operationalDrawerPanelClassNames.sectionKicker}>{children}</div>;
}

export function OperationalDrawerPrimaryAction({
  children,
  disabled,
  onClick,
}: Readonly<{
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
}>): JSX.Element {
  return (
    <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onClick}>
      {children}
    </Button>
  );
}

export function OperationalDrawerTabs({
  activeTab,
  ariaLabel,
  onSelectTab,
  tabs,
}: Readonly<{
  activeTab: OperationalDrawerTabId;
  ariaLabel: string;
  onSelectTab: (tab: OperationalDrawerTabId) => void;
  tabs: readonly OperationalDrawerTab[];
}>): JSX.Element {
  return (
    <div
      data-slot="bottom-operational-drawer-tabs"
      className={operationalDrawerPanelClassNames.tabList}
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          data-slot="bottom-operational-drawer-tab"
          data-tab={tab.id}
          className={operationalDrawerPanelClassNames.tabButton}
          data-active={activeTab === tab.id}
          onClick={() => onSelectTab(tab.id)}
        >
          {tab.label}
          {tab.count == null ? null : <span> {tab.count}</span>}
        </button>
      ))}
    </div>
  );
}
