import React from 'react';
import { FileCode2, FileText, GitCompare, GitGraph, LayoutDashboard } from 'lucide-react';

import { CANVAS_ROUTE_BOOTSTRAP_HANDLE } from '../../views/canvas/canvasDraftPresentationStore';
import type { PluginContributions } from '../registry';
import { DBT_NODE_KINDS } from '../nodeTypeCatalog.dbt';
import { DbtNodeRenderer, dbtInspectorPanels, mapRunToCanonical } from './DbtNodeRenderer';
import { dbtCanvasSurfaceStrategy } from './dbtCanvasSurfaceStrategy';
import { dbtCanvasGraphStrategy } from './dbtNodeAdapter';
import { dbtGraphNodeCardStrategy } from './dbtGraphNodeCardStrategy';

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
  graphNodeCardStrategies: [dbtGraphNodeCardStrategy],
  inspectorPanels: dbtInspectorPanels,
  // View placements define shell navigation and Canvas-scoped workbench tabs.
  views: [
    {
      pluginId: DBT_PLUGIN_ID,
      id: 'dbt.canvas',
      path: '/canvas',
      component: React.lazy(() => import('../../views/Canvas')),
      handle: {
        routeBootstrap: CANVAS_ROUTE_BOOTSTRAP_HANDLE,
      },
      placement: {
        kind: 'shell-nav',
        label: 'Canvas',
        icon: LayoutDashboard,
        order: 10,
        level: 'core',
      },
    },
    {
      pluginId: DBT_PLUGIN_ID,
      id: 'dbt.lineage',
      component: React.lazy(() => import('../../views/LineageView')),
      placement: {
        kind: 'workbench-tab',
        workbench: 'canvas',
        tabId: 'lineage',
        label: 'Lineage',
        icon: GitGraph,
        order: 30,
        scope: 'canvas',
      },
    },
    {
      pluginId: DBT_PLUGIN_ID,
      id: 'dbt.code',
      component: React.lazy(() => import('../../views/CodeView')),
      placement: {
        kind: 'workbench-tab',
        workbench: 'canvas',
        tabId: 'code',
        label: 'Code',
        icon: FileCode2,
        order: 20,
        scope: 'workspace',
      },
    },
    {
      pluginId: DBT_PLUGIN_ID,
      id: 'dbt.diff',
      component: React.lazy(() => import('../../views/DiffView')),
      placement: {
        kind: 'workbench-tab',
        workbench: 'canvas',
        tabId: 'diff',
        label: 'Diff',
        icon: GitCompare,
        order: 40,
        scope: 'canvas',
      },
    },
    {
      pluginId: DBT_PLUGIN_ID,
      id: 'dbt.artifacts',
      component: React.lazy(() => import('../../views/ArtifactsView')),
      placement: {
        kind: 'workbench-tab',
        workbench: 'canvas',
        tabId: 'artifacts',
        label: 'Artifacts',
        icon: FileText,
        order: 50,
        scope: 'run',
      },
    },
  ],
  canvasKinds: [
    {
      kind: 'dbt',
      pluginId: DBT_PLUGIN_ID,
      executionStrategy: {
        kind: 'planner_generic_preview',
        previewProfile: 'planner-generic-v1',
        sourceFamily: 'dbt',
      },
      graphStrategy: dbtCanvasGraphStrategy,
      surfaceStrategy: dbtCanvasSurfaceStrategy,
      label: 'dbt',
      description: 'Model-first canvas for dbt resources and dependencies.',
      createTitle: 'dbt canvas',
      emptyState: {
        title: 'Start dbt canvas',
        editableMessage:
          'Start this dbt canvas by adding a governed source, model, snapshot, exposure, or metric.',
      },
      nodeKinds: DBT_NODE_KINDS,
    },
  ],
  sourceImport: [
    {
      id: 'dbt.source-yaml',
      pluginId: DBT_PLUGIN_ID,
      sourceType: 'database',
      artifactKind: 'dbt-source-yaml',
      options: [
        {
          id: 'includeColumns',
          label: 'Include Column Metadata',
          description:
            'Add column names and data types to YAML (stored under meta.warehouse_data_type).',
          defaultEnabled: true,
          order: 10,
        },
        {
          id: 'addTests',
          label: 'Add Generic Tests',
          description: 'Automatically add not_null and unique tests for detected primary keys.',
          defaultEnabled: false,
          order: 20,
        },
        {
          id: 'addFreshness',
          label: 'Add Freshness Checks',
          description: 'Add default freshness thresholds (warn_after: 24h, error_after: 48h).',
          defaultEnabled: false,
          order: 30,
        },
      ],
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
