import { RouteWorkbenchFrame } from '../components/workbench/RouteWorkbenchFrame';
import { LineageBreadcrumb } from './lineage/LineageBreadcrumb';
import { LineageColumnPanel } from './lineage/LineageColumnPanel';
import { LineageGraphPanel } from './lineage/LineageGraphPanel';
import { LineageHeader } from './lineage/LineageHeader';
import { LineageImpactSummary } from './lineage/LineageImpactSummary';
import { lineageViewCopy as copy } from './lineage/copy';
import { useLineageViewData } from './lineage/useLineageViewData';

export default function LineageView() {
  const {
    searchQuery,
    columnLevel,
    setSearchQuery,
    setColumnLevel,
    isLoading,
    canonicalNodes,
    focusNode,
    nodesByLevel,
    breadcrumbPath,
    columnLineage,
    upstreamCount,
    downstreamCount,
    exposureCount,
  } = useLineageViewData();

  return (
    <RouteWorkbenchFrame
      header={
        <>
          <LineageHeader
            searchQuery={searchQuery}
            columnLevel={columnLevel}
            isLoading={isLoading}
            nodeCount={canonicalNodes.length}
            onSearchQueryChange={setSearchQuery}
            onColumnLevelChange={setColumnLevel}
          />
          <LineageBreadcrumb nodes={breadcrumbPath} focusNodeId={focusNode?.id} />
        </>
      }
      bodyContainerClassName="mx-auto max-w-4xl space-y-4"
    >
      {!focusNode && !isLoading ? (
        <p className="text-sm text-[var(--text-muted)]">{copy.noNodesLoaded}</p>
      ) : null}

      {!columnLevel ? (
        <>
          <LineageGraphPanel focusNode={focusNode} nodesByLevel={nodesByLevel} />
          <LineageImpactSummary
            upstreamCount={upstreamCount}
            downstreamCount={downstreamCount}
            exposureCount={exposureCount}
          />
        </>
      ) : (
        <LineageColumnPanel focusNode={focusNode} columnLineage={columnLineage} />
      )}
    </RouteWorkbenchFrame>
  );
}
