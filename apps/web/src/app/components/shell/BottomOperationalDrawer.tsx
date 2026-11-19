/**
 * Owned concern: compose contextual Preview and data tabs within the operational drawer.
 * @baseline GH-3629: drawer appearance does not depend on the TopBar stylesheet.
 * @decision Import concern-owned CSS directly without changing contribution or feed lifecycle.
 * @consequence Tab navigation, close, restore and drawer layout retain their existing owners.
 * @version 1.0.0
 */
import { X } from 'lucide-react';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import styles from './BottomOperationalDrawer.module.css';
import { resolveShellTopBarCopy } from './copy';
import { useOperationalDrawerContributionStore } from './operationalDrawerContributionStore';
import { BottomOperationalDrawerBody } from './OperationalDrawerPanels';
import { OperationalDrawerTabStrip } from './OperationalDrawerTabStrip';

import { Button } from '../ui/button';

export function BottomOperationalDrawer() {
  const locale = useApplicationLanguageStore((state) => state.language);
  const copy = resolveShellTopBarCopy(locale);
  const hideBottomDrawer = useUiLayoutStore((state) => state.hideBottomDrawer);
  const contribution = useOperationalDrawerContributionStore((state) => state.contribution);
  const activeOperationalTab = useOperationalDrawerContributionStore((state) => state.activeTab);
  const hiddenOperationalTabs = useOperationalDrawerContributionStore((state) => state.hiddenTabs);
  const setActiveOperationalTab = useOperationalDrawerContributionStore(
    (state) => state.selectOperationalDrawerTab
  );
  const setOperationalDrawerTabVisibility = useOperationalDrawerContributionStore(
    (state) => state.setOperationalDrawerTabVisibility
  );
  const visibleTabs =
    contribution?.tabs.filter((tab) => !hiddenOperationalTabs.includes(tab.id)) ?? [];
  const hiddenTabs =
    contribution?.tabs.filter((tab) => hiddenOperationalTabs.includes(tab.id)) ?? [];

  return (
    <div
      data-slot="bottom-operational-drawer"
      className={styles.drawer}
      role="region"
      aria-label={contribution?.title ?? copy.operationalDrawer}
    >
      <div data-slot="bottom-operational-drawer-controls" className={styles.controls}>
        {contribution == null ? null : (
          <OperationalDrawerTabStrip
            activeTab={activeOperationalTab}
            ariaLabel={contribution.copy.tabsAriaLabel}
            closeTabLabel={copy.closeOperationalDrawerTab}
            hiddenTabs={hiddenTabs}
            onCloseTab={(tab) => setOperationalDrawerTabVisibility({ tab, visible: false })}
            onRestoreTab={(tab) => setOperationalDrawerTabVisibility({ tab, visible: true })}
            onSelectTab={setActiveOperationalTab}
            restoreTabsLabel={copy.restoreOperationalDrawerTabs}
            visibleTabs={visibleTabs}
          />
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label={copy.closeOperationalDrawer}
          className={styles.closeButton}
          onClick={hideBottomDrawer}
          data-slot="bottom-operational-drawer-close"
        >
          <X className={styles.closeIcon} />
        </Button>
      </div>

      <div data-slot="bottom-operational-drawer-body" className={styles.body}>
        <BottomOperationalDrawerBody activeTab={activeOperationalTab} contribution={contribution} />
      </div>
    </div>
  );
}

export default BottomOperationalDrawer;
