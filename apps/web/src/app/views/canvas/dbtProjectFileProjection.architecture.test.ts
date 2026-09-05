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
  it('uses the shared dbt Canvas surface policy instead of a file-authority Canvas species', () => {
    const view = readAppSource('DbtProjectFileCanvasView.tsx');
    const sharedStrategy = readAppSource('../../plugins/dbt/dbtCanvasSurfaceStrategy.ts');
    const duplicateStrategyPath = appPath(
      '../../plugins/dbt/dbtProjectFileCanvasSurfaceStrategy.ts'
    );

    expect(view).toContain("from '../../plugins/dbt/dbtCanvasSurfaceStrategy'");
    expect(view).toContain('surfaceStrategy: dbtCanvasSurfaceStrategy');
    expect(sharedStrategy).toContain("id: 'dbt-contextual-canvas'");
    expect(existsSync(duplicateStrategyPath)).toBe(false);
  });

  it('keeps external dbt authority read-only without making surface policy own execution', () => {
    const controller = readAppSource('useDbtProjectFileCanvasController.ts');
    const execution = readAppSource('useDbtProjectFileExecution.ts');

    expect(controller).toContain('useDbtProjectFileExecution');
    expect(controller).toContain('unsupportedSemanticMutation');
    expect(execution).toContain('useCanvasExecutionActions');
    expect(execution).not.toContain('saveFileContent');
    expect(execution).not.toContain('WorkspaceGraphAuthoringDraft');
  });
});
