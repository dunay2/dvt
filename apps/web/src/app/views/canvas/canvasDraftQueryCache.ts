import type { WorkspaceGraphDraftRecord, WorkspaceGraphSnapshot } from '../../ports/workspace';
import { queryKeys } from '../../queries/queryKeys';
import type { CanvasDraftRepository } from './canvasDraftRepository';
import {
  createUnknownCanvasDraftReadModel,
  createWritableCanvasDraftReadModel,
  type CanvasDraftReadModel,
} from './canvasDraftReadModel';

type CanvasDraftQueryClient = {
  cancelQueries: (args: { queryKey: readonly unknown[] }) => Promise<unknown>;
  fetchQuery: <T>(args: {
    queryKey: readonly unknown[];
    queryFn: () => Promise<T>;
  }) => Promise<T>;
  setQueryData: (queryKey: readonly unknown[], value: unknown) => void;
};

export type CanvasDraftQueryCache = {
  fetchLatestRemoteDraftState: () => Promise<CanvasDraftReadModel>;
  fetchLatestRemoteDraft: () => Promise<WorkspaceGraphDraftRecord | null>;
  fetchLatestGraphSnapshot: () => Promise<WorkspaceGraphSnapshot>;
  replaceRemoteDraft: (record: WorkspaceGraphDraftRecord | null) => void;
  replaceRemoteDraftState: (state: CanvasDraftReadModel) => void;
};

export function createCanvasDraftQueryCache(
  queryClient: CanvasDraftQueryClient,
  workspaceLayoutKey: string,
  draftRepository: CanvasDraftRepository
): CanvasDraftQueryCache {
  const graphDraftKey = queryKeys.workspace.graphDraft(workspaceLayoutKey);
  const graphKey = queryKeys.workspace.graph(workspaceLayoutKey);

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
    fetchLatestGraphSnapshot: async () => {
      await queryClient.cancelQueries({ queryKey: graphKey });
      return await queryClient.fetchQuery({
        queryKey: graphKey,
        queryFn: () => draftRepository.readGraphSnapshot(),
      });
    },
    replaceRemoteDraft: (record) => {
      queryClient.setQueryData(
        graphDraftKey,
        record == null ? createUnknownCanvasDraftReadModel() : createWritableCanvasDraftReadModel(record)
      );
    },
    replaceRemoteDraftState: (state) => {
      queryClient.setQueryData(graphDraftKey, state);
    },
  };
}
