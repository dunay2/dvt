import { FileCode2 } from 'lucide-react';

import { createPublishedRouteBootstrapHandle } from '../../bootstrap/routeBootstrapContract';
import type { PluginContributions } from '../registry';
import { GraphNodeRenderer } from '../graph/GraphNodeRenderer';
import { dvtCanvasSurfaceStrategy } from './dvtCanvasSurfaceStrategy';
import { DVT_AUTHORING_NODE_KINDS } from './dvtNodeTypeCatalog';
import { dvtGraphNodeCardStrategy } from './dvtGraphNodeCardStrategy';
import { transformationCanvasGraphStrategy } from './transformationGraphStrategy';
import { createDeferredView } from '../createDeferredView';

const DVT_PLUGIN_ID = 'dvt';
const TemplatesView = createDeferredView(() => import('../../views/TemplatesView'));
export const DVT_WAREHOUSE_SOURCE_PLUGIN_ID = 'dvt.warehouse-source';
const TEMPLATES_ROUTE_BOOTSTRAP_HANDLE = createPublishedRouteBootstrapHandle({
  pendingDetail: 'Preparing Templates route',
});

const nodeRenderers = new Map(
  DVT_AUTHORING_NODE_KINDS.map((kind) => [
    kind.kind,
    {
      kind: kind.kind,
      priority: 100,
      component: GraphNodeRenderer,
    },
  ])
);

export const dvtContributions: PluginContributions = {
  id: DVT_PLUGIN_ID,
  displayName: 'DVT',
  version: '1.0.0',
  capabilities: ['canvas.render', 'canvas.edit', 'plan.preview'],
  nodeKinds: DVT_AUTHORING_NODE_KINDS,
  graphNodeCardStrategies: [dvtGraphNodeCardStrategy],
  views: [
    {
      pluginId: DVT_PLUGIN_ID,
      id: 'dvt.templates',
      path: '/templates',
      component: TemplatesView,
      handle: {
        routeBootstrap: TEMPLATES_ROUTE_BOOTSTRAP_HANDLE,
      },
      placement: {
        kind: 'shell-nav',
        label: {
          key: 'navigation.templates',
          fallback: 'Templates',
          translations: { es: 'Plantillas' },
        },
        icon: FileCode2,
        order: 60,
        level: 'extended',
      },
    },
  ],
  canvasKinds: [
    {
      kind: 'transformation',
      pluginId: DVT_PLUGIN_ID,
      executionStrategy: {
        kind: 'not_executable',
      },
      graphStrategy: transformationCanvasGraphStrategy,
      surfaceStrategy: dvtCanvasSurfaceStrategy,
      label: 'Transformation',
      description: 'Flow-based transformation canvas for the protected authoring draft.',
      createTitle: 'Transformation canvas',
      localizedCopy: {
        es: {
          label: 'Transformación',
          description: 'Canvas de flujo para el borrador protegido de autoría.',
          createTitle: 'Canvas de transformación',
        },
      },
      nodeKinds: DVT_AUTHORING_NODE_KINDS,
    },
  ],
  nodeRenderers,
  connectionRules: [
    { sourceKind: 'dvt:source', targetKind: 'dvt:transform', allowed: true },
    { sourceKind: 'dvt:transform', targetKind: 'dvt:sink', allowed: true },
    {
      sourceKind: 'dvt:sink',
      targetKind: '*',
      allowed: false,
      reason: 'Sinks are terminal nodes',
    },
    {
      sourceKind: '*',
      targetKind: '*',
      allowed: false,
      reason: 'Connection not permitted by DVT authoring rules',
    },
  ],
  consumes: [{ portType: 'data.tabular', forRoles: ['transform'] }],
};

export const dvtWarehouseSourceContributions: PluginContributions = {
  id: DVT_WAREHOUSE_SOURCE_PLUGIN_ID,
  displayName: 'DVT Warehouse Source',
  version: '1.0.0',
  capabilities: ['canvas.render'],
  graphNodeCardStrategies: [dvtGraphNodeCardStrategy],
  sourceImport: [
    {
      id: 'dvt.warehouse-source.import',
      pluginId: DVT_WAREHOUSE_SOURCE_PLUGIN_ID,
      sourceType: 'database',
      artifactKind: 'warehouse-source',
      options: [
        {
          id: 'includeColumns',
          label: {
            key: 'dvt.sourceImport.includeColumns.label',
            fallback: 'Include Column Metadata',
            translations: { es: 'Incluir metadatos de columnas' },
          },
          description: {
            key: 'dvt.sourceImport.includeColumns.description',
            fallback: 'Add column names and data types to imported source metadata.',
            translations: {
              es: 'Añade nombres de columnas y tipos de datos a los metadatos del origen importado.',
            },
          },
          defaultEnabled: true,
          order: 10,
        },
        {
          id: 'addTests',
          label: {
            key: 'dvt.sourceImport.addTests.label',
            fallback: 'Add Generic Tests',
            translations: { es: 'Añadir tests genéricos' },
          },
          description: {
            key: 'dvt.sourceImport.addTests.description',
            fallback: 'Automatically add not_null and unique tests for detected primary keys.',
            translations: {
              es: 'Añade automáticamente tests not_null y unique para las claves primarias detectadas.',
            },
          },
          defaultEnabled: false,
          order: 20,
        },
        {
          id: 'addFreshness',
          label: {
            key: 'dvt.sourceImport.addFreshness.label',
            fallback: 'Add Freshness Checks',
            translations: { es: 'Añadir comprobaciones de actualización' },
          },
          description: {
            key: 'dvt.sourceImport.addFreshness.description',
            fallback: 'Add default freshness thresholds for imported source freshness metadata.',
            translations: {
              es: 'Añade umbrales predeterminados a los metadatos de actualización del origen importado.',
            },
          },
          defaultEnabled: false,
          order: 30,
        },
      ],
    },
  ],
  produces: [{ portType: 'data.tabular', forRoles: ['input'] }],
  consumes: [],
};
