import { PLANNER_GRAPH_SOURCE_KIND, type PlannerGraphSourceV1 } from '@dvt/contracts';

import { DeriveNodesCommand, ManifestGraphDeriver } from '../domain/manifest.js';

export function derivePlannerGraphSourceFromManifest(
  manifest: Record<string, unknown>
): PlannerGraphSourceV1 {
  return {
    kind: PLANNER_GRAPH_SOURCE_KIND,
    nodes: new ManifestGraphDeriver().execute(new DeriveNodesCommand(manifest)),
  };
}
