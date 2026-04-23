import { describe, expect, it } from 'vitest';

import { canvasViewCopy, formatCanvasLimitedAccessMessage } from './copy';
import { getCanvasReadOnlyState, getCanvasWorkbenchState } from './canvasWorkbenchStateModel';

describe('canvasWorkbenchStateModel', () => {
  it('prefers loading while the workspace graph query is pending', () => {
    expect(
      getCanvasWorkbenchState({
        canonicalNodeCount: 0,
        hasCanvasDocument: false,
        isLoadingGraph: true,
        graphErrorMessage: 'stale failure',
      })
    ).toEqual({ kind: 'loading' });
  });

  it('returns a governed error when graph loading fails before any graph nodes exist', () => {
    expect(
      getCanvasWorkbenchState({
        canonicalNodeCount: 0,
        hasCanvasDocument: false,
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
        hasCanvasDocument: true,
        isLoadingGraph: false,
        graphErrorMessage: null,
      })
    ).toEqual({ kind: 'empty' });
  });

  it('keeps the canvas ready when graph nodes exist even if the query reports an error', () => {
    expect(
      getCanvasWorkbenchState({
        canonicalNodeCount: 2,
        hasCanvasDocument: true,
        isLoadingGraph: false,
        graphErrorMessage: 'background refresh failed',
      })
    ).toEqual({ kind: 'ready' });
  });

  it('returns needs_canvas when the workspace has no persisted canvas document yet', () => {
    expect(
      getCanvasWorkbenchState({
        canonicalNodeCount: 0,
        hasCanvasDocument: false,
        isLoadingGraph: false,
        graphErrorMessage: null,
      })
    ).toEqual({ kind: 'needs_canvas' });
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
        title: canvasViewCopy.readOnlyTitle,
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
        title: canvasViewCopy.limitedAccessTitle,
        message: formatCanvasLimitedAccessMessage(['run_start', 'graph_edits']),
      })
    );
  });
});
