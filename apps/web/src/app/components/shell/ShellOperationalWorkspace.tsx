/** Owned concern: show the existing operational reads in the workbench from the left rail. */
import { Suspense, lazy } from 'react';

import { resolveRunEventFeedHealthCopy } from '../../services/runs/runEventFeedHealthCopy';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { useConsoleLogStream } from '../console/useConsoleLogStream';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  routeWorkbenchClassName,
  routeWorkbenchHeaderBandClassName,
} from '../workbench/RouteWorkbenchFrame';
import { buildBottomOperationalDrawerLogModel } from './bottomOperationalDrawerLogModel';
import { BottomOperationalProblemsPanel } from './OperationalDrawerPanels';
import { useOperationalDrawerContributionStore } from './operationalDrawerContributionStore';
import type { ShellTopBarCopy } from './copy';
import type { ShellOperationalView } from './types';
import styles from './ShellOperationalWorkspace.module.css';

const XtermConsole = lazy(() => import('../console/XtermConsole'));

function OperationalLogBody({
  model,
  onRetry,
}: Readonly<{
  model: ReturnType<typeof buildBottomOperationalDrawerLogModel>;
  onRetry: () => void;
}>): JSX.Element {
  if (model.kind === 'idle') {
    return (
      <div data-slot="shell-operational-log-idle" className={styles.bodyMessage}>
        {model.message}
      </div>
    );
  }

  return (
    <div className={styles.logBody}>
      <div
        role="status"
        aria-live="polite"
        data-slot="shell-operational-feed-health"
        data-state={model.healthState}
        className={styles.feedHealth}
      >
        <Badge variant="outline" className={styles.feedHealthBadge}>
          {model.statusLabel}
        </Badge>
        {model.runLabel == null ? null : (
          <Badge
            variant="outline"
            className={styles.runBadge}
            data-slot="shell-operational-log-run"
          >
            {model.runLabel}
          </Badge>
        )}
        <span className={styles.feedHealthMessage}>{model.message}</span>
        {model.canRetry ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={styles.feedRetry}
            data-slot="shell-operational-feed-retry"
            onClick={onRetry}
          >
            {model.retryLabel}
          </Button>
        ) : null}
      </div>

      {model.lines.length > 0 ? (
        <Suspense
          fallback={
            <div data-slot="shell-operational-log-terminal-loading" className={styles.bodyMessage}>
              {model.terminalLoadingLabel}
            </div>
          }
        >
          <div data-slot="shell-operational-log-stream" className={styles.stream}>
            <XtermConsole key={model.runLabel} lines={[...model.lines]} />
          </div>
        </Suspense>
      ) : null}
    </div>
  );
}

export function ShellOperationalWorkspace({
  view,
  copy,
}: Readonly<{ view: ShellOperationalView; copy: ShellTopBarCopy }>): JSX.Element {
  const contribution = useOperationalDrawerContributionStore((state) =>
    view === 'problems' ? state.contribution : null
  );
  const title = view === 'log' ? copy.operationalDrawerLog : copy.operationalDrawerProblems;
  return (
    <section
      id="shell-operational-workspace"
      data-slot="shell-operational-workspace"
      data-view={view}
      aria-labelledby="shell-operational-workspace-title"
      className={routeWorkbenchClassName}
    >
      <header className={routeWorkbenchHeaderBandClassName}>
        <h1 id="shell-operational-workspace-title" className={styles.title}>
          {title}
        </h1>
      </header>
      <div className={styles.content}>
        {view === 'log' ? (
          <OperationalLogView title={title} />
        ) : contribution == null ? null : (
          <BottomOperationalProblemsPanel contribution={contribution} />
        )}
      </div>
    </section>
  );
}

function OperationalLogView({ title }: Readonly<{ title: string }>): JSX.Element {
  const locale = useApplicationLanguageStore((state) => state.language);
  const { lines, runId, health, retry } = useConsoleLogStream();
  const model = buildBottomOperationalDrawerLogModel({
    title,
    runId,
    health,
    copy: resolveRunEventFeedHealthCopy(locale),
    lines,
  });
  return <OperationalLogBody model={model} onRetry={retry} />;
}
