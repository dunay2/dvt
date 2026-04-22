/** Owned concern: provide the Canvas authoring-runtime baseline query seam over the protected draft repository and cache. */
import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../../queries/queryKeys';
import type { CanvasAuthoringRuntimeBaselineArgs } from './canvasAuthoringRuntime.types';
import { createCanvasDraftQueryCache } from './canvasDraftQueryCache';
import { createCanvasDraftRepository } from './canvasDraftRepository';

export function useCanvasDraftBaseline({
  workspaceService,
  workspaceGraphDraftAuthoringPort,
  workspaceLayoutKey,
}: CanvasAuthoringRuntimeBaselineArgs) {
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
    queryFn: () => draftRepository.readGraphDraftState(),
  });

  return {
    draftQueryCache,
    draftRepository,
    graphDraftQuery,
  };
}
