import React from 'react';

import { LayoutDashboard } from 'lucide-react';

import type { PluginContributions } from '../registry';
import { DBT_NODE_KINDS } from '../nodeTypeCatalog.dbt';
import { DbtNodeRenderer } from './DbtNodeRenderer';
import { dbtInspectorPanels } from './inspectorPanels';

// ---------------------------------------------------------------------------
// dbt plugin — static contributions v1
// ---------------------------------------------------------------------------

const DBT_PLUGIN_ID = 'dbt';

// Node renderers — one per kind, all at the same priority (100).
// If another plugin registers a renderer for a dbt kind at priority > 100,
// that renderer wins. In practice this should not happen in v1.
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

export const dbtContributions: PluginContributions = {
  id: DBT_PLUGIN_ID,
  displayName: 'dbt',
  version: '1.0.0',
  capabilities: ['canvas.render', 'canvas.edit', 'plan.import', 'plan.export', 'artifact.read'],

  // ---- Node kinds ----------------------------------------------------------
  nodeKinds: DBT_NODE_KINDS,

  // ---- Node renderers ------------------------------------------------------
  nodeRenderers,

  // ---- Inspector panels ----------------------------------------------------
  inspectorPanels: dbtInspectorPanels,

  // ---- Views ---------------------------------------------------------------
  views: [
    {
      pluginId: DBT_PLUGIN_ID,
      id: 'dbt.canvas',
      path: '/canvas',
      component: React.lazy(() => import('../../views/Canvas')),
      nav: {
        label: 'Canvas',
        icon: LayoutDashboard,
        order: 10,
        level: 'core',
      },
    },
  ],

  // ---- Connection rules ----------------------------------------------------
  //
  // Within the dbt plugin, connections follow dbt's own DAG semantics:
  //   source/seed → model → model/test/exposure/metric
  //   macro → anything
  //   test/exposure/metric cannot be sources of connections
  //
  connectionRules: [
    // macro can connect to any kind
    { sourceKind: 'dbt:macro', targetKind: '*', allowed: true },

    // source and seed feed into models
    { sourceKind: 'dbt:source', targetKind: 'dbt:model', allowed: true },
    { sourceKind: 'dbt:source', targetKind: 'dbt:test', allowed: true },
    { sourceKind: 'dbt:seed', targetKind: 'dbt:model', allowed: true },
    { sourceKind: 'dbt:seed', targetKind: 'dbt:test', allowed: true },

    // model feeds models, tests, snapshots, exposures, metrics
    { sourceKind: 'dbt:model', targetKind: 'dbt:model', allowed: true },
    { sourceKind: 'dbt:model', targetKind: 'dbt:test', allowed: true },
    { sourceKind: 'dbt:model', targetKind: 'dbt:snapshot', allowed: true },
    { sourceKind: 'dbt:model', targetKind: 'dbt:exposure', allowed: true },
    { sourceKind: 'dbt:model', targetKind: 'dbt:metric', allowed: true },

    // snapshot feeds models, tests
    { sourceKind: 'dbt:snapshot', targetKind: 'dbt:model', allowed: true },
    { sourceKind: 'dbt:snapshot', targetKind: 'dbt:test', allowed: true },

    // test, exposure, metric are terminal — cannot be sources
    { sourceKind: 'dbt:test', targetKind: '*', allowed: false, reason: 'Tests are terminal nodes' },
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

    // default: deny anything not explicitly listed
    {
      sourceKind: '*',
      targetKind: '*',
      allowed: false,
      reason: 'Connection not permitted by dbt rules',
    },
  ],

  // ---- Cross-plugin data ports --------------------------------------------
  //
  // dbt models and snapshots produce tabular data from their transform role.
  // dbt sources and seeds are inputs that other plugins can connect to.
  // exposure and metric are NOT included — they are not generic tabular outputs.
  //
  produces: [{ portType: 'data.tabular', forRoles: ['transform'] }],
  consumes: [{ portType: 'data.tabular', forRoles: ['input'] }],
};
