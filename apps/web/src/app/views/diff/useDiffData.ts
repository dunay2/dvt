import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { queryKeys } from '../../queries/queryKeys';
import { useWorkspaceService } from '../../services/AppServicesContext';
import {
  buildCatalogDiffDocument,
  buildSqlDiffDocument,
  selectPrimaryDiffNode,
} from './diffReviewModel';
import {
  buildDiffSummary,
  filterDiffChanges,
  getComparePreset,
  type DiffCompareMode,
  type DiffSeverityFilter,
  type DiffSummary,
} from './diffViewModel';

export function useDiffData() {
  const workspaceService = useWorkspaceService();
  const [compareMode, setCompareMode] = useState<DiffCompareMode>('git');
  const [severityFilter, setSeverityFilter] = useState<DiffSeverityFilter>('all');
  const diffChangesQuery = useQuery({
    queryKey: queryKeys.workspace.diffChanges(),
    queryFn: () => workspaceService.getDiffChanges(),
  });
  const graphSnapshotQuery = useQuery({
    queryKey: queryKeys.workspace.graphForView('diff-view'),
    queryFn: () => workspaceService.getGraphSnapshot(),
  });
  const diffChanges = diffChangesQuery.data ?? [];
  const filteredChanges = useMemo(
    () => filterDiffChanges(diffChanges, severityFilter),
    [diffChanges, severityFilter]
  );
  const graphNodes = graphSnapshotQuery.data?.nodes ?? [];
  const primaryNode = useMemo(
    () => selectPrimaryDiffNode(diffChanges, graphNodes),
    [diffChanges, graphNodes]
  );
  const primaryNodeChanges = useMemo(
    () =>
      primaryNode
        ? diffChanges.filter(
            (change) => change.nodeId === primaryNode.id || change.nodeId === primaryNode.name
          )
        : [],
    [diffChanges, primaryNode]
  );
  const fileContentQuery = useQuery({
    enabled: primaryNode != null,
    queryKey: queryKeys.workspace.fileContent(primaryNode?.path ?? ''),
    queryFn: () => workspaceService.getFileContent(primaryNode?.path ?? ''),
  });
  const summary: DiffSummary = useMemo(() => buildDiffSummary(diffChanges), [diffChanges]);
  const comparePreset = useMemo(() => getComparePreset(compareMode), [compareMode]);
  const sqlDocument = useMemo(
    () => buildSqlDiffDocument(primaryNode, primaryNodeChanges, fileContentQuery.data ?? null),
    [fileContentQuery.data, primaryNode, primaryNodeChanges]
  );
  const catalogDocument = useMemo(
    () => buildCatalogDiffDocument(primaryNode, primaryNodeChanges),
    [primaryNode, primaryNodeChanges]
  );

  return {
    catalogDocument,
    compareMode,
    severityFilter,
    diffChangesQuery,
    fileContentQuery,
    filteredChanges,
    graphSnapshotQuery,
    primaryNode,
    summary,
    comparePreset,
    setCompareMode,
    setSeverityFilter,
    sqlDocument,
  };
}
