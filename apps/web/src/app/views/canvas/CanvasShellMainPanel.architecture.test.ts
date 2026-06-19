/**
 * Owned concern: guard CanvasShellMainPanel as composition over presentation primitives.
 */
import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const MAIN_PANEL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasShellMainPanel.tsx'
);
const NODE_WORKBENCH_OVERLAY_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasNodeWorkbenchOverlay.tsx'
);

describe('CanvasShellMainPanel architecture', () => {
  it('delegates NodeWorkbench overlay markup to a presentational component', () => {
    expect(MAIN_PANEL_SOURCE).toContain("'./CanvasNodeWorkbenchOverlay'");
    expect(MAIN_PANEL_SOURCE).toContain('<CanvasNodeWorkbenchOverlay');
    expect(MAIN_PANEL_SOURCE).not.toContain('data-slot="canvas-node-workbench-overlay"');
    expect(MAIN_PANEL_SOURCE).not.toContain('absolute top-16 right-4 bottom-4');

    expect(NODE_WORKBENCH_OVERLAY_SOURCE).toContain('data-slot="canvas-node-workbench-overlay"');
    expect(NODE_WORKBENCH_OVERLAY_SOURCE).toContain('function CanvasNodeWorkbenchOverlaySurface');
    expect(NODE_WORKBENCH_OVERLAY_SOURCE).toContain('CanvasNodeWorkbenchPanel');
    expect(NODE_WORKBENCH_OVERLAY_SOURCE).not.toContain('CanvasInspectorPanel');
  });
});
