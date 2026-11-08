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
import styles from './BottomOperationalDrawer.module.css';

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
}>): JSX.Element | null {
  const hasVisibleTabs = visibleTabs.length > 0;
  if (!hasVisibleTabs && hiddenTabs.length === 0) return null;
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
          className={styles.tabs}
          role={hasVisibleTabs ? 'tablist' : 'group'}
          aria-orientation={hasVisibleTabs ? 'horizontal' : undefined}
          aria-label={hasVisibleTabs ? ariaLabel : restoreTabsLabel}
          tabIndex={hasVisibleTabs ? undefined : 0}
          aria-keyshortcuts={hasVisibleTabs ? undefined : 'Shift+F10'}
        >
          {hasVisibleTabs ? null : <span className={styles.restoreHint}>{restoreTabsLabel}</span>}
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
              className={styles.tab}
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
              <span className={styles.tabLabel}>
                {tab.label}
                {tab.count == null ? null : <span> {tab.count}</span>}
              </span>
              <span
                aria-hidden="true"
                title={closeTabLabel.replace('{tab}', tab.label)}
                data-slot="bottom-operational-drawer-tab-close"
                data-tab-close={tab.id}
                className={styles.tabClose}
              >
                <X aria-hidden="true" className={styles.tabCloseIcon} />
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
