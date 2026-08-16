import { queryKeys } from '../../queries/queryKeys';
import type { CanvasDraftRepository } from './canvasDraftRepository';
import {
  type CanvasAuthoringDraftRecord,
  type CanvasAuthoringDraftReadModel,
} from './canvasDraftReadModel';

type CanvasDraftQueryClient = {
  cancelQueries: (args: { queryKey: readonly unknown[] }) => Promise<unknown>;
  fetchQuery: <T>(args: { queryKey: readonly unknown[]; queryFn: () => Promise<T> }) => Promise<T>;
  invalidateQueries: (args: { queryKey: readonly unknown[] }) => Promise<unknown>;
  setQueryData: (queryKey: readonly unknown[], value: unknown) => void;
};

export type CanvasDraftQueryCache = {
  fetchLatestRemoteDraftState: () => Promise<CanvasAuthoringDraftReadModel>;
  fetchLatestRemoteDraft: () => Promise<CanvasAuthoringDraftRecord | null>;
  refreshWorkspaceFilesAfterSourceRemoval: () => Promise<void>;
  replaceRemoteDraftState: (state: CanvasAuthoringDraftReadModel) => void;
};

export function createCanvasDraftQueryCache(
  queryClient: CanvasDraftQueryClient,
  workspaceLayoutKey: string,
  draftRepository: CanvasDraftRepository
): CanvasDraftQueryCache {
  const graphDraftKey = queryKeys.workspace.graphDraft(workspaceLayoutKey);

  return {
    fetchLatestRemoteDraftState: async () => {
      await queryClient.cancelQueries({ queryKey: graphDraftKey });
      return await queryClient.fetchQuery({
        queryKey: graphDraftKey,
        queryFn: () => draftRepository.readGraphDraftState(),
      });
    },
    fetchLatestRemoteDraft: async () => {
      await queryClient.cancelQueries({ queryKey: graphDraftKey });
      return (
        await queryClient.fetchQuery({
          queryKey: graphDraftKey,
          queryFn: () => draftRepository.readGraphDraftState(),
        })
      ).record;
    },
    refreshWorkspaceFilesAfterSourceRemoval: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.workspace.fileTree(workspaceLayoutKey),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.workspace.fileContentRoot(workspaceLayoutKey),
        }),
      ]);
    },
    replaceRemoteDraftState: (state) => {
      queryClient.setQueryData(graphDraftKey, state);
    },
  };
}
