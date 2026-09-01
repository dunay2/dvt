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
    const codeWorkbench = readAppSource('dbtProjectFileCodeWorkbench.tsx');
    const sqlWorkbench = readAppSource('SqlContextWorkbench.tsx');

    expect(composition).toContain('useDbtProjectFileCanvasController');
    expect(controller).toContain('useDbtProjectGraphQuery');
    expect(controller).toContain('projectDbtProjectGraphToCanonicalCanvas');
    expect(controller).toContain('projectCanvasNodeAccessibleHealth');
    expect(view).toContain('CanvasShell');
    expect(view).toContain('buildDbtProjectFileCodeWorkbench');
    expect(codeWorkbench).toContain('SqlContextWorkbench');
    expect(sqlWorkbench).toContain('import CodeView, { type CodeViewFileScope');
    expect(sqlWorkbench).not.toContain("lazy(() => import('../CodeView'))");
    expect(sqlWorkbench).toContain('publishRouteBootstrap={false}');
    expect(controller).not.toContain('useCanvasController');
    expect(composition).not.toContain('WorkspaceGraphAuthoringDraft');
    expect(controller).not.toContain('WorkspaceGraphAuthoringDraft');
    expect(view).not.toContain('WorkspaceGraphAuthoringDraft');
  });

  it('keeps file authority read-only while delegating Preview and Run to its execution child', () => {
    const strategy = readAppSource('../../plugins/dbt/dbtProjectFileCanvasSurfaceStrategy.ts');
    const controller = readAppSource('useDbtProjectFileCanvasController.ts');
    const execution = readAppSource('useDbtProjectFileExecution.ts');

    expect(strategy).toContain("id: 'dbt-project-files-read-only-canvas'");
    expect(strategy).toContain("openedFrom: ['double-click']");
    expect(strategy).not.toContain("'node-context-menu'");
    expect(strategy).toContain('operationalDrawer');
    expect(strategy).toContain("openedFrom: ['canvas-context-menu']");
    expect(controller).toContain('useDbtProjectFileExecution');
    expect(execution).toContain('useCanvasExecutionActions');
    expect(execution).not.toContain('saveFileContent');
    expect(execution).not.toContain('WorkspaceGraphAuthoringDraft');
  });
});
