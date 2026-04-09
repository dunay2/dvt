import { useMemo, useState } from 'react';

import {
  useWorkspaceDiffChangesQuery,
  useWorkspaceFileContentQuery,
  useWorkspaceGraphForViewQuery,
} from '../../queries/workspaceQueries';
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
  const [compareMode, setCompareMode] = useState<DiffCompareMode>('git');
  const [severityFilter, setSeverityFilter] = useState<DiffSeverityFilter>('all');
  const diffChangesQuery = useWorkspaceDiffChangesQuery();
  const graphSnapshotQuery = useWorkspaceGraphForViewQuery('diff-view');
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
  const fileContentQuery = useWorkspaceFileContentQuery(primaryNode?.path);
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
