/** Owned concern: map a server-analyzed dbt project to canonical Canvas read models. */
import type { DbtProjectGraphProjection } from '@dvt/contracts';

import type {
  CanonicalEdge,
  CanonicalEdgeRelation,
  CanonicalNode,
  CoreNodeRole,
  PluginNodeKind,
} from '../../types/canonical';

type DbtProjectedNode = DbtProjectGraphProjection['nodes'][number];

const RESOURCE_PRESENTATION: Record<
  DbtProjectedNode['resourceType'],
  Readonly<{ kind: PluginNodeKind; role: CoreNodeRole }>
> = {
  source: { kind: 'dvt:source', role: 'input' },
  model: { kind: 'dvt:transform', role: 'transform' },
  seed: { kind: 'dbt:seed', role: 'input' },
  snapshot: { kind: 'dbt:snapshot', role: 'transform' },
  test: { kind: 'dbt:test', role: 'check' },
  exposure: { kind: 'dbt:exposure', role: 'output' },
  metric: { kind: 'dbt:metric', role: 'output' },
};

const EDGE_RELATION: Record<
  DbtProjectGraphProjection['edges'][number]['relation'],
  CanonicalEdgeRelation
> = {
  dependency: 'lineage',
  test_target: 'validation',
  exposure: 'consumption',
  metric: 'metric',
};

function normalizeWorkspacePath(path: string): string {
  return path.replaceAll('\\', '/');
}

export type DbtProjectFileCanvasProjection = Readonly<{
  nodes: CanonicalNode[];
  edges: CanonicalEdge[];
  freshness: DbtProjectGraphProjection['freshness'];
  diagnostics: DbtProjectGraphProjection['diagnostics'];
  projectRevision: DbtProjectGraphProjection['projectRevision'];
}>;

function projectNode(
  node: DbtProjectedNode,
  freshness: DbtProjectGraphProjection['freshness']
): CanonicalNode {
  const presentation = RESOURCE_PRESENTATION[node.resourceType];
  const hasProjectionWarning =
    freshness !== 'fresh' || node.visualEditability.status !== 'editable';

  return {
    id: node.uniqueId,
    name: node.name,
    pluginId: node.resourceType === 'source' || node.resourceType === 'model' ? 'dvt' : 'dbt',
    kind: presentation.kind,
    role: presentation.role,
    status: hasProjectionWarning ? 'warn' : 'idle',
    tags: [...node.tags],
    ...(node.description === undefined ? {} : { description: node.description }),
    ...(node.originalFilePath === undefined
      ? {}
      : { path: normalizeWorkspacePath(node.originalFilePath) }),
    metadata: {
      dbtUniqueId: node.uniqueId,
      resourceType: node.resourceType,
      packageName: node.packageName,
      ...(node.descriptionFilePath === undefined
        ? {}
        : { descriptionFilePath: normalizeWorkspacePath(node.descriptionFilePath) }),
      ...(node.sourceName === undefined ? {} : { sourceName: node.sourceName }),
      ...(node.resourceType === 'source' ? { tableIdentifier: node.identifier ?? node.name } : {}),
      ...(node.sourceIdentity === undefined ? {} : { ...node.sourceIdentity }),
      ...(node.materialized === undefined ? {} : { materialized: node.materialized }),
      columns: node.columns.map((column) => ({
        name: column.name,
        type: column.dataType ?? 'unknown',
        ...(column.description === undefined ? {} : { description: column.description }),
      })),
      visualEditability: node.visualEditability,
      ...(node.testMetadata === undefined
        ? {}
        : {
            testMetadata: node.testMetadata,
            testType: node.testMetadata.name,
            testTarget: node.testMetadata.targetUniqueId,
            testTargetModel: node.testMetadata.targetUniqueId,
            testTargetColumn: node.testMetadata.columnName,
            severity: node.testMetadata.severity,
          }),
      authority: 'dbt-project-files',
    },
  };
}

export function projectDbtProjectGraphToCanonicalCanvas(
  source: DbtProjectGraphProjection
): DbtProjectFileCanvasProjection {
  return {
    nodes: source.nodes.map((node) => projectNode(node, source.freshness)),
    edges: source.edges.map((edge) => ({
      id: edge.id,
      sourceId: edge.sourceUniqueId,
      targetId: edge.targetUniqueId,
      relation: EDGE_RELATION[edge.relation],
      metadata: {
        dbtRelation: edge.relation,
        authority: 'dbt-project-files',
      },
    })),
    freshness: source.freshness,
    diagnostics: [...source.diagnostics],
    projectRevision: source.projectRevision,
  };
}
