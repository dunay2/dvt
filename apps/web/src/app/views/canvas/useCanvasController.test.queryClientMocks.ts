import { resolveCurrentGraphDraftQueryData } from './useCanvasController.test.graphQuery';
import type { CanvasHarnessMocks, CanvasHarnessState } from './useCanvasController.test.types';
import type { CanvasAuthoringDraftReadModel } from './canvasDraftReadModel';
import { createPlatformHealthSnapshot } from '../../../capabilities/platform-health/testing/platformHealthFixtures';

type CanvasGraphQueryData = CanvasHarnessState['graphData'];
type CanvasHarnessPlatformHealthData = ReturnType<typeof createPlatformHealthSnapshot>;
type CanvasHarnessQueryData =
  | CanvasAuthoringDraftReadModel
  | CanvasGraphQueryData
  | CanvasHarnessPlatformHealthData;
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
  if (queryKey[0] === 'shell' && queryKey[1] === 'platform-health') {
    return {
      data: createPlatformHealthSnapshot(),
      isPending: false,
      isError: false,
    };
  }

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
