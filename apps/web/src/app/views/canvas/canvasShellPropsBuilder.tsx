/**
 * Owned concern: build the route-owned CanvasShell contract from controller and route posture.
 */
import { buildCanvasShellChromeCommands } from './canvasShellChromeCommandsBuilder';
import { buildCanvasShellGraphCommands } from './canvasShellGraphCommandsBuilder';
import { buildCanvasShellGraph } from './canvasShellGraphBuilder';
import { buildCanvasShellLayout } from './canvasShellLayoutBuilder';
import { buildCanvasShellPanels } from './canvasShellPanelsBuilder';
import { buildCanvasShellToolbar } from './canvasShellToolbarBuilder';
import type { CanvasShellBuilderArgs } from './canvasShellBuilder.types';
import type { CanvasShellProps } from './canvasShell.types';
 
export function buildCanvasShellProps(
  args: CanvasShellBuilderArgs
): CanvasShellProps {
  return {
    layout: buildCanvasShellLayout(args),
    panels: buildCanvasShellPanels(args),
    graph: buildCanvasShellGraph(args),
    toolbar: buildCanvasShellToolbar(args),
    graphCommands: buildCanvasShellGraphCommands(args),
    chromeCommands: buildCanvasShellChromeCommands(args),
  };
}
