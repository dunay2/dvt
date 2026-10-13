/**
 * Owned concern: compose the operational drawer and its existing contribution and log surfaces.
 * @baseline GH-3629: drawer appearance does not depend on the TopBar stylesheet.
 * @decision Import concern-owned CSS directly without changing contribution or feed lifecycle.
 * @consequence Tabs, retry, close, localization and terminal behavior retain their owners.
 * @version 1.0.0
 */
import { Suspense, lazy } from 'react';
import { Activity, X } from 'lucide-react';

import { resolveRunEventFeedHealthCopy } from '../../services/runs/runEventFeedHealthCopy';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import { useConsoleLogStream } from '../console/useConsoleLogStream';
import { buildBottomOperationalDrawerLogModel } from './bottomOperationalDrawerLogModel';
import styles from './BottomOperationalDrawer.module.css';
import { resolveShellTopBarCopy } from './copy';
import { useOperationalDrawerContributionStore } from './operationalDrawerContributionStore';
import { BottomOperationalDrawerBody } from './OperationalDrawerPanels';
import { OperationalDrawerTabStrip } from './OperationalDrawerTabStrip';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

const XtermConsole = lazy(() => import('../console/XtermConsole'));

function BottomOperationalLogBody({
  model,
  onRetry,
}: Readonly<{
  model: ReturnType<typeof buildBottomOperationalDrawerLogModel>;
  onRetry: () => void;
}>): JSX.Element {
  if (model.kind === 'idle') {
    return (
      <div data-slot="bottom-operational-drawer-idle" className={styles.bodyMessage}>
        {model.message}
      </div>
    );
  }

  return (
    <div className={styles.logBody}>
      <div
        role="status"
        aria-live="polite"
        data-slot="bottom-operational-feed-health"
        data-state={model.healthState}
        className={styles.feedHealth}
      >
        <Badge variant="outline" className={styles.feedHealthBadge}>
          {model.statusLabel}
        </Badge>
        <span className={styles.feedHealthMessage}>{model.message}</span>
        {model.canRetry ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={styles.feedRetry}
            data-slot="bottom-operational-feed-retry"
            onClick={onRetry}
          >
            {model.retryLabel}
          </Button>
        ) : null}
      </div>

      {model.lines.length > 0 ? (
        <Suspense
          fallback={
            <div
              data-slot="bottom-operational-drawer-terminal-loading"
              className={styles.bodyMessage}
            >
              {model.terminalLoadingLabel}
            </div>
          }
        >
          <div data-slot="bottom-operational-drawer-stream" className={styles.stream}>
            <XtermConsole key={model.runLabel} lines={[...model.lines]} />
          </div>
        </Suspense>
      ) : null}
    </div>
  );
}

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
  const feedCopy = resolveRunEventFeedHealthCopy(locale);
  const { lines, runId, health, retry } = useConsoleLogStream();
  const model = buildBottomOperationalDrawerLogModel({
    title: copy.operationalDrawer,
    runId,
    health,
    copy: feedCopy,
    lines,
  });
  const drawerTitle = contribution?.title ?? model.title;
  const visibleTabs =
    contribution?.tabs.filter((tab) => !hiddenOperationalTabs.includes(tab.id)) ?? [];
  const hiddenTabs =
    contribution?.tabs.filter((tab) => hiddenOperationalTabs.includes(tab.id)) ?? [];

  return (
    <div data-slot="bottom-operational-drawer" className={styles.drawer}>
      <div data-slot="bottom-operational-drawer-header" className={styles.header}>
        <div data-slot="bottom-operational-drawer-title" className={styles.headerMain}>
          <Activity className={styles.titleIcon} />
          <span className={styles.title}>{drawerTitle}</span>
          {model.runLabel && (
            <Badge
              variant="outline"
              className={styles.runBadge}
              data-slot="bottom-operational-drawer-run-badge"
            >
              {model.runLabel}
            </Badge>
          )}
        </div>
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

      <div data-slot="bottom-operational-drawer-body" className={styles.body}>
        <BottomOperationalDrawerBody
          activeTab={activeOperationalTab}
          contribution={contribution}
          logBody={<BottomOperationalLogBody model={model} onRetry={retry} />}
        />
      </div>
    </div>
  );
}

export default BottomOperationalDrawer;
