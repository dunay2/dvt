/** Owned concern: project authored dbt canvas state into planner-generic-v1 graph source. */
import type { ExecutionSelection, GenericGraphSourceV1, GenericGraphNodeV1 } from '@dvt/contracts';
import {
  OBJECT_FILE_POSTGRES_DBT_BRIDGE_CUSTOM_KEY,
  parseExecutionSelection,
} from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  buildDbtExecutionScopeGraph,
  resolveDbtExecutableStepKind,
  resolveDbtExecutionScope,
} from './dbtExecutionScopePolicy';
import { createDbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';
import {
  isObjectFilePostgresNode,
  projectObjectFilePostgresStepTypeConfig,
  type ObjectFilePostgresExecutionScope,
} from './objectFilePostgresAuthoringModel';
import type { CanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';

export type DbtPlannerGraphSourceResult =
  | Readonly<{
      ok: true;
      graphSource: GenericGraphSourceV1;
      selection: ExecutionSelection;
    }>
  | Readonly<{
      ok: false;
      message: string;
    }>;

function resolveScopedNodeIds(
  nodes: readonly CanonicalNode[],
  scopedNodeIds: readonly string[]
): Set<string> {
  return scopedNodeIds.length > 0 ? new Set(scopedNodeIds) : new Set(nodes.map((node) => node.id));
}

export function resolveDbtExecutionScopeNodeIds(args: {
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  selectionIntent: CanvasExecutionSelectionIntent;
  workspaceNodeIds: readonly string[];
}) {
  const { executableNodeIds, dependencyIdsByNodeId } = buildDbtExecutionScopeGraph({
    nodes: args.nodes,
    edges: args.edges,
    workspaceNodeIds: args.workspaceNodeIds,
  });

  return resolveDbtExecutionScope({
    selectionIntent: args.selectionIntent,
    workspaceNodeIds: args.workspaceNodeIds,
    executableNodeIds,
    dependencyIdsByNodeId,
  });
}

function resolveExecutableDbtNodes(args: {
  nodes: readonly CanonicalNode[];
  scopedNodeIds: readonly string[];
}): CanonicalNode[] {
  const scopedNodeIdSet = resolveScopedNodeIds(args.nodes, args.scopedNodeIds);
  return args.nodes.filter(
    (node) => scopedNodeIdSet.has(node.id) && resolveDbtExecutableStepKind(node) !== null
  );
}

function resolveExecutableDependencies(args: {
  node: CanonicalNode;
  edges: readonly CanonicalEdge[];
  executableNodeIdSet: ReadonlySet<string>;
}): string[] {
  return args.edges
    .filter(
      (edge) =>
        edge.targetId === args.node.id &&
        args.executableNodeIdSet.has(edge.sourceId) &&
        args.executableNodeIdSet.has(edge.targetId)
    )
    .map((edge) => edge.sourceId)
    .sort();
}

type GenericGraphNodeProjection =
  Readonly<{ ok: true; node: GenericGraphNodeV1 }> | Readonly<{ ok: false; message: string }>;

function buildGenericGraphNode(args: {
  node: CanonicalNode;
  edges: readonly CanonicalEdge[];
  executableNodeIdSet: ReadonlySet<string>;
  executionScope: ObjectFilePostgresExecutionScope | undefined;
  usesObjectFilePostgresStaging: boolean;
}): GenericGraphNodeProjection {
  const stepKind = resolveDbtExecutableStepKind(args.node);
  if (stepKind == null) {
    return { ok: false, message: `Node ${args.node.id} is not executable.` };
  }

  const objectFileProjection = isObjectFilePostgresNode(args.node)
    ? projectObjectFilePostgresStepTypeConfig({
        node: args.node,
        executionScope: args.executionScope,
      })
    : null;
  if (objectFileProjection?.ok === false) {
    return objectFileProjection;
  }

  const nodeMetadata = isObjectFilePostgresNode(args.node)
    ? null
    : createDbtNodeAuthoringMetadata(args.node);
  return {
    ok: true,
    node: {
      nodeId: args.node.id,
      stepKind,
      dependsOn: resolveExecutableDependencies(args),
      ...(objectFileProjection?.ok === true
        ? { stepTypeConfig: objectFileProjection.stepTypeConfig }
        : args.usesObjectFilePostgresStaging
          ? {
              stepTypeConfig: {
                custom: {
                  [OBJECT_FILE_POSTGRES_DBT_BRIDGE_CUSTOM_KEY]: { version: 'v1' },
                },
              },
            }
          : {}),
      metadata: {
        displayName: args.node.name,
        ...(nodeMetadata?.selectedSourceId
          ? {
              sourceRef: nodeMetadata.selectedSourceId,
            }
          : {}),
        tags: {
          kind: args.node.kind,
          pluginId: args.node.pluginId,
          role: args.node.role,
        },
      },
    },
  };
}

export function buildDbtPlannerGraphSource(args: {
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  scopedNodeIds: readonly string[];
  executionScope?: ObjectFilePostgresExecutionScope;
}): DbtPlannerGraphSourceResult {
  const executableNodes = resolveExecutableDbtNodes({
    nodes: args.nodes,
    scopedNodeIds: args.scopedNodeIds,
  });

  if (executableNodes.length === 0) {
    return {
      ok: false,
      message: 'DBT plan requires at least one model, test, or snapshot node.',
    };
  }

  const executableNodeIdSet = new Set(executableNodes.map((node) => node.id));
  const usesObjectFilePostgresStaging = executableNodes.some(isObjectFilePostgresNode);
  const graphNodeProjections = executableNodes.map((node) =>
    buildGenericGraphNode({
      node,
      edges: args.edges,
      executableNodeIdSet,
      executionScope: args.executionScope,
      usesObjectFilePostgresStaging,
    })
  );
  const rejectedProjection = graphNodeProjections.find((projection) => !projection.ok);
  if (rejectedProjection?.ok === false) {
    return rejectedProjection;
  }
  const graphNodes = graphNodeProjections.flatMap((projection) =>
    projection.ok ? [projection.node] : []
  );
  const selection = parseExecutionSelection({
    mode: 'explicit',
    nodeIds: graphNodes.map((node) => node.nodeId),
  });
  const graphSource: GenericGraphSourceV1 = {
    kind: 'generic-graph-v1',
    sourceFamily: 'dbt',
    sourceVersion: '1.0',
    nodes: graphNodes,
  };

  return {
    ok: true,
    graphSource,
    selection,
  };
}
