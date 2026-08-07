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
      ariaLabel={contribution.copy.problemsAriaLabel}
    >
      {problems.length === 0 ? (
        <OperationalDrawerEmptyState>
          {contribution.copy.noProblemsMessage}
        </OperationalDrawerEmptyState>
      ) : (
        <OperationalDrawerProblemList>
          {problems.map((problem) => (
            <OperationalDrawerProblemItem
              key={problem.id}
              detail={problem.detail}
              message={problem.message}
              severityLabel={contribution.copy.severity[problem.severity]}
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
      ariaLabel={contribution.copy.runsAriaLabel}
      textSm
    >
      {contribution.runs.activeRunId == null ? (
        <OperationalDrawerRunStatusSummary
          statusLabel={
            contribution.runs.status === 'ready'
              ? contribution.copy.runReadyStatus
              : contribution.runs.status === 'blocked'
                ? contribution.copy.runBlockedStatus
                : contribution.copy.runActiveStatus
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
            statusLabel={contribution.copy.runActiveStatus}
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
      ariaLabel={contribution.copy.previewAriaLabel}
      textSm
    >
      <>
        <OperationalDrawerPreviewLayout
          action={
            <OperationalDrawerPrimaryAction
              dataSlot="bottom-operational-preview-action"
              disabled={!contribution.preview.canPreview}
              onClick={contribution.preview.onPreviewExecutionPlan}
            >
              {contribution.copy.previewAction}
            </OperationalDrawerPrimaryAction>
          }
        >
          <OperationalDrawerPreviewSummary
            blockers={contribution.preview.blockers}
            statusLabel={
              contribution.preview.status === 'ready'
                ? contribution.copy.previewReadyStatus
                : contribution.copy.previewBlockedStatus
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
      ariaLabel={contribution.copy.tabsAriaLabel}
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
  if (contribution == null) {
    return <>{logBody}</>;
  }

  let activeBody = logBody;

  if (activeTab === 'problems') {
    activeBody = <BottomOperationalProblemsPanel contribution={contribution} />;
  } else if (activeTab === 'runs') {
    activeBody = <BottomOperationalRunsPanel contribution={contribution} />;
  } else if (activeTab === 'preview') {
    activeBody = <BottomOperationalPreviewPanel contribution={contribution} />;
  }

  return (
    <>
      {contribution.tabs.map((tab) => (
        <div
          key={tab.id}
          id={`bottom-operational-drawer-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`bottom-operational-drawer-tab-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          hidden={activeTab !== tab.id}
          data-slot="bottom-operational-drawer-panel"
          data-tab={tab.id}
        >
          {activeTab === tab.id ? activeBody : null}
        </div>
      ))}
    </>
  );
}
