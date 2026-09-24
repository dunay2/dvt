// @vitest-environment jsdom
/** Owned concern: async connection failure is observed at the gesture boundary. */
import { act } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as admission from './canvasEdgeAdmissionTransaction';
import {
  renderGraphHandlersHook,
  resetGraphHandlersTestDoubles,
  restoreGraphHandlersTestDoubles,
  toastState,
} from './useCanvasGraphHandlers.test.support';

beforeEach(resetGraphHandlersTestDoubles);
afterEach(() => {
  vi.restoreAllMocks();
  restoreGraphHandlersTestDoubles();
});

it('reports failed connection analysis without a partial edge or success notification', async () => {
  vi.spyOn(admission, 'resolveCanvasEdgeCreationTransaction').mockRejectedValue(
    new Error('Schema analysis unavailable')
  );
  const harness = renderGraphHandlersHook({ canEditEdges: true });
  try {
    await harness.render();
    await act(async () => {
      harness.latest()!.onConnect({
        source: 'source-node',
        sourceHandle: null,
        target: 'sink-node',
        targetHandle: null,
      });
    });
    expect(toastState.error).toHaveBeenCalledTimes(1);
    expect(toastState.success).not.toHaveBeenCalled();
    expect(harness.setEdges).not.toHaveBeenCalled();
    expect(harness.setDraftSession).not.toHaveBeenCalled();
  } finally {
    harness.cleanup();
  }
});
