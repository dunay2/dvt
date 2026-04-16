import React from 'react';
import { FileCode2, FileText, GitCompare, GitGraph, LayoutDashboard } from 'lucide-react';

import type { PluginContributions } from '../registry';
import { DBT_NODE_KINDS } from '../nodeTypeCatalog.dbt';
import { DbtNodeRenderer, dbtInspectorPanels, mapRunToCanonical } from './DbtNodeRenderer';

const DBT_PLUGIN_ID = 'dbt';

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
    {
      pluginId: DBT_PLUGIN_ID,
      id: 'dbt.lineage',
      path: '/lineage',
      component: React.lazy(() => import('../../views/LineageView')),
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
      nav: {
        label: 'Artifacts',
        icon: FileText,
        order: 18,
        level: 'extended',
      },
    },
  ],
  connectionRules: [
    { sourceKind: 'dbt:macro', targetKind: '*', allowed: true },
    { sourceKind: 'dbt:source', targetKind: 'dvt:sql_transform', allowed: true },
    { sourceKind: 'dbt:source', targetKind: 'dbt:model', allowed: true },
    { sourceKind: 'dbt:source', targetKind: 'dbt:test', allowed: true },
    { sourceKind: 'dvt:sql_transform', targetKind: 'dvt:sink', allowed: true },
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
  runAdapter: {
    mapToCanonical: mapRunToCanonical,
  },
  produces: [{ portType: 'data.tabular', forRoles: ['transform'] }],
  consumes: [{ portType: 'data.tabular', forRoles: ['input'] }],
};
