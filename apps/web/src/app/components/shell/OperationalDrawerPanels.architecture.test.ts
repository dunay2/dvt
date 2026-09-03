import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../../views/architecture.test.support';

const APP_ROOT = path.resolve(__dirname, '../..');

function readAppSource(relativePath: string): string {
  return readArchitectureSiblingSource(APP_ROOT, relativePath);
}

describe('Operational drawer architecture', () => {
  it('keeps the bottom drawer product boundary on operational vocabulary', () => {
    const rootSource = readAppSource('Root.tsx');
    const drawerSource = readArchitectureSiblingSource(__dirname, 'BottomOperationalDrawer.tsx');
    const modelSource = readArchitectureSiblingSource(
      __dirname,
      'bottomOperationalDrawerLogModel.ts'
    );

    expect(rootSource).toContain('./components/shell/BottomOperationalDrawer');
    expect(drawerSource).toContain('export function BottomOperationalDrawer');
    expect(modelSource).toContain('buildBottomOperationalDrawerLogModel');

    expect(existsSync(path.resolve(APP_ROOT, 'components/Console.tsx'))).toBe(false);
    expect(existsSync(path.resolve(__dirname, 'bottomConsoleDrawerModel.ts'))).toBe(false);
    expect(rootSource).not.toContain('BottomConsoleDrawer');
    expect(drawerSource).not.toContain('bottom-console-drawer');
    expect(modelSource).not.toContain('BottomConsoleDrawer');
  });

  it('keeps route drawer panels composed from presentation primitives', () => {
    const panelsSource = readArchitectureSiblingSource(__dirname, 'OperationalDrawerPanels.tsx');
    const primitivesSource = readArchitectureSiblingSource(
      __dirname,
      'OperationalDrawerPanelPrimitives.tsx'
    );

    expect(panelsSource).toContain("from './OperationalDrawerPanelPrimitives'");
    expect(panelsSource).toContain('OperationalDrawerPanelSurface');
    expect(panelsSource).toContain('OperationalDrawerProblemItem');
    expect(panelsSource).toContain('OperationalDrawerPreviewLayout');
    expect(panelsSource).toContain('OperationalDrawerRunActiveSummary');
    expect(panelsSource).not.toContain('className=');
    expect(panelsSource).not.toContain('border-amber-400/40');
    expect(panelsSource).not.toContain('text-[11px]');
    expect(panelsSource).not.toContain('role="tablist"');

    expect(primitivesSource).toContain('export function OperationalDrawerPanelSurface');
    expect(primitivesSource).toContain('export function OperationalDrawerProblemItem');
    expect(primitivesSource).toContain('export function OperationalDrawerPreviewLayout');
    expect(primitivesSource).toContain('const operationalDrawerPanelClassNames');
    expect(primitivesSource).not.toContain('className="');
  });

  it('keeps operational drawer tests scoped by component responsibility', () => {
    const drawerTestSource = readArchitectureSiblingSource(
      __dirname,
      'BottomOperationalDrawer.test.tsx'
    );
    const panelsTestSource = readArchitectureSiblingSource(
      __dirname,
      'OperationalDrawerPanels.test.tsx'
    );
    const logModelTestSource = readArchitectureSiblingSource(
      __dirname,
      'bottomOperationalDrawerLogModel.test.ts'
    );

    expect(drawerTestSource).not.toContain('bottom-operational-problem-severity');
    expect(drawerTestSource).not.toContain('bottom-operational-preview-blocker');
    expect(drawerTestSource).not.toContain('Active run');
    expect(panelsTestSource).not.toContain('useConsoleLogStream');
    expect(panelsTestSource).not.toContain('xterm-console');
  });
});
