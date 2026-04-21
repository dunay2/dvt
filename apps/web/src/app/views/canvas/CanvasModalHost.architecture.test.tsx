/**
 * Owned concern: guard the passive-view contract boundary for CanvasModalHost.
 */
import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const CANVAS_MODAL_HOST_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasModalHost.tsx'
);

describe('CanvasModalHost architecture', () => {
  it('consumes a semantic modal contract instead of controller-shaped props', () => {
    expect(CANVAS_MODAL_HOST_SOURCE).toContain("'./canvasModalHost.types'");
    expect(CANVAS_MODAL_HOST_SOURCE).toContain('planPreview,');
    expect(CANVAS_MODAL_HOST_SOURCE).toContain('edgeConfirmation,');
    expect(CANVAS_MODAL_HOST_SOURCE).not.toContain("'./useCanvasController'");
    expect(CANVAS_MODAL_HOST_SOURCE).not.toContain('ReturnType<typeof useCanvasController>');
    expect(CANVAS_MODAL_HOST_SOURCE).not.toContain('controller.');
  });
});
