/**
 * Owned concern: guard CanvasShellMainPanel as composition over presentation primitives.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';

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

function readMainPanelFrameSource(): string {
  const framePath = path.resolve(import.meta.dirname, 'CanvasShellMainPanelFrame.tsx');
  return existsSync(framePath)
    ? readArchitectureSiblingSource(import.meta.dirname, 'CanvasShellMainPanelFrame.tsx')
    : '';
}

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

  it('delegates main panel layout markup to presentation frame primitives', () => {
    const mainPanelFrameSource = readMainPanelFrameSource();

    expect(MAIN_PANEL_SOURCE).toContain("'./CanvasShellMainPanelFrame'");
    expect(MAIN_PANEL_SOURCE).toContain('<CanvasShellMainPanelFrame');
    expect(MAIN_PANEL_SOURCE).toContain('<CanvasShellContextualWorkbenchSplit');
    expect(MAIN_PANEL_SOURCE).not.toContain('className=');
    expect(MAIN_PANEL_SOURCE).not.toContain('pointer-events-none absolute inset-0');
    expect(MAIN_PANEL_SOURCE).not.toContain('min-w-0 flex-1');

    expect(mainPanelFrameSource).toContain('export function CanvasShellMainPanelFrame');
    expect(mainPanelFrameSource).toContain('export function CanvasShellContextualWorkbenchSplit');
    expect(mainPanelFrameSource).toContain('const canvasShellMainPanelFrameClassNames');
    expect(mainPanelFrameSource).not.toContain('className="');
  });
});
