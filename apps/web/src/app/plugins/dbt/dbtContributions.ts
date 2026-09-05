import { LayoutDashboard } from 'lucide-react';

import { CANVAS_ROUTE_BOOTSTRAP_HANDLE } from '../../views/canvas/canvasDraftPresentationStore';
import type { PluginContributions } from '../registry';
import { DBT_NODE_KINDS } from '../nodeTypeCatalog.dbt';
import { DbtNodeRenderer, dbtInspectorPanels, mapRunToCanonical } from './DbtNodeRenderer';
import { dbtGraphNodeCardStrategy } from './dbtGraphNodeCardStrategy';
import { createDeferredView } from '../createDeferredView';

/**
 * Static v1 contribution manifest for the built-in dbt plugin.
 *
 * Canonical extension rules live in
 * `docs/architecture/components/web/plugin-contributions-developer-guide.md`.
 * Keep this file declarative and route behavior to the owning modules.
 */
const DBT_PLUGIN_ID = 'dbt';
const CanvasView = createDeferredView(() => import('../../views/Canvas'));

// dbt owns the renderer registration for every dbt node kind declared in the
// canonical node-kind catalog.
const nodeRenderers = new Map(
  DBT_NODE_KINDS.map((kind) => [
    kind.kind,
    {
      kind: kind.kind,
      priority: 100,
      component: DbtNodeRenderer,
    },
  ])
);

/**
 * Shell-facing contribution entry consumed by `PLUGIN_REGISTRY`.
 */
export const dbtContributions: PluginContributions = {
  id: DBT_PLUGIN_ID,
  displayName: 'dbt',
  version: '1.0.0',
  capabilities: [
    'canvas.render',
    'canvas.edit',
    'plan.import',
    'plan.export',
    'artifact.read',
    'lineage.resolve',
  ],
  nodeKinds: DBT_NODE_KINDS,
  nodeRenderers,
  graphNodeCardStrategies: [dbtGraphNodeCardStrategy],
  inspectorPanels: dbtInspectorPanels,
  // View placements define shell navigation only. Canvas-scoped Code,
  // Lineage, Diff, and Artifacts open from contextual workbench actions.
  views: [
    {
      pluginId: DBT_PLUGIN_ID,
      id: 'dbt.canvas',
      path: '/canvas',
      component: CanvasView,
      handle: {
        routeBootstrap: CANVAS_ROUTE_BOOTSTRAP_HANDLE,
      },
      placement: {
        kind: 'shell-nav',
        label: {
          key: 'navigation.canvas',
          fallback: 'Canvas',
          translations: { es: 'Canvas' },
        },
        icon: LayoutDashboard,
        order: 10,
        level: 'core',
      },
    },
  ],
  // Connection rules express dbt-local authoring policy; shell-level graph
  // invariants still run before these plugin rules are evaluated.
  connectionRules: [
    { sourceKind: 'dbt:macro', targetKind: '*', allowed: true },
    { sourceKind: 'dbt:source', targetKind: 'dbt:model', allowed: true },
    { sourceKind: 'dbt:source', targetKind: 'dbt:test', allowed: true },
    { sourceKind: 'dbt:seed', targetKind: 'dbt:model', allowed: true },
    { sourceKind: 'dbt:seed', targetKind: 'dbt:test', allowed: true },
    { sourceKind: 'dbt:model', targetKind: 'dbt:model', allowed: true },
    { sourceKind: 'dbt:model', targetKind: 'dbt:test', allowed: true },
    { sourceKind: 'dbt:model', targetKind: 'dbt:snapshot', allowed: true },
    { sourceKind: 'dbt:model', targetKind: 'dbt:exposure', allowed: true },
    { sourceKind: 'dbt:model', targetKind: 'dbt:metric', allowed: true },
    { sourceKind: 'dbt:snapshot', targetKind: 'dbt:model', allowed: true },
    { sourceKind: 'dbt:snapshot', targetKind: 'dbt:test', allowed: true },
    {
      sourceKind: 'dbt:test',
      targetKind: '*',
      allowed: false,
      reason: 'Tests are terminal nodes',
    },
    {
      sourceKind: 'dbt:exposure',
      targetKind: '*',
      allowed: false,
      reason: 'Exposures are terminal nodes',
    },
    {
      sourceKind: 'dbt:metric',
      targetKind: '*',
      allowed: false,
      reason: 'Metrics are terminal nodes (v1)',
    },
    {
      sourceKind: '*',
      targetKind: '*',
      allowed: false,
      reason: 'Connection not permitted by dbt rules',
    },
  ],
  // The run adapter and incoming port keep the shell-facing runtime model
  // canonical without advertising an unsupported outbound cross-plugin path.
  runAdapter: {
    mapToCanonical: mapRunToCanonical,
  },
  consumes: [{ portType: 'data.tabular', forRoles: ['transform'] }],
};
