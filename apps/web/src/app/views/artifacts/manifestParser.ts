import type {
  ManifestImportResult,
  ManifestNodeRecord,
  ManifestRoot,
  ParsedManifestNodeType,
} from './types';

const RESOURCE_TYPE_TO_NODE_TYPE: Record<string, ParsedManifestNodeType> = {
  model: 'MODEL',
  source: 'SOURCE',
  seed: 'SEED',
  snapshot: 'SNAPSHOT',
  test: 'TEST',
  exposure: 'EXPOSURE',
  metric: 'METRIC',
  macro: 'MACRO',
};

function isSupportedManifestNode(
  node: ManifestNodeRecord
): node is Required<Pick<ManifestNodeRecord, 'unique_id' | 'name' | 'resource_type'>> &
  ManifestNodeRecord {
  return (
    typeof node.unique_id === 'string' &&
    typeof node.name === 'string' &&
    typeof node.resource_type === 'string' &&
    Object.prototype.hasOwnProperty.call(RESOURCE_TYPE_TO_NODE_TYPE, node.resource_type)
  );
}

export function parseManifest(
  raw: unknown
): { ok: true; result: ManifestImportResult } | { ok: false; message: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, message: 'Expected a JSON object at the root.' };
  }

  const manifest = raw as ManifestRoot;
  const rawNodes = [
    ...Object.values(manifest.nodes ?? {}),
    ...Object.values(manifest.sources ?? {}),
    ...Object.values(manifest.exposures ?? {}),
    ...Object.values(manifest.metrics ?? {}),
    ...Object.values(manifest.macros ?? {}),
  ];

  if (rawNodes.length === 0) {
    return { ok: false, message: 'Object does not look like a dbt manifest.' };
  }

  const nodes = rawNodes
    .filter(isSupportedManifestNode)
    .map((node) => {
      const nodeType = RESOURCE_TYPE_TO_NODE_TYPE[node.resource_type];
      if (!nodeType) {
        return null;
      }

      return {
        id: node.unique_id,
        name: node.name,
        type: nodeType,
        dependencies:
          node.depends_on?.nodes?.filter((dep): dep is string => typeof dep === 'string') ?? [],
      };
    })
    .filter((node): node is ManifestImportResult['nodes'][number] => node !== null);

  if (nodes.length === 0) {
    return { ok: false, message: 'Manifest contains no recognizable dbt graph nodes.' };
  }

  const knownNodeIds = new Set(nodes.map((node) => node.id));
  const edges = nodes.flatMap((node) =>
    node.dependencies
      .filter((dependency) => knownNodeIds.has(dependency))
      .map((dependency) => ({
        id: `${dependency}->${node.id}`,
        source: dependency,
        target: node.id,
      }))
  );

  return {
    ok: true,
    result: {
      nodes,
      edges,
      generatedAt: manifest.metadata?.generated_at ?? null,
      dbtVersion: manifest.metadata?.dbt_version ?? null,
      rawManifest: raw,
    },
  };
}
