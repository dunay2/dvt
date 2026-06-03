import type { CanvasHarnessMocks, CanvasHarnessState } from './useCanvasController.test.types';
import { projectCanvasHarnessDraftReadModel } from './useCanvasController.test.draftAuthoring';
import { createPlatformHealthSnapshot } from '../../../capabilities/platform-health/testing/platformHealthFixtures';

function isPlatformHealthQuery(queryKey: readonly unknown[]): boolean {
  return queryKey[0] === 'shell' && queryKey[1] === 'platform-health';
}

export function resolveCurrentGraphDraftQueryData(state: CanvasHarnessState) {
  if (state.graphDraftQueryData !== undefined) {
    return state.graphDraftQueryData;
  }

  return projectCanvasHarnessDraftReadModel(state.remoteDraftRecord);
}

export function setCanvasHarnessGraphQueryError(
  state: CanvasHarnessState,
  mocks: CanvasHarnessMocks
): void {
  mocks.useQuery.mockImplementation((queryConfig?: { queryKey?: readonly string[] }) => {
    const queryKey = queryConfig?.queryKey ?? [];
    if (isPlatformHealthQuery(queryKey)) {
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
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('Graph query failed'),
    };
  });
}

export function setCanvasHarnessGraphQueryPending(
  state: CanvasHarnessState,
  mocks: CanvasHarnessMocks,
  isPending: boolean
): void {
  mocks.useQuery.mockImplementation((queryConfig?: { queryKey?: readonly string[] }) => {
    const queryKey = queryConfig?.queryKey ?? [];
    if (isPlatformHealthQuery(queryKey)) {
      return {
        data: createPlatformHealthSnapshot(),
        isPending: false,
        isError: false,
      };
    }

    if (queryKey[1] === 'graph-draft') {
      return {
        data: resolveCurrentGraphDraftQueryData(state),
        isPending,
        isError: false,
      };
    }

    return {
      data: state.graphData,
      isPending,
      isError: false,
    };
  });
}

export function refreshCanvasHarnessGraphSnapshotWithoutNodeCosts(
  state: CanvasHarnessState,
  mocks: CanvasHarnessMocks
): void {
  state.canonicalNodes = state.canonicalNodes.map((node) => {
    const { lastCost, ...rest } = node;
    return rest;
  });

  mocks.useQuery.mockImplementation((queryConfig?: { queryKey?: readonly string[] }) => {
    const queryKey = queryConfig?.queryKey ?? [];
    if (isPlatformHealthQuery(queryKey)) {
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
      data: {
        nodes: [...state.graphData.nodes],
        edges: [...state.graphData.edges],
      },
      isPending: false,
      isError: false,
    };
  });
}
