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
          key={'objectId' in state.sample ? state.sample.objectId : state.sample.transformNodeId}
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
