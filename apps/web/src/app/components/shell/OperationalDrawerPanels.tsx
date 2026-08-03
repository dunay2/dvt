/** Owned concern: render route-contributed operational drawer panels. */
import type { ReactNode } from 'react';

import { RunControlActions } from '../runs/RunControlActions';
import {
  OperationalDrawerEmptyState,
  OperationalDrawerPanelSurface,
  OperationalDrawerPreviewLayout,
  OperationalDrawerPreviewSummary,
  OperationalDrawerPrimaryAction,
  OperationalDrawerProblemItem,
  OperationalDrawerProblemList,
  OperationalDrawerRunActiveSummary,
  OperationalDrawerRunLayout,
  OperationalDrawerRunStatusSummary,
  OperationalDrawerTabs,
} from './OperationalDrawerPanelPrimitives';
import type {
  OperationalDrawerContribution,
  OperationalDrawerTabId,
} from './operationalDrawerContributionStore';
import { OperationalDrawerSelectionRecoveryView } from './OperationalDrawerSelectionRecoveryView';

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
              action={problem.action}
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
        <OperationalDrawerRunStatusSummary
          statusLabel={
            contribution.runs.status === 'ready'
              ? 'Run ready'
              : contribution.runs.status === 'blocked'
                ? 'Run blocked'
                : 'Run active'
          }
          summary={contribution.runs.summary}
        />
      ) : (
        <OperationalDrawerRunLayout
          actions={
            contribution.runs.controls == null ? null : (
              <RunControlActions
                runId={contribution.runs.controls.runId}
                availability={contribution.runs.controls.availability}
                activity={contribution.runs.controls.activity}
                outcome={contribution.runs.controls.outcome}
                failure={contribution.runs.controls.failure}
                onCancel={contribution.runs.controls.onCancel}
                onRecover={contribution.runs.controls.onRecover}
                compact={false}
              />
            )
          }
        >
          <OperationalDrawerRunActiveSummary
            activeRunId={contribution.runs.activeRunId}
            summary={contribution.runs.summary}
          />
        </OperationalDrawerRunLayout>
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
      <>
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
        {contribution.preview.selectionRecovery == null ? null : (
          <OperationalDrawerSelectionRecoveryView
            model={contribution.preview.selectionRecovery.model}
            commands={contribution.preview.selectionRecovery.commands}
            messages={contribution.preview.selectionRecovery.messages}
          />
        )}
      </>
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
