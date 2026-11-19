/**
 * Owned concern: build a complete Canvas operational contribution for Run presentation tests.
 * Why: readiness scenarios share a contract-shaped fixture.
 * Corner: overrides remain typed and never invent runtime authority.
 */
import { vi } from 'vitest';
import type { OperationalDrawerContribution } from './operationalDrawerContributionStore';

export function buildCanvasRunContribution(
  overrides?: Partial<OperationalDrawerContribution>
): OperationalDrawerContribution {
  const onStartRun = vi.fn();

  return {
    source: 'canvas',
    title: 'Canvas operations',
    copy: {
      problemsAriaLabel: 'Canvas problems',
      noProblemsMessage: 'No current Canvas problems.',
      previewAriaLabel: 'Canvas execution preview',
      previewAction: 'Create Execution Preview',
      previewReadyStatus: 'Preview ready',
      previewBlockedStatus: 'Preview blocked',
      dataAriaLabel: 'Source data sample',
      dataIdleMessage: 'Open a source sample.',
      dataLoadingTemplate: 'Loading {nodeName}.',
      dataEmptyTemplate: '{nodeName} returned no rows.',
      dataConnectionNotFoundTemplate: 'Connection missing for {nodeName}.',
      dataSourceObjectNotFoundTemplate: 'Object missing for {nodeName}.',
      dataUnavailableTemplate: 'Sample unavailable for {nodeName}.',
      dataUnknownErrorTemplate: 'Sample failed for {nodeName}.',
      dataTruncatedTemplate: 'Showing {limit} rows.',
      dataCaptionTemplate: 'Sample from {nodeName}',
      dataRowsLabel: 'rows',
      dataColumnsLabel: 'columns',
      dataNullValue: 'NULL',
      dataRefreshAction: 'Refresh',
      dataQueriedAtLabel: 'Queried at',
      dataBoundedLiveTemplate: 'Up to {limit} rows · First page only · No guaranteed row order.',
      tabsAriaLabel: 'Canvas operational drawer',
      severity: { info: 'Info', warning: 'Warning', error: 'Error' },
    },
    tabs: [{ id: 'preview', label: 'Preview', count: 1 }],
    problems: {
      items: [],
    },
    runs: {
      activeRunId: null,
      canStartRun: false,
      onStartRun,
      status: 'blocked',
    },
    preview: {
      status: 'blocked',
      summary: 'Preview required before running.',
      blockers: ['plan_integrity'],
      canPreview: true,
      onPreviewExecutionPlan: vi.fn(),
      selectionRecovery: null,
    },
    ...overrides,
  };
}
