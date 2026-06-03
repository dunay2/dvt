/** Owned concern: render Canvas-scoped Runs as a workbench tab with Canvas route bootstrap ownership. */
import { CANVAS_WORKBENCH_ROUTE_ID } from '../canvas/canvasDraftPresentationStore';
import { RunsWorkbenchSurface } from '../RunsView';

export default function CanvasRunsTabView(): JSX.Element {
  return <RunsWorkbenchSurface resolveRouteBootstrapId={() => CANVAS_WORKBENCH_ROUTE_ID} />;
}
