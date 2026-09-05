import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function appPath(relativePath: string): string {
  return resolve(import.meta.dirname, relativePath);
}

function readAppSource(relativePath: string): string {
  return readFileSync(appPath(relativePath), 'utf8');
}

describe('dbt external-authority Canvas projection architecture', () => {
  it('adapts external dbt authority into the one shared Canvas composition', () => {
    const route = readAppSource('../Canvas.tsx');
    const authoritySurface = readAppSource('useDbtProjectFilesAuthoritySurface.tsx');

    expect(route).toContain('function CanvasRouteSurface');
    expect(route).toContain('useDbtProjectFilesAuthoritySurface');
    expect(route.match(/<CanvasShell\b/g)).toHaveLength(1);
    expect(route.match(/<CanvasModalHost\b/g)).toHaveLength(1);
    expect(route).not.toContain('DbtProjectFileCanvas');
    expect(route).not.toContain('DbtProjectFileCanvasView');
    expect(authoritySurface).toContain('shellProps: CanvasShellProps');
    expect(authoritySurface).toContain('modalHostProps: CanvasModalHostProps');
    expect(authoritySurface).not.toContain("from './CanvasShell'");
    expect(authoritySurface).not.toContain("from './CanvasModalHost'");
    expect(existsSync(appPath('DbtProjectFileCanvas.tsx'))).toBe(false);
    expect(existsSync(appPath('DbtProjectFileCanvasView.tsx'))).toBe(false);
  });

  it('uses the shared dbt Canvas surface policy instead of a file-authority Canvas species', () => {
    const authoritySurface = readAppSource('useDbtProjectFilesAuthoritySurface.tsx');
    const sharedStrategy = readAppSource('../../plugins/dbt/dbtCanvasSurfaceStrategy.ts');

    expect(authoritySurface).toContain("from '../../plugins/dbt/dbtCanvasSurfaceStrategy'");
    expect(authoritySurface).toContain('surfaceStrategy: dbtCanvasSurfaceStrategy');
    expect(sharedStrategy).toContain("id: 'dbt-contextual-canvas'");
    expect(existsSync(appPath('../../plugins/dbt/dbtProjectFileCanvasSurfaceStrategy.ts'))).toBe(
      false
    );
  });

  it('keeps external dbt authority read-only while preserving its execution adapter', () => {
    const authoritySurface = readAppSource('useDbtProjectFilesAuthoritySurface.tsx');
    const controller = readAppSource('useDbtProjectFileCanvasController.ts');
    const execution = readAppSource('useDbtProjectFileExecution.ts');

    expect(authoritySurface).toContain('canEditCanvas: false');
    expect(authoritySurface).toContain('canEditEdges: false');
    expect(controller).toContain('useDbtProjectFileExecution');
    expect(controller).toContain('unsupportedSemanticMutation');
    expect(execution).toContain('useCanvasExecutionActions');
    expect(execution).not.toContain('saveFileContent');
    expect(execution).not.toContain('WorkspaceGraphAuthoringDraft');
  });
});
