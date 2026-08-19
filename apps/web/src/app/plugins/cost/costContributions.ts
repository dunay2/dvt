/** Owned concern: declare Cost plugin contributions for shell composition. */
import { DollarSign } from 'lucide-react';

import type { PluginContributions } from '../registry';
import type { NodeCostData } from '../contracts/NodeCostData';
import { COST_ROUTE_BOOTSTRAP_HANDLE } from './costRouteHandle';
import { createDeferredView } from '../createDeferredView';

const COST_PLUGIN_ID = 'cost';
const CostView = createDeferredView(() => import('../../views/CostView'));
const COST_HIGH_DECORATION_THRESHOLD = 0.4;
const COST_MEDIUM_DECORATION_THRESHOLD = 0.2;

function resolveCostDecoration(costData: NodeCostData | undefined) {
  if (!costData || costData.cost <= 0) {
    return null;
  }

  if (costData.cost >= COST_HIGH_DECORATION_THRESHOLD) {
    return { borderColor: '#dc2626', backgroundColor: 'rgba(220, 38, 38, 0.18)' };
  }

  if (costData.cost >= COST_MEDIUM_DECORATION_THRESHOLD) {
    return { borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.18)' };
  }

  return { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.14)' };
}

export const costContributions: PluginContributions = {
  id: COST_PLUGIN_ID,
  displayName: 'Cost',
  version: '1.0.0',
  kind: 'optional',
  envFlag: 'VITE_PLUGIN_COST',
  backendPluginId: COST_PLUGIN_ID,
  capabilities: ['cost.analyze', 'canvas.overlay'],
  views: [
    {
      pluginId: COST_PLUGIN_ID,
      id: 'cost.dashboard',
      path: '/cost',
      component: CostView,
      handle: {
        routeBootstrap: COST_ROUTE_BOOTSTRAP_HANDLE,
      },
      placement: {
        kind: 'shell-nav',
        label: {
          key: 'navigation.cost',
          fallback: 'Cost',
          translations: { es: 'Coste' },
        },
        icon: DollarSign,
        order: 25,
        level: 'extended',
      },
    },
  ],
  overlays: [
    {
      id: COST_PLUGIN_ID,
      label: 'Cost Heatmap',
      icon: DollarSign,
      mode: 'exclusive',
      priority: 90,
      nodeDecorator: (node, ctx) => resolveCostDecoration(ctx.costByNodeId.get(node.id)),
    },
  ],
};
