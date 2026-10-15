import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, expectTypeOf, it } from 'vitest';

import controlSource from './CanvasGraphFilterControl.tsx?raw';
import surfaceSource from './CanvasViewportSurfaceView.tsx?raw';
import controllerSource from './useCanvasGraphFilterController.ts?raw';
import type { CanvasGraphFilterController } from './useCanvasGraphFilterController';
import type { CanvasGraphFilterControlBinding } from './canvasGraphFilterControl.binding';
import { assertComponentStyleOwnership } from '../../../testing/componentStyleOwnership.test.support';

describe('CanvasGraphFilterControl binding ownership', () => {
  it('owns its static presentation directly in a concern-specific stylesheet', () => {
    const stylesheetPath = resolve(import.meta.dirname, 'CanvasGraphFilterControl.module.css');
    expect(existsSync(stylesheetPath)).toBe(true);
    assertComponentStyleOwnership({
      componentSource: controlSource,
      stylesheetSource: readFileSync(stylesheetPath, 'utf8'),
      stylesheetImport: './CanvasGraphFilterControl.module.css',
    });
  });

  it('depends on its UI binding instead of the concrete filter hook', () => {
    expect(controlSource).toContain("from './canvasGraphFilterControl.binding'");
    expect(controlSource).not.toContain("from './useCanvasGraphFilterController'");
    expect(controlSource).toContain('binding: CanvasGraphFilterControlBinding');
    expect(controlSource).toContain('onOpenChange={binding.setOpen}');
  });

  it('receives the existing object directly without exposing query results to the surface', () => {
    const invocation = surfaceSource.match(/<CanvasGraphFilterControl\b[\s\S]*?\/>/)?.[0];
    expect(invocation).toBeDefined();
    expect(invocation).toMatch(/\bbinding=\{graphFilterController\}/);
    expect(invocation).toMatch(/\bcopy=\{copy\}/);
    expect(invocation).not.toMatch(
      /\b(?:model|onOpenChange|onSelectDimension|onSelectValue|onAddPredicate|onRemovePredicate|onSetComposition|onSetPresentation|onClear)=/
    );
    expect(surfaceSource).toContain('graphFilterController: CanvasGraphFilterControlBinding');
    expect(surfaceSource).not.toContain("from './useCanvasGraphFilterController'");
  });

  it('composes controller-only operations without redeclaring UI methods', () => {
    expectTypeOf<CanvasGraphFilterController>().toExtend<CanvasGraphFilterControlBinding>();
    expect(controllerSource).toContain("from './canvasGraphFilterControl.binding'");
    expect(controllerSource).not.toContain('export type CanvasGraphFilterControlModel');
    expect(controllerSource).not.toContain('export type CanvasGraphFilterOptionGroup');
    expect(controllerSource).not.toMatch(/\bselectValue:\s*\(value: string\)\s*=>/);
  });

  it('keeps controller-private results and pure query semantics outside the UI binding', () => {
    const bindingPath = resolve(import.meta.dirname, 'canvasGraphFilterControl.binding.ts');
    expect(existsSync(bindingPath)).toBe(true);
    const bindingSource = readFileSync(bindingPath, 'utf8');
    expect(bindingSource).not.toMatch(/\b(?:result|filterByTag|onViewportKeyDown)\s*:/);
    expect(bindingSource).not.toContain('useCanvasGraphFilterController');
    const querySource = readFileSync(
      resolve(import.meta.dirname, 'canvasGraphFilter.contract.ts'),
      'utf8'
    );
    expect(querySource).not.toMatch(/from ['"]react['"]|KeyboardEvent/);
  });
});
