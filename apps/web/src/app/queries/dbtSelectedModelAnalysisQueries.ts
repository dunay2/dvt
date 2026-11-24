/** Owned concern: isolate selected dbt model analysis by accepted context and revision. */
import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import type { DbtProjectFilesAuthorityBinding } from '../ports/dbtProjectGraph';
import {
  useDbtSelectedModelAnalysisQueryPort,
  useSessionContext,
} from '../services/AppServicesContext';
import { hasDbtProjectQueryContext, queryKeys } from './queryKeys';
import {
  persistDbtSelectedModelAnalysis,
  restoreDbtSelectedModelAnalysis,
} from './dbtSelectedModelAnalysisCache';

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
  const context = {
    tenantId: scope.tenantId,
    projectId: scope.projectId,
    environmentId: scope.environmentId,
    canvasId: binding?.canvasId,
    projectRoot: binding?.authority.projectRoot,
    selectedUniqueId,
    revisionToken: options.revisionToken,
  };
  const hasContext = hasSelectedModelQueryContext(context, binding);
  const key = queryKeys.workspace.dbtSelectedModelAnalysis(context);
  return useQuery({
    enabled: hasContext && (options.enabled ?? true),
    retry: false,
    queryKey: key,
    initialData: function restoreAcceptedModelAnalysis() {
      return hasContext ? restoreDbtSelectedModelAnalysis(key) : undefined;
    },
    queryFn: () => loadSelectedModelAnalysis({ hasContext, binding, selectedUniqueId, key, port }),
    staleTime: 15_000,
  });
}

function hasSelectedModelQueryContext(
  context: Parameters<typeof queryKeys.workspace.dbtSelectedModelAnalysis>[0],
  binding: DbtProjectFilesAuthorityBinding | undefined
): boolean {
  if (!hasDbtProjectQueryContext(context)) return false;
  if (binding?.authority.kind !== 'dbt-project-files') return false;
  return Boolean(context.selectedUniqueId?.trim());
}

async function loadSelectedModelAnalysis({
  hasContext,
  binding,
  selectedUniqueId,
  key,
  port,
}: Readonly<{
  hasContext: boolean;
  binding: DbtProjectFilesAuthorityBinding | undefined;
  selectedUniqueId: string | undefined;
  key: Parameters<typeof persistDbtSelectedModelAnalysis>[0];
  port: ReturnType<typeof useDbtSelectedModelAnalysisQueryPort>;
}>) {
  if (!hasContext)
    throw new Error('AnalyzeSelectedDbtModel requires a complete accepted model context.');
  if (!binding || !selectedUniqueId) {
    throw new Error('AnalyzeSelectedDbtModel requires a complete accepted model context.');
  }
  const result = await port.analyzeSelectedModel(binding, selectedUniqueId);
  persistDbtSelectedModelAnalysis(key, result);
  return result;
}
