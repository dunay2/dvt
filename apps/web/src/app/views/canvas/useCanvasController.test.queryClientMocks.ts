import { resolveCurrentGraphDraftQueryData } from './useCanvasController.test.graphQuery';
import type { CanvasHarnessMocks, CanvasHarnessState } from './useCanvasController.test.types';
import type { CanvasAuthoringDraftReadModel } from './canvasDraftReadModel';

type CanvasGraphQueryData = CanvasHarnessState['graphData'];
type CanvasHarnessQueryData = CanvasAuthoringDraftReadModel | CanvasGraphQueryData;
type CanvasHarnessQueryConfig = {
  queryKey?: readonly unknown[];
  queryFn?: () => Promise<unknown>;
};

function applyCanvasHarnessQueryData(
  state: CanvasHarnessState,
  queryKey: readonly unknown[],
  value: CanvasHarnessQueryData
): void {
  if (queryKey[1] === 'graph-draft') {
    state.graphDraftQueryData = value as CanvasAuthoringDraftReadModel;
    return;
  }

  if (queryKey[1] === 'graph') {
    state.graphData = value as CanvasGraphQueryData;
  }
}

function buildCanvasHarnessUseQueryResult(
  state: CanvasHarnessState,
  queryKey: readonly unknown[]
): { data: CanvasHarnessQueryData; isPending: false; isError: false } {
  if (queryKey[1] === 'graph-draft') {
    return {
      data: resolveCurrentGraphDraftQueryData(state),
      isPending: false,
      isError: false,
    };
  }

  return {
    data: state.graphData,
    isPending: false,
    isError: false,
  };
}

function configureCanvasHarnessUseQueryMock(
  state: CanvasHarnessState,
  mocks: CanvasHarnessMocks
): void {
  mocks.useQuery.mockImplementation((queryConfig?: { queryKey?: readonly string[] }) =>
    buildCanvasHarnessUseQueryResult(state, queryConfig?.queryKey ?? [])
  );
}

function configureCanvasHarnessQueryDataWrites(state: CanvasHarnessState): void {
  state.queryClient.setQueryData.mockImplementation(
    (queryKey: readonly unknown[], value: CanvasHarnessQueryData) =>
      applyCanvasHarnessQueryData(state, queryKey, value)
  );
}

async function resolveCanvasHarnessFetchedQuery(args: {
  state: CanvasHarnessState;
  queryKey?: readonly unknown[];
  queryFn?: () => Promise<unknown>;
}) {
  const { state, queryKey, queryFn } = args;
  const resolvedValue = queryFn ? await queryFn() : undefined;

  if (queryKey) {
    applyCanvasHarnessQueryData(state, queryKey, resolvedValue as CanvasHarnessQueryData);
  }

  return resolvedValue;
}

function configureCanvasHarnessFetchQueryMock(state: CanvasHarnessState): void {
  state.queryClient.fetchQuery.mockImplementation((queryConfig?: CanvasHarnessQueryConfig) =>
    resolveCanvasHarnessFetchedQuery({
      state,
      queryKey: queryConfig?.queryKey,
      queryFn: queryConfig?.queryFn,
    })
  );
}

export function configureCanvasHarnessQueryClientMocks(
  state: CanvasHarnessState,
  mocks: CanvasHarnessMocks
): void {
  configureCanvasHarnessUseQueryMock(state, mocks);
  mocks.useQueryClient.mockReturnValue(state.queryClient);
  configureCanvasHarnessQueryDataWrites(state);
  configureCanvasHarnessFetchQueryMock(state);
}
