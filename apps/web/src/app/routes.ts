import { createBrowserRouter } from 'react-router';

import Root from './Root';
import AdminView from './views/AdminView';
import ArtifactsView from './views/ArtifactsView';
import Canvas from './views/Canvas';
import CostView from './views/CostView';
import DiffView from './views/DiffView';
import LineageView from './views/LineageView';
import PluginsView from './views/PluginsView';
import RunsView from './views/RunsView';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: Canvas },
      { path: 'canvas', Component: Canvas },
      { path: 'runs', Component: RunsView },
      { path: 'runs/:runId', Component: RunsView },
      { path: 'artifacts', Component: ArtifactsView },
      { path: 'diff', Component: DiffView },
      { path: 'lineage', Component: LineageView },
      { path: 'cost', Component: CostView },
      { path: 'plugins', Component: PluginsView },
      { path: 'admin', Component: AdminView },
    ],
  },
]);
