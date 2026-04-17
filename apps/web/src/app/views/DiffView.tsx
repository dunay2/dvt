import { usePublishedRouteBootstrap } from '../bootstrap/usePublishedRouteBootstrap';
import { RouteWorkbenchFrame } from '../components/workbench/RouteWorkbenchFrame';
import { DiffHeader } from './diff/DiffHeader';
import {
  DiffEmptyStateView,
  DiffErrorStateView,
  DiffLoadingStateView,
} from './diff/DiffStateViews';
import { DiffSummaryCards } from './diff/DiffSummaryCards';
import { DiffTabs } from './diff/DiffTabs';
import {
  buildDiffCompareContextState,
  buildDiffSqlContextState,
  buildDiffWorkbenchState,
} from './diff/diffWorkbenchStateModel';
import { deriveDiffRouteBootstrapPresentation } from './diff/diffRouteBootstrap';
import { useDiffData } from './diff/useDiffData';

export default function DiffView() {
  const {
    catalogDocument,
    compareMode,
    comparePreset,
    diffChangesQuery,
    fileContentQuery,
    graphSnapshotQuery,
    primaryNode,
    severityFilter,
    filteredChanges,
    sqlDocument,
    summary,
    setCompareMode,
    setSeverityFilter,
  } = useDiffData();
  const header = (
    <>
      <DiffHeader
        compareMode={compareMode}
        severityFilter={severityFilter}
        comparePreset={comparePreset}
        onCompareModeChange={setCompareMode}
        onSeverityFilterChange={setSeverityFilter}
      />
      <DiffSummaryCards summary={summary} />
    </>
  );
  const workbenchState = buildDiffWorkbenchState({
    diffChanges: diffChangesQuery.data ?? [],
    isLoadingDiffChanges: diffChangesQuery.isPending,
    diffChangesError: diffChangesQuery.error,
    diffChangesErrorMessage:
      diffChangesQuery.error instanceof Error
        ? diffChangesQuery.error.message
        : 'Unable to load diff changes.',
  });
  const compareContextState = buildDiffCompareContextState({
    primaryNode,
    isLoadingGraphSnapshot: graphSnapshotQuery.isPending,
    graphSnapshotError: graphSnapshotQuery.error,
  });
  const sqlContextState = buildDiffSqlContextState({
    primaryNode,
    isLoadingGraphSnapshot: graphSnapshotQuery.isPending,
    graphSnapshotError: graphSnapshotQuery.error,
    isLoadingFileContent: fileContentQuery.isPending,
    fileContentError: fileContentQuery.error,
    fileContentErrorMessage:
      fileContentQuery.error instanceof Error
        ? fileContentQuery.error.message
        : 'Unable to load SQL preview.',
    hasFileContent: fileContentQuery.data != null,
  });
  usePublishedRouteBootstrap(
    deriveDiffRouteBootstrapPresentation({
      workbenchState,
      compareContextState,
      sqlContextState,
    })
  );

  if (workbenchState.kind === 'loading') {
    return <DiffLoadingStateView header={header} />;
  }

  if (workbenchState.kind === 'error') {
    return <DiffErrorStateView header={header} message={workbenchState.message} />;
  }

  if (workbenchState.kind === 'empty') {
    return <DiffEmptyStateView header={header} />;
  }

  return (
    <RouteWorkbenchFrame header={header}>
      <DiffTabs
        catalogDocument={catalogDocument}
        compareContextState={compareContextState}
        changes={filteredChanges}
        sqlDocument={sqlDocument}
        sqlContextState={sqlContextState}
      />
    </RouteWorkbenchFrame>
  );
}
