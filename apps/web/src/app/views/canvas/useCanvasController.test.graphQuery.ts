import type {
  CanvasHarnessMocks,
  CanvasHarnessState,
} from './useCanvasController.test.types';

export function setCanvasHarnessGraphQueryError(
  state: CanvasHarnessState,
  mocks: CanvasHarnessMocks
): void {
  mocks.useQuery.mockImplementation((queryConfig?: { queryKey?: readonly string[] }) => {
    const queryKey = queryConfig?.queryKey ?? [];
    if (queryKey[1] === 'graph-draft') {
      return {
        data: state.graphDraftRecord,
        isPending: false,
        isError: false,
      };
    }

    return {
      data: undefined,
      isPending: false,
      isError: true,
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
    if (queryKey[1] === 'graph-draft') {
      return {
        data: state.graphDraftRecord,
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
