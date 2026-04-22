import type { WorkspaceGraphDraftRecord } from '../../ports/workspace';
import { queryKeys } from '../../queries/queryKeys';
import type { CanvasDraftRepository } from './canvasDraftRepository';
import {
  createUnknownCanvasDraftReadModel,
  createWritableCanvasDraftReadModel,
  type CanvasDraftReadModel,
} from './canvasDraftReadModel';
import type { WorkspaceGraphDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';

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
  replaceRemoteDraft: (
    record: WorkspaceGraphDraftRecord | null,
    semanticGraph?: WorkspaceGraphDraftSemanticGraph | null
  ) => void;
  replaceRemoteDraftState: (state: CanvasDraftReadModel) => void;
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
    replaceRemoteDraft: (record, semanticGraph = null) => {
      queryClient.setQueryData(
        graphDraftKey,
        record == null
          ? createUnknownCanvasDraftReadModel()
          : createWritableCanvasDraftReadModel(record, semanticGraph)
      );
    },
    replaceRemoteDraftState: (state) => {
      queryClient.setQueryData(graphDraftKey, state);
    },
  };
}
