/** Owned concern: classify DBT selection recovery state and execute pure recovery decisions. */
import type { GenericGraphSourceV1 } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createCanvasExecutionSelectionIntent,
  type CanvasExecutionSelectionIntent,
} from '../../types/canvasExecutionSelection';
import type {
  CanvasExecutionSelectionRecoveryReadModel,
  CanvasExecutionSelectionRecoveryReceipt,
  CanvasExecutionSelectionRecoveryStrategy,
} from '../../types/canvasExecutionSelectionRecovery';
import type { PlanViewModel } from '../../types/plans';
import { buildDbtExecutionScopeGraph, resolveDbtExecutionScope } from './dbtExecutionScopePolicy';

type CanvasExecutionSelectionRecoveryGraph = Readonly<{
  executableNodeIds: readonly string[];
  dependencyIdsByNodeId: ReadonlyMap<string, readonly string[]>;
}>;

export function buildCanvasExecutionSelectionRecoveryGraph(
  args: Readonly<{
    canonicalNodes: readonly Pick<CanonicalNode, 'id' | 'pluginId' | 'kind' | 'metadata'>[];
    canonicalEdges: readonly Pick<CanonicalEdge, 'sourceId' | 'targetId'>[];
    workspaceNodeIds: readonly string[];
    plannerGraphSource: GenericGraphSourceV1 | null;
  }>
): CanvasExecutionSelectionRecoveryGraph {
  if (args.plannerGraphSource != null) {
    const workspaceNodeIdSet = new Set(args.workspaceNodeIds);
    return {
      executableNodeIds: args.plannerGraphSource.nodes
        .map((node) => node.nodeId)
        .filter((nodeId) => workspaceNodeIdSet.has(nodeId)),
      dependencyIdsByNodeId: new Map(
        args.plannerGraphSource.nodes.map((node) => [
          node.nodeId,
          [...new Set(node.dependsOn)].sort(),
        ])
      ),
    };
  }

  return buildDbtExecutionScopeGraph({
    nodes: args.canonicalNodes,
    edges: args.canonicalEdges,
    workspaceNodeIds: args.workspaceNodeIds,
  });
}

export function resolveCanvasExecutionSelectionLastPreviewRevision(
  currentPlan: Pick<PlanViewModel, 'preview'> | null
): string | null {
  const provenance = currentPlan?.preview?.provenance;
  return provenance?.kind === 'dbt-project-files'
    ? provenance.analysisSha256
    : (currentPlan?.preview?.persisted?.canonicalPlanSha256 ?? null);
}

type BuildCanvasExecutionSelectionRecoveryReadModelArgs = Readonly<{
  selectionIntent: CanvasExecutionSelectionIntent;
  workspaceNodeIds: readonly string[];
  executableNodeIds: readonly string[];
  dependencyIdsByNodeId: ReadonlyMap<string, readonly string[]>;
  lastPreviewRevision: string | null;
  canRefreshAnalysis: boolean;
}>;

export function buildCanvasExecutionSelectionRecoveryReadModel({
  canRefreshAnalysis,
  dependencyIdsByNodeId,
  executableNodeIds,
  lastPreviewRevision,
  selectionIntent,
  workspaceNodeIds,
}: BuildCanvasExecutionSelectionRecoveryReadModelArgs): CanvasExecutionSelectionRecoveryReadModel {
  const requestedNodeIds = [...new Set(selectionIntent.nodeIds)];
  const workspaceNodeIdSet = new Set(workspaceNodeIds);
  const scopedExecutableNodeIds = [...new Set(executableNodeIds)].filter((nodeId) =>
    workspaceNodeIdSet.has(nodeId)
  );
  const executableNodeIdSet = new Set(scopedExecutableNodeIds);
  const unavailableRootNodeIds =
    selectionIntent.mode === 'explicit'
      ? requestedNodeIds.filter((nodeId) => !workspaceNodeIdSet.has(nodeId))
      : [];
  const nonExecutableRootNodeIds =
    selectionIntent.mode === 'explicit'
      ? requestedNodeIds.filter(
          (nodeId) => workspaceNodeIdSet.has(nodeId) && !executableNodeIdSet.has(nodeId)
        )
      : [];
  const resolution = resolveDbtExecutionScope({
    selectionIntent,
    workspaceNodeIds,
    executableNodeIds: scopedExecutableNodeIds,
    dependencyIdsByNodeId,
  });

  return {
    queryRail: 'CollectCanvasExecutionSelection',
    commandRail: 'RecoverCanvasExecutionSelection',
    status: resolution.ok ? 'ready' : 'blocked',
    selectionMode: selectionIntent.mode,
    requestedRootNodeIds: resolution.ok ? resolution.requestedRootNodeIds : requestedNodeIds,
    unavailableRootNodeIds,
    nonExecutableRootNodeIds,
    derivedDependencyNodeIds: resolution.ok ? resolution.derivedDependencyNodeIds : [],
    admittedScopeNodeIds: resolution.ok ? resolution.nodeIds : [],
    lastPreviewRevision,
    canDiscardUnavailable: unavailableRootNodeIds.length > 0,
    canUseWorkspaceScope: selectionIntent.mode === 'explicit' && scopedExecutableNodeIds.length > 0,
    canRefreshAnalysis,
    pendingStrategy: null,
    receipt: null,
    failure: null,
  };
}

export function recoverCanvasExecutionSelection(
  args: Readonly<{
    strategy: CanvasExecutionSelectionRecoveryStrategy;
    selectionIntent: CanvasExecutionSelectionIntent;
    unavailableRootNodeIds: readonly string[];
  }>
): Readonly<{
  nextSelectionIntent: CanvasExecutionSelectionIntent;
  receipt: CanvasExecutionSelectionRecoveryReceipt;
}> {
  const requestedNodeIds = [...new Set(args.selectionIntent.nodeIds)];

  if (args.strategy === 'use_workspace_scope') {
    return {
      nextSelectionIntent: createCanvasExecutionSelectionIntent([], 'workspace'),
      receipt: {
        rail: 'RecoverCanvasExecutionSelection',
        strategy: args.strategy,
        affectedNodeIds: requestedNodeIds,
        retainedNodeIds: [],
        resultingMode: 'workspace',
      },
    };
  }

  if (args.strategy === 'refresh_analysis') {
    return {
      nextSelectionIntent: createCanvasExecutionSelectionIntent(
        requestedNodeIds,
        args.selectionIntent.mode
      ),
      receipt: {
        rail: 'RecoverCanvasExecutionSelection',
        strategy: args.strategy,
        affectedNodeIds: [],
        retainedNodeIds: requestedNodeIds,
        resultingMode: args.selectionIntent.mode,
      },
    };
  }

  const unavailableRootNodeIdSet = new Set(args.unavailableRootNodeIds);
  const retainedNodeIds = requestedNodeIds.filter(
    (nodeId) => !unavailableRootNodeIdSet.has(nodeId)
  );

  return {
    nextSelectionIntent: createCanvasExecutionSelectionIntent(retainedNodeIds, 'explicit'),
    receipt: {
      rail: 'RecoverCanvasExecutionSelection',
      strategy: args.strategy,
      affectedNodeIds: requestedNodeIds.filter((nodeId) => unavailableRootNodeIdSet.has(nodeId)),
      retainedNodeIds,
      resultingMode: 'explicit',
    },
  };
}
