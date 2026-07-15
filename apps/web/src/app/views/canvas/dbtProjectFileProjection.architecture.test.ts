import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function readAppSource(relativePath: string): string {
  return readFileSync(resolve(import.meta.dirname, relativePath), 'utf8');
}

describe('dbt project file Canvas architecture', () => {
  it('branches semantic authority before invoking either Canvas controller', () => {
    const route = readAppSource('../Canvas.tsx');

    expect(route).toContain('resolveCanvasRouteAuthority');
    expect(route).toContain('GraphDraftCanvasContent');
    expect(route).toContain('DbtProjectFileCanvas');
    expect(route).not.toMatch(/function CanvasContent[\s\S]*useCanvasController\(\)/);
  });

  it('keeps query orchestration, pure projection, and presentation in separate modules', () => {
    const composition = readAppSource('DbtProjectFileCanvas.tsx');
    const controller = readAppSource('useDbtProjectFileCanvasController.ts');
    const view = readAppSource('DbtProjectFileCanvasView.tsx');

    expect(composition).toContain('useDbtProjectFileCanvasController');
    expect(controller).toContain('useDbtProjectGraphQuery');
    expect(controller).toContain('projectDbtProjectGraphToCanonicalCanvas');
    expect(view).toContain('CanvasShell');
    expect(view).toContain('CodeView');
    expect(controller).not.toContain('useCanvasController');
    expect(composition).not.toContain('WorkspaceGraphAuthoringDraft');
    expect(controller).not.toContain('WorkspaceGraphAuthoringDraft');
    expect(view).not.toContain('WorkspaceGraphAuthoringDraft');
  });

  it('uses an inspectable file-authoritative strategy with contextual source import but no preview or run', () => {
    const strategy = readAppSource('../../plugins/dbt/dbtProjectFileCanvasSurfaceStrategy.ts');

    expect(strategy).toContain("id: 'dbt-project-files-read-only-canvas'");
    expect(strategy).toContain('operationalDrawer: null');
    expect(strategy).toContain("openedFrom: ['canvas-context-menu']");
    expect(strategy).not.toMatch(/sections:[\s\S]*'preview'/);
    expect(strategy).not.toMatch(/sections:[\s\S]*'runs'/);
  });
});
