/** Owned concern: render route-contributed operational drawer panels. */
import type { ReactNode } from 'react';

import { RunControlActions } from '../runs/RunControlActions';
import {
  OperationalDrawerEmptyState,
  OperationalDrawerDataNotice,
  OperationalDrawerDataTable,
  OperationalDrawerPanelSurface,
  OperationalDrawerPreviewLayout,
  OperationalDrawerPreviewSummary,
  OperationalDrawerPrimaryAction,
  OperationalDrawerProblemItem,
  OperationalDrawerProblemList,
  OperationalDrawerRunActiveSummary,
  OperationalDrawerRunLayout,
  OperationalDrawerRunStatusSummary,
  OperationalDrawerTabPanel,
} from './OperationalDrawerPanelPrimitives';
import type {
  OperationalDrawerContribution,
  OperationalDrawerTabId,
} from './operationalDrawerContributionStore';
import { OperationalDrawerSelectionRecoveryView } from './OperationalDrawerSelectionRecoveryView';

function formatDataSampleTemplate(
  template: string,
  values: Readonly<Record<'nodeName' | 'limit', string>>
): string {
  return template.replaceAll('{nodeName}', values.nodeName).replaceAll('{limit}', values.limit);
}

export function BottomOperationalDataSamplePanel({
  contribution,
}: Readonly<{ contribution: OperationalDrawerContribution }>): JSX.Element {
  const state = contribution.dataSample;
  let content: ReactNode;

  if (state.status === 'idle') {
    content = (
      <OperationalDrawerEmptyState>{contribution.copy.dataIdleMessage}</OperationalDrawerEmptyState>
    );
  } else if (state.status === 'loading') {
    content = (
      <p role="status">
        {formatDataSampleTemplate(contribution.copy.dataLoadingTemplate, {
          nodeName: state.nodeName,
          limit: '',
        })}
      </p>
    );
  } else if (state.status === 'error') {
    const template =
      state.reason === 'connection_not_found'
        ? contribution.copy.dataConnectionNotFoundTemplate
        : state.reason === 'source_object_not_found'
          ? contribution.copy.dataSourceObjectNotFoundTemplate
          : state.reason === 'unavailable'
            ? contribution.copy.dataUnavailableTemplate
            : contribution.copy.dataUnknownErrorTemplate;
    content = (
      <p role="alert">
        {formatDataSampleTemplate(template, { nodeName: state.nodeName, limit: '' })}
      </p>
    );
  } else if (state.sample.rows.length === 0) {
    content = (
      <OperationalDrawerEmptyState>
        {formatDataSampleTemplate(contribution.copy.dataEmptyTemplate, {
          nodeName: state.nodeName,
          limit: String(state.sample.limit),
        })}
      </OperationalDrawerEmptyState>
    );
  } else {
    content = (
      <>
        {state.sample.truncated ? (
          <OperationalDrawerDataNotice>
            {formatDataSampleTemplate(contribution.copy.dataTruncatedTemplate, {
              nodeName: state.nodeName,
              limit: String(state.sample.limit),
            })}
          </OperationalDrawerDataNotice>
        ) : null}
        <OperationalDrawerDataTable
          caption={formatDataSampleTemplate(contribution.copy.dataCaptionTemplate, {
            nodeName: state.nodeName,
            limit: String(state.sample.limit),
          })}
          columns={state.sample.columns}
          rows={state.sample.rows}
          nullValueLabel={contribution.copy.dataNullValue}
        />
      </>
    );
  }

  return (
    <OperationalDrawerPanelSurface
      dataSlot="bottom-operational-drawer-data"
      ariaLabel={contribution.copy.dataAriaLabel}
      textSm
    >
      {content}
    </OperationalDrawerPanelSurface>
  );
}

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

export function BottomOperationalDrawerBody({
  activeTab,
  contribution,
  logBody,
}: Readonly<{
  activeTab: OperationalDrawerTabId | null;
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
  } else if (activeTab === 'data') {
    activeBody = <BottomOperationalDataSamplePanel contribution={contribution} />;
  }

  return (
    <>
      {contribution.tabs.map((tab) => (
        <OperationalDrawerTabPanel key={tab.id} active={activeTab === tab.id} tabId={tab.id}>
          {activeBody}
        </OperationalDrawerTabPanel>
      ))}
    </>
  );
}
