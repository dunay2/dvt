/** Owned concern: present closable operational tabs and restore hidden tabs. */
import { X } from 'lucide-react';
import type { KeyboardEvent } from 'react';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from '../ui/context-menu';
import type {
  OperationalDrawerTab,
  OperationalDrawerTabId,
} from './operationalDrawerContributionStore';

const classes = {
  list: 'flex min-h-10 shrink-0 flex-wrap items-center gap-1 border-b border-[color:var(--border-default)] px-3',
  tab: 'group flex h-9 items-center border-b-2 border-transparent px-2 text-xs font-semibold text-[var(--text-muted)] data-[active=true]:border-[color:var(--focus-ring)] data-[active=true]:text-[var(--text-strong)]',
  close:
    'ml-1 grid size-5 place-items-center rounded text-[var(--text-muted)] group-hover:bg-[var(--surface-hover)] group-hover:text-[var(--text-strong)]',
  closeIcon: 'size-3',
} as const;

export function OperationalDrawerTabStrip({
  activeTab,
  ariaLabel,
  closeTabLabel,
  hiddenTabs,
  onCloseTab,
  onRestoreTab,
  onSelectTab,
  restoreTabsLabel,
  visibleTabs,
}: Readonly<{
  activeTab: OperationalDrawerTabId | null;
  ariaLabel: string;
  closeTabLabel: string;
  hiddenTabs: readonly OperationalDrawerTab[];
  onCloseTab: (tab: OperationalDrawerTabId) => void;
  onRestoreTab: (tab: OperationalDrawerTabId) => void;
  onSelectTab: (tab: OperationalDrawerTabId) => void;
  restoreTabsLabel: string;
  visibleTabs: readonly OperationalDrawerTab[];
}>): JSX.Element {
  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, tabId: OperationalDrawerTabId) => {
    const currentIndex = visibleTabs.findIndex((tab) => tab.id === tabId);
    const offsets: Record<string, number> = {
      ArrowRight: (currentIndex + 1) % visibleTabs.length,
      ArrowLeft: (currentIndex - 1 + visibleTabs.length) % visibleTabs.length,
      Home: 0,
      End: visibleTabs.length - 1,
    };
    const nextIndex = offsets[event.key];
    const nextTab = nextIndex == null ? null : visibleTabs[nextIndex];
    if (nextTab == null) return;

    event.preventDefault();
    onSelectTab(nextTab.id);
    event.currentTarget
      .closest('[role="tablist"]')
      ?.querySelector<HTMLButtonElement>(`[data-tab="${nextTab.id}"]`)
      ?.focus();
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          data-slot="bottom-operational-drawer-tabs"
          className={classes.list}
          role="tablist"
          aria-orientation="horizontal"
          aria-label={ariaLabel}
        >
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`bottom-operational-drawer-tab-${tab.id}`}
              aria-controls={`bottom-operational-drawer-panel-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-keyshortcuts="Delete"
              tabIndex={activeTab === tab.id ? 0 : -1}
              data-slot="bottom-operational-drawer-tab"
              data-tab={tab.id}
              className={classes.tab}
              data-active={activeTab === tab.id}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest('[data-tab-close]') != null) {
                  onCloseTab(tab.id);
                  return;
                }
                onSelectTab(tab.id);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Delete') {
                  event.preventDefault();
                  onCloseTab(tab.id);
                  return;
                }
                moveFocus(event, tab.id);
              }}
            >
              <span>
                {tab.label}
                {tab.count == null ? null : <span> {tab.count}</span>}
              </span>
              <span
                aria-hidden="true"
                title={closeTabLabel.replace('{tab}', tab.label)}
                data-slot="bottom-operational-drawer-tab-close"
                data-tab-close={tab.id}
                className={classes.close}
              >
                <X aria-hidden="true" className={classes.closeIcon} />
              </span>
            </button>
          ))}
        </div>
      </ContextMenuTrigger>
      {hiddenTabs.length === 0 ? null : (
        <ContextMenuContent>
          <ContextMenuLabel>{restoreTabsLabel}</ContextMenuLabel>
          {hiddenTabs.map((tab) => (
            <ContextMenuItem
              key={tab.id}
              data-restore-tab={tab.id}
              onSelect={() => onRestoreTab(tab.id)}
            >
              {tab.label}
            </ContextMenuItem>
          ))}
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
}
