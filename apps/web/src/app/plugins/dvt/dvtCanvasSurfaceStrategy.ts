/** Owned concern: project DVT transformation Canvas surfaces into contextual workbench policy. */
import type { CanvasSurfaceStrategy } from '../canvasSurfaceStrategyContracts';
import {
  contextualCanvasGlobalNavigationPolicy,
  contextualCanvasOperationalDrawerPolicy,
} from '../canvasSurfaceStrategyContracts';

export const dvtCanvasSurfaceStrategy: CanvasSurfaceStrategy = {
  id: 'dvt-transformation-contextual-canvas',
  sourceImport: {
    placement: 'contextual-modal',
    openedFrom: ['canvas-context-menu', 'command-palette'],
  },
  nodeWorkbench: {
    placement: 'contextual-overlay',
    openedFrom: ['node-context-menu', 'double-click', 'selection'],
    sections: ['properties', 'columns', 'sql', 'sink', 'preview', 'runs'],
  },
  operationalDrawer: contextualCanvasOperationalDrawerPolicy,
  globalNavigation: contextualCanvasGlobalNavigationPolicy,
};
