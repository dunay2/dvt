/** Owned concern: render route-contributed operational drawer panels. */
import type { ReactNode } from 'react';

import {
  OperationalDrawerCodeToken,
  OperationalDrawerDetailCode,
  OperationalDrawerEmptyState,
  OperationalDrawerPanelSurface,
  OperationalDrawerPrimaryAction,
  OperationalDrawerSectionKicker,
  OperationalDrawerTabs,
  OperationalDrawerWarningBadge,
} from './OperationalDrawerPanelPrimitives';
import type {
  OperationalDrawerContribution,
  OperationalDrawerTabId,
} from './operationalDrawerContributionStore';

function BottomOperationalProblemItem({
  problem,
}: Readonly<{ problem: OperationalDrawerContribution['problems']['items'][number] }>): JSX.Element {
  return (
    <li
      key={problem.id}
      className="grid grid-cols-[6rem_1fr] gap-3 border-b border-[color:var(--border-muted)] py-2 text-sm last:border-b-0"
    >
      <OperationalDrawerWarningBadge dataSlot="bottom-operational-problem-severity">
        {problem.severity}
      </OperationalDrawerWarningBadge>
      <span className="min-w-0">
        <span className="block text-[var(--text-default)]">{problem.message}</span>
        <OperationalDrawerDetailCode>{problem.detail}</OperationalDrawerDetailCode>
      </span>
    </li>
  );
}

export function BottomOperationalProblemsPanel({
  contribution,
}: Readonly<{ contribution: OperationalDrawerContribution }>): JSX.Element {
  const problems = contribution.problems.items;

  return (
    <OperationalDrawerPanelSurface
      dataSlot="bottom-operational-drawer-problems"
      ariaLabel="Canvas problems"
    >
      {problems.length === 0 ? (
        <OperationalDrawerEmptyState>No current Canvas problems.</OperationalDrawerEmptyState>
      ) : (
        <ol className="space-y-2">
          {problems.map((problem) => (
            <BottomOperationalProblemItem key={problem.id} problem={problem} />
          ))}
        </ol>
      )}
    </OperationalDrawerPanelSurface>
  );
}

export function BottomOperationalRunsPanel({
  contribution,
}: Readonly<{ contribution: OperationalDrawerContribution }>): JSX.Element {
  return (
    <OperationalDrawerPanelSurface
      dataSlot="bottom-operational-drawer-runs"
      ariaLabel="Canvas runs"
      textSm
    >
      {contribution.runs.activeRunId == null ? (
        <OperationalDrawerEmptyState>No active Canvas run.</OperationalDrawerEmptyState>
      ) : (
        <div className="grid gap-1">
          <span className="text-[var(--text-muted)]">Active run</span>
          <code className="font-mono text-[var(--text-strong)]">
            {contribution.runs.activeRunId}
          </code>
        </div>
      )}
    </OperationalDrawerPanelSurface>
  );
}

export function BottomOperationalPreviewPanel({
  contribution,
}: Readonly<{ contribution: OperationalDrawerContribution }>): JSX.Element {
  return (
    <OperationalDrawerPanelSurface
      dataSlot="bottom-operational-drawer-preview"
      ariaLabel="Canvas execution preview"
      textSm
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <OperationalDrawerSectionKicker>
            {contribution.preview.status === 'ready' ? 'Preview ready' : 'Preview blocked'}
          </OperationalDrawerSectionKicker>
          <p className="mt-1 text-[var(--text-default)]">{contribution.preview.summary}</p>
          {contribution.preview.blockers.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {contribution.preview.blockers.map((blocker) => (
                <OperationalDrawerCodeToken
                  key={blocker}
                  dataSlot="bottom-operational-preview-blocker"
                >
                  {blocker}
                </OperationalDrawerCodeToken>
              ))}
            </div>
          ) : null}
        </div>
        <OperationalDrawerPrimaryAction
          disabled={!contribution.preview.canPreview}
          onClick={contribution.preview.onPreviewExecutionPlan}
        >
          Preview execution plan
        </OperationalDrawerPrimaryAction>
      </div>
    </OperationalDrawerPanelSurface>
  );
}

export function BottomOperationalDrawerTabs({
  activeTab,
  contribution,
  onSelectTab,
}: Readonly<{
  activeTab: OperationalDrawerTabId;
  contribution: OperationalDrawerContribution;
  onSelectTab: (tab: OperationalDrawerTabId) => void;
}>): JSX.Element {
  return (
    <OperationalDrawerTabs
      activeTab={activeTab}
      ariaLabel="Canvas operational drawer"
      onSelectTab={onSelectTab}
      tabs={contribution.tabs}
    />
  );
}

export function BottomOperationalDrawerBody({
  activeTab,
  contribution,
  logBody,
}: Readonly<{
  activeTab: OperationalDrawerTabId;
  contribution: OperationalDrawerContribution | null;
  logBody: ReactNode;
}>): JSX.Element {
  if (contribution == null || activeTab === 'log') {
    return <>{logBody}</>;
  }

  if (activeTab === 'problems') {
    return <BottomOperationalProblemsPanel contribution={contribution} />;
  }

  if (activeTab === 'runs') {
    return <BottomOperationalRunsPanel contribution={contribution} />;
  }

  return <BottomOperationalPreviewPanel contribution={contribution} />;
}
