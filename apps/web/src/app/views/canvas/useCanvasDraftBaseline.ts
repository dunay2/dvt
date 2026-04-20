import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { IWorkspacePort } from '../../ports/workspace';
import type { IWorkspaceGraphDraftAuthoringPort } from '../../ports/workspaceGraphDraftAuthoring';
import { queryKeys } from '../../queries/queryKeys';
import { createCanvasDraftQueryCache } from './canvasDraftQueryCache';
import { createCanvasDraftRepository } from './canvasDraftRepository';

type UseCanvasDraftBaselineArgs = {
  workspaceService: IWorkspacePort;
  workspaceGraphDraftAuthoringPort: IWorkspaceGraphDraftAuthoringPort;
  workspaceLayoutKey: string;
};

export function useCanvasDraftBaseline({
  workspaceService,
  workspaceGraphDraftAuthoringPort,
  workspaceLayoutKey,
}: UseCanvasDraftBaselineArgs) {
  const queryClient = useQueryClient();
  const draftRepository = useMemo(
    () => createCanvasDraftRepository(workspaceService, workspaceGraphDraftAuthoringPort),
    [workspaceGraphDraftAuthoringPort, workspaceService]
  );
  const draftQueryCache = useMemo(
    () => createCanvasDraftQueryCache(queryClient, workspaceLayoutKey, draftRepository),
    [draftRepository, queryClient, workspaceLayoutKey]
  );
  const graphDraftQuery = useQuery({
    queryKey: queryKeys.workspace.graphDraft(workspaceLayoutKey),
    queryFn: () => draftRepository.readGraphDraft(),
  });

  return {
    draftQueryCache,
    draftRepository,
    graphDraftQuery,
  };
}
