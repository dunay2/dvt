/** Owned concern: project Python authoring into the existing contextual Canvas workbench. */
import type { CanvasSurfaceStrategy } from '../canvasSurfaceStrategyContracts';
import {
  contextualCanvasGlobalNavigationPolicy,
  contextualCanvasOperationalDrawerPolicy,
} from '../canvasSurfaceStrategyContracts';

export const pythonCanvasSurfaceStrategy: CanvasSurfaceStrategy = {
  id: 'python-code-contextual-canvas',
  sourceImport: {
    placement: 'contextual-modal',
    openedFrom: ['canvas-context-menu', 'command-palette'],
  },
  nodeWorkbench: {
    placement: 'contextual-overlay',
    openedFrom: ['node-context-menu', 'double-click'],
    sections: ['properties', 'code', 'preview', 'runs'],
  },
  operationalDrawer: contextualCanvasOperationalDrawerPolicy,
  globalNavigation: contextualCanvasGlobalNavigationPolicy,
};
