/** Owned concern: the shared explorer stays a presentation component, not a second authoring rail. */
import { describe, expect, it } from 'vitest';
import frame from './CanvasExplorer.tsx?raw';
import template from './CanvasExplorer.templates.tsx?raw';
import list from './CanvasExplorerList.tsx?raw';
import graph from './CanvasGraphExplorer.tsx?raw';
import relational from './CanvasRelationalExplorer.tsx?raw';
import catalogue from '../CanvasRelationalTreeSourceCatalogue.tsx?raw';
import viewport from '../CanvasViewport.tsx?raw';

describe('Canvas explorer ownership', () => {
  it('keeps topology writes and domain/provider decisions out of shared presentation', () => {
    for (const source of [frame, template, list]) {
      expect(source).not.toMatch(
        /fetch\(|\.occurrences|setNodes|addNode|applyDvt|postgres|dbt|zustand/
      );
      expect(source).not.toMatch(/style=\{|className="/);
    }
    expect(template).toContain('CanvasExplorer.module.css');
    expect(graph).not.toContain('useReactFlow');
    expect(viewport).toContain('<CanvasGraphExplorer');
    expect(viewport).toContain('focusCanvasViewportNode');
    expect(relational).toContain('CanvasRelationalTreeSourceCatalogue');
    expect(catalogue).not.toMatch(/PanelLeftClose|PanelLeftOpen|collapsed|onToggle/);
  });
});
