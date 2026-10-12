/** Owned concern: render one card-owned operational data sample. */
import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

import { OperationalDrawerDataTable } from './OperationalDrawerDataTable';
import { OperationalDrawerLivePreviewFacts } from './OperationalDrawerLivePreviewFacts';
import styles from './OperationalDrawerDataTable.module.css';
import {
  OperationalDrawerEmptyState,
  OperationalDrawerPanelSurface,
} from './OperationalDrawerPanelPrimitives';
import type {
  OperationalDrawerContribution,
  OperationalDrawerDataSample,
} from './operationalDrawerContributionStore';

function formatDataSampleTemplate(
  template: string,
  values: Readonly<Record<'nodeName' | 'limit', string>>
): string {
  return template.replaceAll('{nodeName}', values.nodeName).replaceAll('{limit}', values.limit);
}

export function OperationalDrawerDataSamplePanel({
  contribution,
  dataSample: state,
  onRefresh,
}: Readonly<{
  contribution: OperationalDrawerContribution;
  dataSample: OperationalDrawerDataSample;
  onRefresh?: () => void;
}>): JSX.Element {
  let content: ReactNode;
  const busy =
    state.status === 'loading' || (state.status === 'ready' && state.refreshing === true);
  const refresh =
    onRefresh == null ? null : (
      <button
        type="button"
        data-slot="data-sample-refresh"
        aria-label={contribution.copy.dataRefreshAction}
        title={contribution.copy.dataRefreshAction}
        aria-disabled={busy}
        aria-busy={busy}
        onClick={busy ? undefined : onRefresh}
      >
        <RefreshCw aria-hidden="true" />
        {state.status === 'ready' && busy ? (
          <span role="status" className={styles.srOnly}>
            {formatDataSampleTemplate(contribution.copy.dataLoadingTemplate, {
              nodeName: state.nodeName,
              limit: '',
            })}
          </span>
        ) : null}
      </button>
    );

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
  } else {
    const caption = formatDataSampleTemplate(contribution.copy.dataCaptionTemplate, {
      nodeName: state.nodeName,
      limit: String(state.sample.limit),
    });
    content = (
      <>
        <OperationalDrawerDataTable
          key={'objectId' in state.sample ? state.sample.objectId : state.sample.transformNodeId}
          caption={caption}
          columns={state.sample.columns}
          rows={state.sample.rows}
          nullValueLabel={contribution.copy.dataNullValue}
          toolbarActions={refresh}
          footer={
            <>
              <span data-slot="data-sample-summary" className={styles.sampleSummary}>
                <span>
                  {state.sample.rows.length} {contribution.copy.dataRowsLabel}
                </span>
                <span>
                  {state.sample.columns.length} {contribution.copy.dataColumnsLabel}
                </span>
              </span>
              <OperationalDrawerLivePreviewFacts
                provenance={state.sample.provenance}
                copy={contribution.copy}
                nodeName={state.nodeName}
                notice={
                  state.sample.truncated
                    ? formatDataSampleTemplate(contribution.copy.dataTruncatedTemplate, {
                        nodeName: state.nodeName,
                        limit: String(state.sample.limit),
                      })
                    : undefined
                }
              />
            </>
          }
        />
        {state.sample.rows.length === 0 ? (
          <OperationalDrawerEmptyState>
            {formatDataSampleTemplate(contribution.copy.dataEmptyTemplate, {
              nodeName: state.nodeName,
              limit: String(state.sample.limit),
            })}
          </OperationalDrawerEmptyState>
        ) : null}
      </>
    );
  }

  return (
    <OperationalDrawerPanelSurface
      dataSlot="bottom-operational-drawer-data"
      ariaLabel={contribution.copy.dataAriaLabel}
      textSm
      className={styles.samplePanel}
    >
      {state.status === 'ready' ? null : <div className={styles.actions}>{refresh}</div>}
      {content}
    </OperationalDrawerPanelSurface>
  );
}
