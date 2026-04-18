import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { IWorkspacePort } from '../../ports/workspace';
import { queryKeys } from '../../queries/queryKeys';
import { createCanvasDraftRepository } from './canvasDraftRepository';

type UseCanvasDraftBaselineArgs = {
  workspaceService: IWorkspacePort;
  workspaceLayoutKey: string;
};

export function useCanvasDraftBaseline({
  workspaceService,
  workspaceLayoutKey,
}: UseCanvasDraftBaselineArgs) {
  const queryClient = useQueryClient();
  const draftRepository = useMemo(
    () => createCanvasDraftRepository(workspaceService),
    [workspaceService]
  );
  const graphDraftQuery = useQuery({
    queryKey: queryKeys.workspace.graphDraft(workspaceLayoutKey),
    queryFn: () => draftRepository.readGraphDraft(),
  });

  return {
    queryClient,
    draftRepository,
    graphDraftQuery,
  };
}
