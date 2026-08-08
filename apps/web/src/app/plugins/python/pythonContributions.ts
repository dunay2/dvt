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

const executionStrategy = {
  kind: 'python_code_preview',
  previewProfile: 'planner-generic-v1',
  sourceFamily: 'python-code',
} as const;

export const pythonContributions: PluginContributions = {
  id: PYTHON_PLUGIN_ID,
  backendPluginId: PYTHON_PLUGIN_ID,
  displayName: 'DVT Python',
  version: '1.0.0',
  kind: 'optional',
  capabilities: ['canvas.render', 'canvas.edit', 'plan.preview', 'run.start', 'run.observe'],
  nodeKinds: [...PYTHON_NODE_KINDS],
  canvasKinds: [
    {
      kind: 'python',
      pluginId: PYTHON_PLUGIN_ID,
      executionStrategy,
      graphStrategy: pythonCanvasGraphStrategy,
      surfaceStrategy: pythonCanvasSurfaceStrategy,
      label: 'Python workflow',
      description: 'Stateless governed Python code nodes with explicit JSON inputs and outputs.',
      createTitle: 'Python workflow canvas',
      emptyState: {
        title: 'Start a Python workflow',
        editableMessage:
          'Add a Python code node, configure its explicit JSON input, and connect nodes to express execution order.',
      },
      localizedCopy: {
        es: {
          label: 'Flujo Python',
          description:
            'Nodos Python gobernados y sin estado compartido, con entradas y salidas JSON explícitas.',
          createTitle: 'Canvas de flujo Python',
          emptyState: {
            title: 'Inicia un flujo Python',
            editableMessage:
              'Añade un nodo de código Python, configura su entrada JSON explícita y conecta los nodos para expresar el orden de ejecución.',
          },
        },
      },
      nodeKinds: [...PYTHON_NODE_KINDS],
    },
  ],
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
