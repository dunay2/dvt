import type { WorkspaceGraphDraftRecord, WorkspaceGraphSnapshot } from '../../ports/workspace';
import { queryKeys } from '../../queries/queryKeys';
import type { CanvasDraftRepository } from './canvasDraftRepository';

type CanvasDraftQueryClient = {
  cancelQueries: (args: { queryKey: readonly unknown[] }) => Promise<unknown>;
  fetchQuery: <T>(args: {
    queryKey: readonly unknown[];
    queryFn: () => Promise<T>;
  }) => Promise<T>;
  setQueryData: (queryKey: readonly unknown[], value: unknown) => void;
};

export type CanvasDraftQueryCache = {
  fetchLatestRemoteDraft: () => Promise<WorkspaceGraphDraftRecord | null>;
  fetchLatestGraphSnapshot: () => Promise<WorkspaceGraphSnapshot>;
  replaceRemoteDraft: (record: WorkspaceGraphDraftRecord | null) => void;
};

export function createCanvasDraftQueryCache(
  queryClient: CanvasDraftQueryClient,
  workspaceLayoutKey: string,
  draftRepository: CanvasDraftRepository
): CanvasDraftQueryCache {
  const graphDraftKey = queryKeys.workspace.graphDraft(workspaceLayoutKey);
  const graphKey = queryKeys.workspace.graph(workspaceLayoutKey);

  return {
    fetchLatestRemoteDraft: async () => {
      await queryClient.cancelQueries({ queryKey: graphDraftKey });
      return await queryClient.fetchQuery({
        queryKey: graphDraftKey,
        queryFn: () => draftRepository.readGraphDraft(),
      });
    },
    fetchLatestGraphSnapshot: async () => {
      await queryClient.cancelQueries({ queryKey: graphKey });
      return await queryClient.fetchQuery({
        queryKey: graphKey,
        queryFn: () => draftRepository.readGraphSnapshot(),
      });
    },
    replaceRemoteDraft: (record) => {
      queryClient.setQueryData(graphDraftKey, record);
    },
  };
}
