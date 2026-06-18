import { Suspense, lazy, useEffect, useState } from 'react';
import { Activity, X } from 'lucide-react';

import { useAppDataSourceMode } from '../../services/AppServicesContext';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import { useConsoleLogStream } from '../console/useConsoleLogStream';
import { buildBottomOperationalDrawerLogModel } from './bottomOperationalDrawerLogModel';
import { bottomOperationalDrawerClasses } from './chrome';
import { resolveShellTopBarCopy } from './copy';
import {
  useOperationalDrawerContributionStore,
  type OperationalDrawerTabId,
} from './operationalDrawerContributionStore';
import {
  BottomOperationalDrawerBody,
  BottomOperationalDrawerTabs,
} from './OperationalDrawerPanels';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

const XtermConsole = lazy(() => import('../console/XtermConsole'));

function BottomOperationalLogBody({
  model,
}: Readonly<{
  model: ReturnType<typeof buildBottomOperationalDrawerLogModel>;
}>): JSX.Element {
  if (model.kind === 'idle') {
    return (
      <div
        data-slot="bottom-operational-drawer-idle"
        className={bottomOperationalDrawerClasses.bodyMessage}
      >
        {model.message}
      </div>
    );
  }

  if (model.kind === 'loading') {
    return (
      <div
        data-slot="bottom-operational-drawer-loading"
        className={bottomOperationalDrawerClasses.bodyMessage}
      >
        {model.message}
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div
          data-slot="bottom-operational-drawer-terminal-loading"
          className={bottomOperationalDrawerClasses.bodyMessage}
        >
          Loading terminal...
        </div>
      }
    >
      <div
        data-slot="bottom-operational-drawer-stream"
        className={bottomOperationalDrawerClasses.stream}
      >
        <XtermConsole lines={[...model.lines]} />
      </div>
    </Suspense>
  );
}

export function BottomOperationalDrawer() {
  const copy = resolveShellTopBarCopy();
  const hideBottomDrawer = useUiLayoutStore((state) => state.hideBottomDrawer);
  const contribution = useOperationalDrawerContributionStore((state) => state.contribution);
  const dataSourceMode = useAppDataSourceMode();
  const { lines, isLoading, runId } = useConsoleLogStream();
  const [activeOperationalTab, setActiveOperationalTab] = useState<OperationalDrawerTabId>('log');
  const model = buildBottomOperationalDrawerLogModel({
    title: copy.operationalDrawer,
    dataSourceMode,
    runId,
    isLoading,
    lines,
  });
  const drawerTitle = contribution?.title ?? model.title;

  useEffect(() => {
    if (contribution != null && !contribution.tabs.some((tab) => tab.id === activeOperationalTab)) {
      setActiveOperationalTab(contribution.tabs[0]?.id ?? 'log');
    }
  }, [activeOperationalTab, contribution]);

  return (
    <div data-slot="bottom-operational-drawer" className={bottomOperationalDrawerClasses.drawer}>
      <div
        data-slot="bottom-operational-drawer-header"
        className={bottomOperationalDrawerClasses.header}
      >
        <div
          data-slot="bottom-operational-drawer-title"
          className={bottomOperationalDrawerClasses.headerMain}
        >
          <Activity className={bottomOperationalDrawerClasses.titleIcon} />
          <span className={bottomOperationalDrawerClasses.title}>{drawerTitle}</span>
          {model.runLabel && (
            <Badge
              variant="outline"
              className={bottomOperationalDrawerClasses.runBadge}
              data-slot="bottom-operational-drawer-run-badge"
            >
              {model.runLabel}
            </Badge>
          )}
          {model.modeLabel && (
            <Badge
              variant="secondary"
              className={bottomOperationalDrawerClasses.modeBadge}
              data-slot="bottom-operational-drawer-mode-badge"
            >
              {model.modeLabel}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close operational drawer"
          className={bottomOperationalDrawerClasses.closeButton}
          onClick={hideBottomDrawer}
          data-slot="bottom-operational-drawer-close"
        >
          <X className={bottomOperationalDrawerClasses.closeIcon} />
        </Button>
      </div>

      {contribution == null ? null : (
        <BottomOperationalDrawerTabs
          activeTab={activeOperationalTab}
          contribution={contribution}
          onSelectTab={setActiveOperationalTab}
        />
      )}

      <div
        data-slot="bottom-operational-drawer-body"
        className={bottomOperationalDrawerClasses.body}
      >
        <BottomOperationalDrawerBody
          activeTab={activeOperationalTab}
          contribution={contribution}
          logBody={<BottomOperationalLogBody model={model} />}
        />
      </div>
    </div>
  );
}

export default BottomOperationalDrawer;
