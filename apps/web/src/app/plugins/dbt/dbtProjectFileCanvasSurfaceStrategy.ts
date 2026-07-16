/** Owned concern: define read-only surfaces for file-authoritative dbt Canvas. */
import {
  contextualCanvasGlobalNavigationPolicy,
  contextualCanvasOperationalDrawerPolicy,
  type CanvasSurfaceStrategy,
} from '../canvasSurfaceStrategyContracts';

export const dbtProjectFileCanvasSurfaceStrategy: CanvasSurfaceStrategy = {
  id: 'dbt-project-files-read-only-canvas',
  sourceImport: {
    placement: 'contextual-modal',
    openedFrom: ['canvas-context-menu'],
  },
  nodeWorkbench: {
    placement: 'contextual-overlay',
    openedFrom: ['node-context-menu', 'double-click'],
    sections: ['properties', 'columns', 'tests', 'lineage', 'code'],
  },
  operationalDrawer: contextualCanvasOperationalDrawerPolicy,
  globalNavigation: contextualCanvasGlobalNavigationPolicy,
};
