import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const CENTER_SURFACE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasCenterSurface.tsx'
);

describe('CanvasCenterSurface architecture', () => {
  it('delegates draft transport and workbench route-state rendering to dedicated helpers', () => {
    expect(CENTER_SURFACE_SOURCE).toContain('Owned concern: render governed Canvas center-surface states');
    expect(CENTER_SURFACE_SOURCE).toContain('renderCanvasDraftTransportSurface');
    expect(CENTER_SURFACE_SOURCE).toContain('renderCanvasWorkbenchSurface');
    expect(CENTER_SURFACE_SOURCE).toContain('renderCanvasStartupWorkbenchSurface');
    expect(CENTER_SURFACE_SOURCE).toContain('renderCanvasGraphWorkbenchSurface');
    expect(CENTER_SURFACE_SOURCE).toContain('renderCanvasEmptyWorkbenchSurface');
  });
});
