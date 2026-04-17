import { usePublishedRouteBootstrap } from '../bootstrap/usePublishedRouteBootstrap';
import { RouteWorkbenchFrame } from '../components/workbench/RouteWorkbenchFrame';
import { LineageBreadcrumb } from './lineage/LineageBreadcrumb';
import { LineageColumnPanel } from './lineage/LineageColumnPanel';
import { LineageGraphPanel } from './lineage/LineageGraphPanel';
import { LineageHeader } from './lineage/LineageHeader';
import { LineageImpactSummary } from './lineage/LineageImpactSummary';
import {
  LineageEmptyStateView,
  LineageErrorStateView,
  LineageLoadingStateView,
  LineageMetadataMissingStateView,
} from './lineage/LineageStateViews';
import { lineageViewCopy as copy } from './lineage/copy';
import {
  buildLineageColumnState,
  buildLineageWorkbenchState,
} from './lineage/lineageWorkbenchStateModel';
import { deriveLineageRouteBootstrapPresentation } from './lineage/lineageRouteBootstrap';
import { useLineageViewData } from './lineage/useLineageViewData';

export default function LineageView() {
  const {
    searchQuery,
    columnLevel,
    setSearchQuery,
    setColumnLevel,
    isLoadingSnapshot,
    snapshotError,
    focusNodeHasColumnMetadata,
    hasReachableUpstreamNodes,
    reachableUpstreamHasColumnMetadata,
    canonicalNodes,
    focusNode,
    nodesByLevel,
    breadcrumbPath,
    columnLineage,
    upstreamCount,
    downstreamCount,
    exposureCount,
  } = useLineageViewData();

  const header = (
    <>
      <LineageHeader
        searchQuery={searchQuery}
        columnLevel={columnLevel}
        isLoading={isLoadingSnapshot}
        nodeCount={canonicalNodes.length}
        onSearchQueryChange={setSearchQuery}
        onColumnLevelChange={setColumnLevel}
      />
      <LineageBreadcrumb nodes={breadcrumbPath} focusNodeId={focusNode?.id} />
    </>
  );

  const workbenchState = buildLineageWorkbenchState({
    canonicalNodes,
    focusNode,
    isLoadingSnapshot,
    snapshotError,
    snapshotErrorMessage: snapshotError?.message ?? copy.routeErrorFallbackMessage,
  });
  usePublishedRouteBootstrap(
    deriveLineageRouteBootstrapPresentation(workbenchState)
  );

  switch (workbenchState.kind) {
    case 'loading':
      return <LineageLoadingStateView header={header} />;
    case 'error':
      return <LineageErrorStateView header={header} message={workbenchState.message} />;
    case 'empty':
      return <LineageEmptyStateView header={header} />;
    case 'ready':
      break;
  }

  if (!focusNode) {
    return <LineageEmptyStateView header={header} />;
  }

  const columnState = buildLineageColumnState({
    focusNodeHasColumnMetadata,
    hasReachableUpstreamNodes,
    reachableUpstreamHasColumnMetadata,
    columnLineageCount: columnLineage.length,
  });

  return (
    <RouteWorkbenchFrame header={header} bodyContainerClassName="mx-auto max-w-4xl space-y-4">
      {!columnLevel ? (
        <>
          <LineageGraphPanel focusNode={focusNode} nodesByLevel={nodesByLevel} />
          <LineageImpactSummary
            upstreamCount={upstreamCount}
            downstreamCount={downstreamCount}
            exposureCount={exposureCount}
          />
        </>
      ) : columnState.kind === 'metadata-missing' ? (
        <LineageMetadataMissingStateView focusNodeName={focusNode.name} />
      ) : (
        <LineageColumnPanel focusNode={focusNode} columnLineage={columnLineage} />
      )}
    </RouteWorkbenchFrame>
  );
}
