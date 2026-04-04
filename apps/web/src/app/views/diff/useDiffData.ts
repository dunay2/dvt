import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { queryKeys } from '../../queries/queryKeys';
import { useWorkspaceService } from '../../services/AppServicesContext';
import {
  buildDiffSummary,
  filterDiffChanges,
  getComparePreset,
  type DiffCompareMode,
  type DiffSeverityFilter,
} from './diffViewModel';

export function useDiffData() {
  const workspaceService = useWorkspaceService();
  const [compareMode, setCompareMode] = useState<DiffCompareMode>('git');
  const [severityFilter, setSeverityFilter] = useState<DiffSeverityFilter>('all');
  const diffChangesQuery = useQuery({
    queryKey: queryKeys.workspace.diffChanges(),
    queryFn: () => workspaceService.getDiffChanges(),
  });
  const diffChanges = diffChangesQuery.data ?? [];
  const filteredChanges = useMemo(
    () => filterDiffChanges(diffChanges, severityFilter),
    [diffChanges, severityFilter]
  );
  const summary = useMemo(() => buildDiffSummary(diffChanges), [diffChanges]);
  const comparePreset = useMemo(() => getComparePreset(compareMode), [compareMode]);

  return {
    compareMode,
    severityFilter,
    diffChangesQuery,
    filteredChanges,
    summary,
    comparePreset,
    setCompareMode,
    setSeverityFilter,
  };
}
