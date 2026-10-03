/** Owned concern: render one card-owned operational data sample. */
import type { ReactNode } from 'react';

import { OperationalDrawerDataTable } from './OperationalDrawerDataTable';
import { OperationalDrawerLivePreviewFacts } from './OperationalDrawerLivePreviewFacts';
import {
  OperationalDrawerDataNotice,
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
        {'provenance' in state.sample ? (
          <OperationalDrawerLivePreviewFacts
            provenance={state.sample.provenance}
            copy={contribution.copy}
          />
        ) : null}
        <div
          data-slot="data-sample-summary"
          className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-(--border-subtle) pb-2"
        >
          <h3 className="min-w-0 truncate text-sm font-semibold text-(--text-primary)">
            {caption}
          </h3>
          <div className="flex items-center gap-2 text-[11px] tabular-nums text-(--text-muted)">
            <span className="rounded border border-(--border-subtle) px-2 py-0.5">
              {state.sample.rows.length} {contribution.copy.dataRowsLabel}
            </span>
            <span className="rounded border border-(--border-subtle) px-2 py-0.5">
              {state.sample.columns.length} {contribution.copy.dataColumnsLabel}
            </span>
          </div>
        </div>
        {state.sample.truncated ? (
          <OperationalDrawerDataNotice>
            {formatDataSampleTemplate(contribution.copy.dataTruncatedTemplate, {
              nodeName: state.nodeName,
              limit: String(state.sample.limit),
            })}
          </OperationalDrawerDataNotice>
        ) : null}
        <OperationalDrawerDataTable
          key={'objectId' in state.sample ? state.sample.objectId : state.sample.transformNodeId}
          caption={caption}
          columns={state.sample.columns}
          rows={state.sample.rows}
          nullValueLabel={contribution.copy.dataNullValue}
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
    >
      {onRefresh == null ? null : (
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            data-slot="data-sample-refresh"
            aria-disabled={state.status === 'loading'}
            aria-busy={state.status === 'loading'}
            onClick={state.status === 'loading' ? undefined : onRefresh}
            className="rounded border border-(--border-subtle) px-3 py-1 text-xs text-(--text-primary) hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--accent) aria-disabled:cursor-wait aria-disabled:opacity-50"
          >
            {contribution.copy.dataRefreshAction}
          </button>
        </div>
      )}
      {content}
    </OperationalDrawerPanelSurface>
  );
}
