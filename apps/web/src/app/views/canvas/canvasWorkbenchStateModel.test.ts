import { describe, expect, it } from 'vitest';

import { getCanvasReadOnlyState, getCanvasWorkbenchState } from './canvasWorkbenchStateModel';

describe('canvasWorkbenchStateModel', () => {
  it('prefers loading while the workspace graph query is pending', () => {
    expect(
      getCanvasWorkbenchState({
        canonicalNodeCount: 0,
        isLoadingGraph: true,
        graphErrorMessage: 'stale failure',
      })
    ).toEqual({ kind: 'loading' });
  });

  it('returns a governed error when graph loading fails before any graph nodes exist', () => {
    expect(
      getCanvasWorkbenchState({
        canonicalNodeCount: 0,
        isLoadingGraph: false,
        graphErrorMessage: 'workspace graph unavailable',
      })
    ).toEqual({
      kind: 'error',
      message: 'workspace graph unavailable',
    });
  });

  it('returns empty when no graph nodes are available and there is no graph error', () => {
    expect(
      getCanvasWorkbenchState({
        canonicalNodeCount: 0,
        isLoadingGraph: false,
        graphErrorMessage: null,
      })
    ).toEqual({ kind: 'empty' });
  });

  it('keeps the canvas ready when graph nodes exist even if the query reports an error', () => {
    expect(
      getCanvasWorkbenchState({
        canonicalNodeCount: 2,
        isLoadingGraph: false,
        graphErrorMessage: 'background refresh failed',
      })
    ).toEqual({ kind: 'ready' });
  });

  it('returns no read-only banner when all mutation permissions are available', () => {
    expect(
      getCanvasReadOnlyState({
        canPlan: true,
        canRun: true,
        canEditEdges: true,
      })
    ).toBeNull();
  });

  it('returns a full read-only banner when all mutation permissions are unavailable', () => {
    expect(
      getCanvasReadOnlyState({
        canPlan: false,
        canRun: false,
        canEditEdges: false,
      })
    ).toEqual(
      expect.objectContaining({
        title: 'Read-only canvas',
      })
    );
  });

  it('returns a limited-access banner when only some mutations are unavailable', () => {
    expect(
      getCanvasReadOnlyState({
        canPlan: true,
        canRun: false,
        canEditEdges: false,
      })
    ).toEqual(
      expect.objectContaining({
        title: 'Limited mutation access',
        message:
          'You can keep inspecting the graph, but run start and graph edits are unavailable in this context.',
      })
    );
  });
});
