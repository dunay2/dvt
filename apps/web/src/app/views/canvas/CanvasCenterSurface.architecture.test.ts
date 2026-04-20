import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const CENTER_SURFACE_SOURCE = readFileSync(
  path.resolve(import.meta.dirname, 'CanvasCenterSurface.tsx'),
  'utf8'
);

describe('CanvasCenterSurface architecture', () => {
  it('delegates draft transport and workbench route-state rendering to dedicated helpers', () => {
    expect(CENTER_SURFACE_SOURCE).toContain('renderCanvasDraftTransportSurface');
    expect(CENTER_SURFACE_SOURCE).toContain('renderCanvasWorkbenchSurface');
    expect(CENTER_SURFACE_SOURCE).toContain('renderCanvasBackendWorkbenchSurface');
    expect(CENTER_SURFACE_SOURCE).toContain('renderCanvasGraphWorkbenchSurface');
    expect(CENTER_SURFACE_SOURCE).toContain('renderCanvasEmptyWorkbenchSurface');
  });
});
