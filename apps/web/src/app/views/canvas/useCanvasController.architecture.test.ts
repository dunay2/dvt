import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const CONTROLLER_SOURCE = readFileSync(
  path.resolve(import.meta.dirname, 'useCanvasController.ts'),
  'utf8'
);

describe('useCanvasController architecture', () => {
  it('keeps draft persistence access behind canvasDraftRepository', () => {
    expect(CONTROLLER_SOURCE).toContain('createCanvasDraftRepository');
    expect(CONTROLLER_SOURCE).not.toMatch(/workspaceService\.getGraphDraft\s*\(/);
    expect(CONTROLLER_SOURCE).not.toMatch(/workspaceService\.saveGraphDraft\s*\(/);
    expect(CONTROLLER_SOURCE).not.toMatch(/workspaceService\.getGraphSnapshot\s*\(/);
  });
});
