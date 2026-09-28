/** Owned concern: render one card-owned operational data sample. */
import type { ReactNode } from 'react';

import { OperationalDrawerDataTable } from './OperationalDrawerDataTable';
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
}: Readonly<{
  contribution: OperationalDrawerContribution;
  dataSample: OperationalDrawerDataSample;
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
    const caption = formatDataSampleTemplate(contribution.copy.dataCaptionTemplate, {
      nodeName: state.nodeName,
      limit: String(state.sample.limit),
    });
    content = (
      <>
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
