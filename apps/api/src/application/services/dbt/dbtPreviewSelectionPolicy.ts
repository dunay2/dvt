/**
 * Owned concern: validate file-authoritative Preview input integrity without IO or inferred SQL semantics.
 * @decision Keep canonical graph/provenance integrity checks pure and reuse full target equality.
 * @consequence Browser graph semantics or partial identities cannot replace server evidence.
 */
import type {
  DbtProjectFilesProvenance,
  DbtProjectGraphProjection,
  GenericGraphNodeV1,
  GenericGraphSourceV1,
} from '@dvt/contracts';

import { compareGraphIds } from '../compareGraphIds.js';
import { sameExecutionTarget } from '../dbtPlanExecutionBinding.js';
import type { ExecutableSubgraphSelectionRejection } from '../resolveAuthorizedExecutableSubgraph.js';

export const EXECUTABLE_RESOURCE = {
  model: { stepKind: 'DBT_MODEL', kind: 'dbt:model', role: 'transform' },
  snapshot: { stepKind: 'DBT_SNAPSHOT', kind: 'dbt:snapshot', role: 'transform' },
  test: { stepKind: 'DBT_TEST', kind: 'dbt:test', role: 'check' },
} as const;

export function findProvenanceMismatch(
  projection: DbtProjectGraphProjection,
  provenance: DbtProjectFilesProvenance
): string | null {
  const authority = projection.authorityBinding.authority;
  if (
    projection.authorityBinding.canvasId !== provenance.canvasId ||
    authority.kind !== 'dbt-project-files' ||
    authority.projectRoot !== provenance.projectRoot ||
    projection.projectRevision.projectRoot !== provenance.projectRoot
  ) {
    return 'The active Canvas authority no longer matches the previewed dbt project.';
  }
  if (
    projection.freshness !== 'fresh' ||
    !projection.capabilities.canPreview ||
    projection.projectRevision.contentSetSha256 !== provenance.contentSetSha256 ||
    projection.analysisSha256 !== provenance.analysisSha256 ||
    projection.projectRevision.dbtVersion !== provenance.dbtVersion
  ) {
    return 'The analyzed dbt project revision no longer matches the preview provenance.';
  }
  if (
    projection.executionTarget == null ||
    !sameExecutionTarget(projection.executionTarget, provenance.executionTarget)
  ) {
    return 'The server-owned dbt execution target no longer matches the preview provenance.';
  }
  return null;
}

export function buildAuthoritativeGraph(
  projection: DbtProjectGraphProjection,
  selectedUniqueIds: readonly string[]
): { readonly ok: true; readonly value: GenericGraphSourceV1 } | ReturnType<typeof reject> {
  const nodeById = new Map(projection.nodes.map((node) => [node.uniqueId, node]));
  const selectedIdSet = new Set(selectedUniqueIds);

  for (const nodeId of selectedUniqueIds) {
    const node = nodeById.get(nodeId);
    if (node === undefined || !(node.resourceType in EXECUTABLE_RESOURCE)) {
      return reject(
        'dbt_project_selected_resource_not_executable',
        `Selected dbt resource ${nodeId} is missing or is not executable.`
      );
    }
  }

  const graphNodes: GenericGraphNodeV1[] = [];
  for (const nodeId of selectedUniqueIds) {
    const node = nodeById.get(nodeId)!;
    const presentation = EXECUTABLE_RESOURCE[node.resourceType as keyof typeof EXECUTABLE_RESOURCE];
    const incomingExecutableIds = projection.edges
      .filter((edge) => edge.targetUniqueId === nodeId)
      .map((edge) => nodeById.get(edge.sourceUniqueId))
      .filter(
        (dependency): dependency is NonNullable<typeof dependency> =>
          dependency !== undefined && dependency.resourceType in EXECUTABLE_RESOURCE
      )
      .map((dependency) => dependency.uniqueId);
    const missingDependency = incomingExecutableIds.find(
      (dependencyId) => !selectedIdSet.has(dependencyId)
    );
    if (missingDependency !== undefined) {
      return reject(
        'dbt_project_dependency_gap',
        `Selected dbt resource ${nodeId} is missing executable dependency ${missingDependency}.`
      );
    }

    graphNodes.push({
      nodeId,
      stepKind: presentation.stepKind,
      dependsOn: [...new Set(incomingExecutableIds)].sort(compareGraphIds),
      metadata: {
        displayName: node.name,
        tags: { kind: presentation.kind, pluginId: 'dbt', role: presentation.role },
      },
    });
  }

  return {
    ok: true,
    value: {
      kind: 'generic-graph-v1',
      sourceFamily: 'dbt',
      sourceVersion: '1.0',
      nodes: graphNodes.sort((left, right) => compareGraphIds(left.nodeId, right.nodeId)),
    },
  };
}

export function sameGraphSource(
  actual: GenericGraphSourceV1,
  expected: GenericGraphSourceV1
): boolean {
  return (
    JSON.stringify(normalizeGraphSource(actual)) === JSON.stringify(normalizeGraphSource(expected))
  );
}

function normalizeGraphSource(graphSource: GenericGraphSourceV1): unknown {
  return {
    kind: graphSource.kind,
    sourceFamily: graphSource.sourceFamily,
    sourceVersion: graphSource.sourceVersion,
    nodes: graphSource.nodes
      .map((node) => ({
        nodeId: node.nodeId,
        stepKind: node.stepKind,
        dependsOn: [...node.dependsOn].sort(compareGraphIds),
        ...(node.stepTypeConfig === undefined ? {} : { stepTypeConfig: node.stepTypeConfig }),
        ...(node.metadata === undefined
          ? {}
          : {
              metadata: {
                ...(node.metadata.displayName === undefined
                  ? {}
                  : { displayName: node.metadata.displayName }),
                ...(node.metadata.sourceRef === undefined
                  ? {}
                  : { sourceRef: node.metadata.sourceRef }),
                ...(node.metadata.tags === undefined
                  ? {}
                  : {
                      tags: Object.fromEntries(
                        Object.entries(node.metadata.tags).sort(([left], [right]) =>
                          compareGraphIds(left, right)
                        )
                      ),
                    }),
              },
            }),
      }))
      .sort((left, right) => compareGraphIds(left.nodeId, right.nodeId)),
  };
}

export function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort(compareGraphIds);
  const sortedRight = [...right].sort(compareGraphIds);
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

export function reject(
  cause: string,
  reason: string
): {
  readonly ok: false;
  readonly rejection: ExecutableSubgraphSelectionRejection;
} {
  return {
    ok: false,
    rejection: { code: 'REJECTED', cause, reason },
  };
}
