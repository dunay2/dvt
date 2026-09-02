import { describe, expect, it } from 'vitest';

import { dvtCanvasSurfaceStrategy } from '../../../plugins/dvt/dvtCanvasSurfaceStrategy';
import { isCanvasNodeWorkbenchVisible } from '../canvasNodeWorkbenchVisibility';

describe('isCanvasNodeWorkbenchVisible', () => {
  it('requires a visible contextual inspector instead of treating a retained node as visible chrome', () => {
    const shared = {
      focusMode: false,
      surfaceStrategy: dvtCanvasSurfaceStrategy,
      hasInspectorNode: true,
    } as const;

    expect(
      isCanvasNodeWorkbenchVisible({
        ...shared,
        inspectorPanelVisible: false,
      })
    ).toBe(false);
    expect(
      isCanvasNodeWorkbenchVisible({
        ...shared,
        inspectorPanelVisible: true,
      })
    ).toBe(true);
  });
});
