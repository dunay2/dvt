/** Owned concern: render route-contributed operational drawer panels. */
import type { ReactNode } from 'react';

import { OperationalDrawerDataSamplePanel } from './OperationalDrawerDataSamplePanel';
import {
  OperationalDrawerEmptyState,
  OperationalDrawerPanelSurface,
  OperationalDrawerPreviewLayout,
  OperationalDrawerPreviewSummary,
  OperationalDrawerPrimaryAction,
  OperationalDrawerProblemItem,
  OperationalDrawerProblemList,
  OperationalDrawerTabPanel,
} from './OperationalDrawerPanelPrimitives';
import type {
  OperationalDrawerContribution,
  OperationalDrawerTab,
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

export function BottomOperationalDrawerBody({
  activeTab,
  contribution,
}: Readonly<{
  activeTab: OperationalDrawerTabId | null;
  contribution: OperationalDrawerContribution | null;
}>): JSX.Element | null {
  if (contribution == null) return null;
  const renderTabBody = (tab: OperationalDrawerTab): ReactNode => {
    if (tab.content !== undefined) return tab.content;
    if (tab.id === 'preview') return <BottomOperationalPreviewPanel contribution={contribution} />;
    if (tab.dataSample !== undefined) {
      return (
        <OperationalDrawerDataSamplePanel
          contribution={contribution}
          dataSample={tab.dataSample}
          onRefresh={tab.onRefresh}
        />
      );
    }
    return null;
  };

  return (
    <>
      {contribution.tabs.map((tab) => (
        <OperationalDrawerTabPanel key={tab.id} active={activeTab === tab.id} tabId={tab.id}>
          {renderTabBody(tab)}
        </OperationalDrawerTabPanel>
      ))}
    </>
  );
}
