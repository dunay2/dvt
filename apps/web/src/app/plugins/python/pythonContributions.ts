/** Owned concern: publish the governed Python code-node Canvas contributions. */
import { GraphNodeRenderer } from '../graph/GraphNodeRenderer';
import type { PluginContributions } from '../registry';

import { pythonCanvasGraphStrategy } from './pythonGraphStrategy';
import { pythonCanvasSurfaceStrategy } from './pythonCanvasSurfaceStrategy';
import {
  PYTHON_CODE_NODE_KIND,
  PYTHON_NODE_KINDS,
  PYTHON_PLUGIN_ID,
} from './pythonNodeTypeCatalog';

export const pythonContributions: PluginContributions = {
  id: PYTHON_PLUGIN_ID,
  backendPluginId: PYTHON_PLUGIN_ID,
  displayName: 'DVT Python',
  version: '1.0.0',
  capabilities: ['canvas.render', 'canvas.edit', 'plan.preview', 'run.start', 'run.observe'],
  nodeKinds: PYTHON_NODE_KINDS,
  canvasKinds: ['python'],
  executionStrategy: {
    kind: 'python_code_preview',
    previewProfile: 'planner-generic-v1',
    sourceFamily: 'python-code',
  },
  graphStrategy: pythonCanvasGraphStrategy,
  surfaceStrategy: pythonCanvasSurfaceStrategy,
  nodeRenderers: new Map([
    [
      PYTHON_CODE_NODE_KIND,
      { kind: PYTHON_CODE_NODE_KIND, priority: 100, component: GraphNodeRenderer },
    ],
  ]),
  connectionRules: [
    {
      sourceKind: PYTHON_CODE_NODE_KIND,
      targetKind: PYTHON_CODE_NODE_KIND,
      allowed: true,
    },
    {
      sourceKind: '*',
      targetKind: '*',
      allowed: false,
      reason: 'Python v1 edges express ordering only between Python code nodes',
    },
  ],
  produces: [{ portType: 'data.custom', forRoles: ['transform'] }],
  consumes: [{ portType: 'data.custom', forRoles: ['transform'] }],
};
