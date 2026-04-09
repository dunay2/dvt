import { GENERIC_GRAPH_SOURCE_KIND, type GenericGraphSourceV1 } from '@dvt/contracts';

import { DeriveNodesCommand, ManifestGraphDeriver } from '../domain/manifest.js';

export function derivePlannerGraphSourceFromManifest(
  manifest: Record<string, unknown>
): GenericGraphSourceV1 {
  const nodes = new ManifestGraphDeriver().execute(new DeriveNodesCommand(manifest));
  return {
    kind: GENERIC_GRAPH_SOURCE_KIND,
    sourceFamily: 'dbt',
    sourceVersion: '1.0',
    nodes: nodes.map((node) => ({
      nodeId: node.nodeId,
      stepKind: node.stepKind,
      dependsOn: node.dependsOn,
    })),
  };
}
