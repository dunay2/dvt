import React from 'react';

import { Activity, GitMerge } from 'lucide-react';

import type { PluginContributions } from '../registry';

// ---------------------------------------------------------------------------
// monitoring plugin — static contributions v1
// ---------------------------------------------------------------------------

const MONITORING_PLUGIN_ID = 'monitoring';

// Run status → overlay border color
const STATUS_BORDER_COLOR: Record<string, string> = {
  running: '#3b82f6', // blue-500
  success: '#22c55e', // green-500
  failed: '#ef4444', // red-500
  skipped: '#eab308', // yellow-500
};

// Run status → badge color
const STATUS_BADGE_COLOR: Record<string, 'green' | 'red' | 'yellow' | 'blue' | 'gray'> = {
  running: 'blue',
  success: 'green',
  failed: 'red',
  skipped: 'yellow',
};

const STATUS_BADGE_TEXT: Record<string, string> = {
  running: '▶',
  success: '✓',
  failed: '✗',
  skipped: '–',
};

export const monitoringContributions: PluginContributions = {
  id: MONITORING_PLUGIN_ID,
  displayName: 'Monitoring',
  version: '1.0.0',
  capabilities: ['run.start', 'run.observe', 'run.cancel', 'canvas.overlay'],

  // ---- Views ---------------------------------------------------------------
  views: [
    {
      pluginId: MONITORING_PLUGIN_ID,
      id: 'monitoring.runs',
      path: '/runs',
      component: React.lazy(() => import('../../views/RunsView')),
      nav: {
        label: 'Runs',
        icon: Activity,
        order: 20,
        level: 'core',
      },
    },
    {
      pluginId: MONITORING_PLUGIN_ID,
      id: 'monitoring.run-detail',
      path: '/runs/:runId',
      // Same component — RunsView reads :runId from params internally
      component: React.lazy(() => import('../../views/RunsView')),
    },
  ],

  // ---- Overlays ------------------------------------------------------------

  overlays: [
    // runtime overlay — colors nodes by their run execution status
    {
      id: 'runtime',
      label: 'Runtime Status',
      icon: Activity,
      mode: 'exclusive',
      priority: 100,
      nodeDecorator: (node, ctx) => {
        if (!ctx.activeRun) return null;
        const status = ctx.runStatusByNodeId.get(node.id);
        if (!status) return null;
        const borderColor = STATUS_BORDER_COLOR[status];
        return borderColor ? { borderColor } : null;
      },
    },

    // impact overlay — dims nodes not related to the selection
    {
      id: 'impact',
      label: 'Impact Highlight',
      icon: GitMerge,
      mode: 'additive',
      priority: 10,
      nodeDecorator: (node, ctx) => {
        if (ctx.selectedNodeIds.size === 0) return null;
        const isAffected =
          ctx.selectedNodeIds.has(node.id) ||
          ctx.upstreamOfSelected.has(node.id) ||
          ctx.downstreamOfSelected.has(node.id);
        return isAffected ? null : { dimmed: true };
      },
    },
  ],

  // ---- Node badges ---------------------------------------------------------

  nodeBadges: [
    {
      id: 'monitoring.run-status',
      pluginId: MONITORING_PLUGIN_ID,
      forKinds: 'all',
      priority: 100,
      getBadge: (node, ctx) => {
        if (!ctx.activeRunId) return null;
        const status = ctx.runStatusByNodeId.get(node.id);
        if (!status || status === 'idle') return null;
        return {
          text: STATUS_BADGE_TEXT[status] ?? status,
          color: STATUS_BADGE_COLOR[status] ?? 'gray',
          position: 'top-right',
          tooltip: `Run status: ${status}`,
        };
      },
    },
  ],
};
