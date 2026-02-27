import { PlannerError, PlannerErrorCode } from './errors.js';
import type { GraphNode } from './types.js';

type ManifestNodeLike = {
  resource_type?: unknown;
  depends_on?: unknown;
  config?: unknown;
};

type ManifestLike = {
  nodes?: Record<string, ManifestNodeLike>;
};

type DependsOnLike = {
  nodes?: unknown;
};

/**
 * Deriva nodos de planner desde un dbt `manifest.json` (subset mínimo para MVP).
 *
 * Soporta recursos dbt de tipo model/test/snapshot.
 */
export function deriveGraphNodesFromManifest(
  manifest: Record<string, unknown>
): readonly GraphNode[] {
  const root = manifest as ManifestLike;
  const nodes = root.nodes;

  if (nodes === undefined || typeof nodes !== 'object' || nodes === null) {
    throw new PlannerError(
      PlannerErrorCode.INVALID_INPUT,
      'manifest.nodes must be a non-null object when manifest is provided.'
    );
  }

  const out: GraphNode[] = [];

  for (const [nodeId, raw] of Object.entries(nodes)) {
    if (raw === null || typeof raw !== 'object') {
      continue;
    }

    const resourceTypeRaw = (raw as ManifestNodeLike).resource_type;
    if (typeof resourceTypeRaw !== 'string') {
      continue;
    }

    if (
      resourceTypeRaw !== 'model' &&
      resourceTypeRaw !== 'test' &&
      resourceTypeRaw !== 'snapshot'
    ) {
      continue;
    }

    const dependsOnRaw = (raw as ManifestNodeLike).depends_on;
    const dependsOnNodesRaw =
      dependsOnRaw !== null && typeof dependsOnRaw === 'object'
        ? ((dependsOnRaw as DependsOnLike).nodes as unknown)
        : undefined;

    const dependsOn: string[] =
      Array.isArray(dependsOnNodesRaw) && dependsOnNodesRaw.every((v) => typeof v === 'string')
        ? [...dependsOnNodesRaw]
        : [];

    out.push({
      nodeId,
      resourceType: resourceTypeRaw,
      dependsOn,
    });
  }

  if (out.length === 0) {
    throw new PlannerError(
      PlannerErrorCode.INVALID_INPUT,
      'manifest.nodes does not contain supported dbt resources (model/test/snapshot).'
    );
  }

  return out;
}
