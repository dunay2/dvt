/** Owned concern: the shared explorer stays a presentation component, not a second authoring rail. */
import { describe, expect, it } from 'vitest';
import frame from './CanvasExplorer.tsx?raw';
import template from './CanvasExplorer.templates.tsx?raw';
import list from './CanvasExplorerList.tsx?raw';
import graph from './CanvasGraphExplorer.tsx?raw';
import relational from './CanvasRelationalExplorer.tsx?raw';
import catalogue from '../CanvasRelationalTreeSourceCatalogue.tsx?raw';
import viewport from '../CanvasViewport.tsx?raw';
import resizable from '../../../components/ui/resizable.tsx?raw';

describe('Canvas explorer ownership', () => {
  it('keeps shared resize presentation in its CSS module', () => {
    // GH-3818: keep the resize primitive from accumulating visual policy inside React again.
    expect(resizable).toContain("'./resizable.module.css'");
    expect(resizable).not.toMatch(/style=\{|className="|cn\(\s*['"]/);
  });

  it('keeps topology writes and domain/provider decisions out of shared presentation', () => {
    // Opening or hiding Elements must not become a second path for editing the graph.
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

  it('keeps disclosure and persistence in the shell layout owner', () => {
    // GH-3818: a second local flag or storage key would recreate the reload/navigation split.
    for (const source of [frame, template]) {
      expect(source).not.toMatch(/localStorage|sessionStorage|autoSaveId|createJSONStorage/);
    }
    expect(frame).not.toMatch(/useState|setExpanded|canvasExplorerVisible/);
    expect(frame).toContain('state.canvasExplorer');
    expect(frame).toContain('state.dispatchCanvasExplorer');
    expect(template).not.toMatch(/useUiLayoutStore|useEffect|useLayoutEffect/);
  });
});
