/** Owned concern: render route-contributed operational drawer panels. */
import type { ReactNode } from 'react';

import {
  OperationalDrawerEmptyState,
  OperationalDrawerPanelSurface,
  OperationalDrawerPreviewLayout,
  OperationalDrawerPreviewSummary,
  OperationalDrawerPrimaryAction,
  OperationalDrawerProblemItem,
  OperationalDrawerProblemList,
  OperationalDrawerRunActiveSummary,
  OperationalDrawerTabs,
} from './OperationalDrawerPanelPrimitives';
import type {
  OperationalDrawerContribution,
  OperationalDrawerTabId,
} from './operationalDrawerContributionStore';

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
        <OperationalDrawerProblemList>
          {problems.map((problem) => (
            <OperationalDrawerProblemItem
              key={problem.id}
              detail={problem.detail}
              message={problem.message}
              severity={problem.severity}
            />
          ))}
        </OperationalDrawerProblemList>
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
        <OperationalDrawerRunActiveSummary activeRunId={contribution.runs.activeRunId} />
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
      <OperationalDrawerPreviewLayout
        action={
          <OperationalDrawerPrimaryAction
            disabled={!contribution.preview.canPreview}
            onClick={contribution.preview.onPreviewExecutionPlan}
          >
            Preview execution plan
          </OperationalDrawerPrimaryAction>
        }
      >
        <OperationalDrawerPreviewSummary
          blockers={contribution.preview.blockers}
          statusLabel={
            contribution.preview.status === 'ready' ? 'Preview ready' : 'Preview blocked'
          }
          summary={contribution.preview.summary}
        />
      </OperationalDrawerPreviewLayout>
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
