import React from 'react';
import { FileCode2, FileText, GitCompare, GitGraph, LayoutDashboard } from 'lucide-react';

import { ARTIFACTS_ROUTE_BOOTSTRAP_HANDLE } from '../../views/artifacts/artifactsRouteBootstrap';
import { CODE_ROUTE_BOOTSTRAP_HANDLE } from '../../views/code/codeRouteBootstrap';
import { DIFF_ROUTE_BOOTSTRAP_HANDLE } from '../../views/diff/diffRouteBootstrap';
import { LINEAGE_ROUTE_BOOTSTRAP_HANDLE } from '../../views/lineage/lineageRouteBootstrap';
import { CANVAS_ROUTE_BOOTSTRAP_HANDLE } from '../../views/canvas/canvasDraftPresentationStore';
import type { PluginContributions } from '../registry';
import { DBT_NODE_KINDS } from '../nodeTypeCatalog.dbt';
import { DbtNodeRenderer, dbtInspectorPanels, mapRunToCanonical } from './DbtNodeRenderer';

/**
 * Static v1 contribution manifest for the built-in dbt plugin.
 *
 * Canonical extension rules live in
 * `docs/architecture/components/web/plugin-contributions-developer-guide.md`.
 * Keep this file declarative and route behavior to the owning modules.
 */
const DBT_PLUGIN_ID = 'dbt';

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
  inspectorPanels: dbtInspectorPanels,
  // Route contributions define the dbt workbenches exposed in shell navigation.
  views: [
    {
      pluginId: DBT_PLUGIN_ID,
      id: 'dbt.canvas',
      path: '/canvas',
      component: React.lazy(() => import('../../views/Canvas')),
      handle: {
        routeBootstrap: CANVAS_ROUTE_BOOTSTRAP_HANDLE,
      },
      nav: {
        label: 'Canvas',
        icon: LayoutDashboard,
        order: 10,
        level: 'core',
      },
    },
    {
      pluginId: DBT_PLUGIN_ID,
      id: 'dbt.lineage',
      path: '/lineage',
      component: React.lazy(() => import('../../views/LineageView')),
      handle: {
        routeBootstrap: LINEAGE_ROUTE_BOOTSTRAP_HANDLE,
      },
      nav: {
        label: 'Lineage',
        icon: GitGraph,
        order: 15,
        level: 'core',
      },
    },
    {
      pluginId: DBT_PLUGIN_ID,
      id: 'dbt.code',
      path: '/code',
      component: React.lazy(() => import('../../views/CodeView')),
      handle: {
        routeBootstrap: CODE_ROUTE_BOOTSTRAP_HANDLE,
      },
      nav: {
        label: 'Code',
        icon: FileCode2,
        order: 16,
        level: 'core',
      },
    },
    {
      pluginId: DBT_PLUGIN_ID,
      id: 'dbt.diff',
      path: '/diff',
      component: React.lazy(() => import('../../views/DiffView')),
      handle: {
        routeBootstrap: DIFF_ROUTE_BOOTSTRAP_HANDLE,
      },
      nav: {
        label: 'Diff',
        icon: GitCompare,
        order: 17,
        level: 'core',
      },
    },
    {
      pluginId: DBT_PLUGIN_ID,
      id: 'dbt.artifacts',
      path: '/artifacts',
      component: React.lazy(() => import('../../views/ArtifactsView')),
      handle: {
        routeBootstrap: ARTIFACTS_ROUTE_BOOTSTRAP_HANDLE,
      },
      nav: {
        label: 'Artifacts',
        icon: FileText,
        order: 18,
        level: 'extended',
      },
    },
  ],
  canvasKinds: [
    {
      kind: 'dbt',
      pluginId: DBT_PLUGIN_ID,
      label: 'dbt',
      description: 'Model-first canvas for dbt resources and dependencies.',
      createTitle: 'dbt canvas',
      nodeKinds: DBT_NODE_KINDS,
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
  // Run adapter and port declarations keep the shell-facing runtime model
  // canonical while advertising dbt's tabular data contracts to other plugins.
  runAdapter: {
    mapToCanonical: mapRunToCanonical,
  },
  produces: [{ portType: 'data.tabular', forRoles: ['input', 'transform'] }],
  consumes: [{ portType: 'data.tabular', forRoles: ['input'] }],
};
