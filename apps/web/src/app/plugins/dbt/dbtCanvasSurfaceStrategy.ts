/** Owned concern: project dbt Canvas runtime surfaces into contextual workbench policy. */
import type { CanvasSurfaceStrategy } from '../canvasSurfaceStrategyContracts';
import {
  contextualCanvasGlobalNavigationPolicy,
  contextualCanvasOperationalDrawerPolicy,
} from '../canvasSurfaceStrategyContracts';

export const dbtCanvasSurfaceStrategy: CanvasSurfaceStrategy = {
  id: 'dbt-contextual-canvas',
  sourceImport: {
    placement: 'contextual-modal',
    openedFrom: ['canvas-context-menu', 'command-palette'],
  },
  nodeWorkbench: {
    placement: 'contextual-overlay',
    openedFrom: ['node-context-menu', 'double-click', 'selection'],
    sections: ['properties', 'columns', 'tests', 'lineage', 'preview', 'runs'],
  },
  operationalDrawer: contextualCanvasOperationalDrawerPolicy,
  globalNavigation: contextualCanvasGlobalNavigationPolicy,
};
