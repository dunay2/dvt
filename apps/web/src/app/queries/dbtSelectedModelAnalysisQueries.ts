/** Owned concern: isolate selected dbt model analysis by accepted context and revision. */
import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import type { DbtProjectFilesAuthorityBinding } from '../ports/dbtProjectGraph';
import {
  useDbtSelectedModelAnalysisQueryPort,
  useSessionContext,
} from '../services/AppServicesContext';
import { queryKeys } from './queryKeys';

export function useDbtSelectedModelAnalysisQuery(
  binding: DbtProjectFilesAuthorityBinding | undefined,
  selectedUniqueId: string | undefined,
  options: Readonly<{ enabled?: boolean; revisionToken?: string }> = {}
) {
  const port = useDbtSelectedModelAnalysisQueryPort();
  const sessionContext = useSessionContext();
  const scope = useSyncExternalStore(
    sessionContext.subscribeWorkspaceScope,
    sessionContext.getWorkspaceScopeSnapshot,
    sessionContext.getWorkspaceScopeSnapshot
  );
  const hasContext = Boolean(
    scope.tenantId.trim() &&
    scope.projectId.trim() &&
    scope.environmentId.trim() &&
    binding?.canvasId.trim() &&
    binding.authority.kind === 'dbt-project-files' &&
    binding.authority.projectRoot.trim() &&
    selectedUniqueId?.trim()
  );

  return useQuery({
    enabled: hasContext && (options.enabled ?? true),
    queryKey: queryKeys.workspace.dbtSelectedModelAnalysis(
      scope.tenantId,
      scope.projectId,
      scope.environmentId,
      binding?.canvasId,
      binding?.authority.projectRoot,
      selectedUniqueId,
      options.revisionToken
    ),
    queryFn: () => {
      if (!hasContext || !binding || !selectedUniqueId) {
        throw new Error('AnalyzeSelectedDbtModel requires a complete accepted model context.');
      }
      return port.analyzeSelectedModel(binding, selectedUniqueId);
    },
    staleTime: 15_000,
  });
}
