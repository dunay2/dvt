import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { assertComponentStyleOwnership } from '../../../testing/componentStyleOwnership.test.support';
import controlSource from './CanvasGraphSearchControl.tsx?raw';
import surfaceSource from './CanvasViewportSurfaceView.tsx?raw';
import controllerSource from './useCanvasGraphSearchController.ts?raw';
import type { CanvasGraphSearchController } from './useCanvasGraphSearchController';
import type { CanvasGraphSearchViewportBinding } from './canvasGraphSearchControl.binding';

describe('CanvasGraphSearchControl binding ownership', () => {
  it('depends on its UI binding instead of the concrete search hook', () => {
    expect(controlSource).toContain("from './canvasGraphSearchControl.binding'");
    expect(controlSource).not.toContain("from './useCanvasGraphSearchController'");
    expect(controlSource).toContain('binding: CanvasGraphSearchControlBinding');
    expect(controlSource).toContain('onKeyDown={binding.onControlKeyDown}');
    expect(controlSource).toContain('onKeyDown={binding.onQueryKeyDown}');
  });

  it('receives the existing object directly while the surface owns the viewport facet', () => {
    const invocation = surfaceSource.match(/<CanvasGraphSearchControl\b[\s\S]*?\/>/)?.[0];
    expect(invocation).toBeDefined();
    expect(invocation).toMatch(/\bbinding=\{graphSearchController\}/);
    expect(invocation).toMatch(/\bcopy=\{copy\}/);
    expect(invocation).not.toMatch(
      /\b(?:model|onQueryChange|onPrevious|onNext|onClose|onKeyDown|onQueryKeyDown)=/
    );
    expect(surfaceSource).toContain('graphSearchController: CanvasGraphSearchViewportBinding');
    expect(surfaceSource).not.toContain("from './useCanvasGraphSearchController'");
  });

  it('composes controller-only operations without redeclaring UI methods', () => {
    expectTypeOf<CanvasGraphSearchController>().toExtend<CanvasGraphSearchViewportBinding>();
    expect(controllerSource).toContain("from './canvasGraphSearchControl.binding'");
    expect(controllerSource).not.toContain('export type CanvasGraphSearchControlModel');
    expect(controllerSource).not.toMatch(/\bsetQuery:\s*\(query: string\)\s*=>/);
  });

  it('keeps the UI contract type-only and separate from the pure search query', () => {
    const bindingPath = resolve(import.meta.dirname, 'canvasGraphSearchControl.binding.ts');
    expect(existsSync(bindingPath)).toBe(true);
    const bindingSource = readFileSync(bindingPath, 'utf8');
    expect(bindingSource).not.toMatch(/\b(?:matchingNodeIds|open)\s*:\s*\(/);
    expect(bindingSource).not.toContain('matchingNodeIds:');
    expect(bindingSource).not.toContain('useCanvasGraphSearchController');
    const controlBindingSource = bindingSource.slice(
      0,
      bindingSource.indexOf('export type CanvasGraphSearchViewportBinding')
    );
    expect(controlBindingSource).not.toContain('onViewportKeyDown');
    const querySource = readFileSync(
      resolve(import.meta.dirname, 'canvasGraphSearch.contract.ts'),
      'utf8'
    );
    expect(querySource).not.toMatch(/from ['"]react['"]|KeyboardEvent/);
  });

  it('owns its appearance in a concern-local stylesheet instead of JSX utilities', () => {
    const stylesheetPath = resolve(import.meta.dirname, 'CanvasGraphSearchControl.module.css');
    expect(existsSync(stylesheetPath)).toBe(true);
    assertComponentStyleOwnership({
      componentSource: controlSource,
      stylesheetSource: readFileSync(stylesheetPath, 'utf8'),
      stylesheetImport: './CanvasGraphSearchControl.module.css',
    });
  });
});
