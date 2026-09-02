/** Owned concern: translate edge-authoring gestures into governed connection proposals and confirmations. */

import { type Edge, type Node, type ReactFlowProps } from '@xyflow/react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { getPluginPortMap } from '../../plugins/registry';
import type { RuntimeCapabilities } from '../../plugins/registry';
import type { CanonicalNode } from '../../types/canonical';
import type {
  CanvasEdgeAuthoringContracts,
  CanvasEdgeAuthoringPolicy,
  CanvasEdgeAuthoringState,
} from './canvasGraphHandlerContracts';
import { canvasViewCopy, formatCanvasConnectionRejection } from './copy';
import {
  applyCanvasColumnMapping,
  automapCanvasColumns,
  removeCanvasColumnMapping,
  reorderCanvasColumnOutput,
  resolveCanvasColumnMappingTarget,
  setCanvasColumnOutputIncluded,
  type CanvasColumnMappingRejection,
} from './canvasColumnMappingAuthoring';
import {
  configureDbtModelColumnOrder,
  configureDbtModelColumnOutput,
} from './canvasDbtModelColumnCommand';
import { isReorderableCanvasSource, reorderCanvasSourceColumns } from './canvasSourceColumnOrder';
import type { GraphNodeColumnOutputToggleIdentity } from '../../plugins/graph/graphNodeColumnContracts';
import {
  createCanvasColumnHandleId,
  parseCanvasColumnHandleId,
  type CanvasColumnHandleIdentity,
  type CanvasColumnLineageEdgeData,
} from './canvasColumnLineageProjection';
import {
  useCanvasEdgeCommandRunner,
  type CanvasEdgeCommandRunner,
} from './useCanvasEdgeCommandRunner';

type UseCanvasEdgeAuthoringHandlersArgs = CanvasEdgeAuthoringContracts;

type UseCanvasEdgeAuthoringHandlersResult = {
  onConnect: NonNullable<ReactFlowProps<Node, Edge>['onConnect']>;
  onReconnect: NonNullable<ReactFlowProps<Node, Edge>['onReconnect']>;
  activeColumnHandleId: string | null;
  handleColumnPortActivate: (identity: CanvasColumnHandleIdentity) => void;
  handleAutomapCanvasColumns: (
    nodeId: string,
    columns: readonly Readonly<{ name: string; type: string }>[]
  ) => void;
  handleToggleCanvasColumnOutput: (identity: {
    nodeId: string;
    columnId: string;
    columnType: string;
    output: boolean;
  }) => void;
  handleReorderCanvasColumnOutput: (identity: {
    nodeId: string;
    columnId: string;
    targetColumnId: string;
    placement: 'before' | 'after';
  }) => void;
  handleRemoveColumnMapping: (mapping: CanvasColumnLineageEdgeData) => void;
};

type PendingConnection = Parameters<NonNullable<ReactFlowProps<Node, Edge>['onConnect']>>[0];

function resolveVisibleDraftPluginPortMap(args: {
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  runtimeCapabilities?: RuntimeCapabilities;
}) {
  const runtimePortMap = getPluginPortMap(args.runtimeCapabilities);
  const staticPortMap = getPluginPortMap();
  const resolvedPortMap = new Map(runtimePortMap);

  for (const node of args.canonicalNodesById.values()) {
    if (resolvedPortMap.has(node.pluginId)) {
      continue;
    }

    const visibleNodePortDescriptor = staticPortMap.get(node.pluginId);
    if (visibleNodePortDescriptor != null) {
      resolvedPortMap.set(node.pluginId, visibleNodePortDescriptor);
    }
  }

  return resolvedPortMap;
}

function notifyRejectedConnection(
  rejection: Parameters<typeof formatCanvasConnectionRejection>[0]
) {
  toast.error(formatCanvasConnectionRejection(rejection));
}

function formatColumnMappingRejection(reason: CanvasColumnMappingRejection): string {
  if (reason === 'source_not_connected') {
    return canvasViewCopy.columnMappingRequiresDependencyMessage;
  }
  if (reason === 'sql_authority_not_empty') {
    return canvasViewCopy.columnMappingSqlAuthorityMessage;
  }
  if (reason === 'complex_expression_not_editable') {
    return canvasViewCopy.columnMappingComplexExpressionMessage;
  }
  if (reason === 'no_compatible_mappings') {
    return canvasViewCopy.columnMappingNoCompatibleColumnsMessage;
  }
  return canvasViewCopy.columnMappingUnavailableMessage;
}

function resolveCurrentNode(
  state: CanvasEdgeAuthoringState,
  nodeId: string
): CanonicalNode | undefined {
  return state.draftSession.localNodeCatalog?.[nodeId] ?? state.canonicalNodesById.get(nodeId);
}

function useCanvasColumnMappingHandlers({ state, effects, policy }: CanvasEdgeAuthoringContracts) {
  const [pendingSource, setPendingSource] = useState<CanvasColumnHandleIdentity | null>(null);

  const tryColumnConnection = useCallback(
    (connection: PendingConnection): boolean => {
      const sourceHandle = parseCanvasColumnHandleId(connection.sourceHandle);
      const targetHandle = parseCanvasColumnHandleId(connection.targetHandle);
      if (sourceHandle == null && targetHandle == null) return false;
      if (
        !policy.canEditEdges ||
        sourceHandle?.direction !== 'source' ||
        targetHandle?.direction !== 'target' ||
        sourceHandle.nodeId !== connection.source ||
        targetHandle.nodeId !== connection.target
      ) {
        toast.error(
          policy.canEditEdges
            ? canvasViewCopy.columnMappingUnavailableMessage
            : canvasViewCopy.mutationUnavailableMessage
        );
        return true;
      }
      const targetNode = resolveCurrentNode(state, targetHandle.nodeId);
      const target =
        targetNode == null
          ? null
          : resolveCanvasColumnMappingTarget(targetNode, targetHandle.columnId);
      if (target == null) {
        toast.error(canvasViewCopy.columnMappingUnavailableMessage);
        return true;
      }
      const result = applyCanvasColumnMapping({
        draftSession: state.draftSession,
        canonicalNodesById: state.canonicalNodesById,
        source: { nodeId: sourceHandle.nodeId, columnName: sourceHandle.columnId },
        target,
      });
      if (result.outcome === 'rejected') {
        toast.error(formatColumnMappingRejection(result.reason));
        return true;
      }
      effects.setDraftSession(result.draftSession);
      setPendingSource(null);
      toast.success(canvasViewCopy.columnMappingAddedMessage);
      return true;
    },
    [effects, policy.canEditEdges, state]
  );

  const handleColumnPortActivate = useCallback(
    (identity: CanvasColumnHandleIdentity) => {
      if (identity.direction === 'source') {
        setPendingSource(identity);
        toast.info(
          canvasViewCopy.columnMappingSourceSelectedTemplate.replace('{column}', identity.columnId)
        );
        return;
      }
      if (pendingSource == null) {
        toast.error(canvasViewCopy.columnMappingUnavailableMessage);
        return;
      }
      tryColumnConnection({
        source: pendingSource.nodeId,
        sourceHandle: createCanvasColumnHandleId(pendingSource),
        target: identity.nodeId,
        targetHandle: createCanvasColumnHandleId(identity),
      });
    },
    [pendingSource, tryColumnConnection]
  );

  const handleAutomapCanvasColumns = useCallback(
    (nodeId: string, columns: readonly Readonly<{ name: string; type: string }>[]) => {
      if (!policy.canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }
      const result = automapCanvasColumns({
        draftSession: state.draftSession,
        canonicalNodesById: state.canonicalNodesById,
        targetNodeId: nodeId,
        targetColumns: columns,
      });
      if (result.outcome === 'rejected') {
        toast.error(formatColumnMappingRejection(result.reason));
        return;
      }
      effects.setDraftSession(result.draftSession);
      toast.success(
        canvasViewCopy.columnMappingAutomapSummaryTemplate.replace(
          '{count}',
          String(result.appliedCount)
        )
      );
    },
    [effects, policy.canEditEdges, state]
  );

  const handleToggleCanvasColumnOutput = useCallback(
    (identity: GraphNodeColumnOutputToggleIdentity) => {
      if (!policy.canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }
      const targetNode = resolveCurrentNode(state, identity.nodeId);
      const dbtTarget = targetNode?.pluginId === 'dbt' && targetNode.kind === 'dbt:model';
      if (dbtTarget) {
        const result = configureDbtModelColumnOutput({
          draftSession: state.draftSession,
          canonicalNodesById: state.canonicalNodesById,
          nodeId: identity.nodeId,
          columnName: identity.columnId,
          output: identity.output,
        });
        if (result.outcome === 'rejected') {
          toast.error(canvasViewCopy.columnMappingUnavailableMessage);
          return;
        }
        effects.setDraftSession(result.draftSession);
        return;
      }
      const result = setCanvasColumnOutputIncluded({
        draftSession: state.draftSession,
        canonicalNodesById: state.canonicalNodesById,
        targetNodeId: identity.nodeId,
        columnId: identity.columnId,
        columnType: identity.columnType,
        output: identity.output,
        placement: identity.placement,
      });
      if (result.outcome === 'rejected') {
        toast.error(formatColumnMappingRejection(result.reason));
        return;
      }
      effects.setDraftSession(result.draftSession);
    },
    [effects, policy.canEditEdges, state]
  );

  const handleReorderCanvasColumnOutput = useCallback(
    (identity: {
      nodeId: string;
      columnId: string;
      targetColumnId: string;
      placement: 'before' | 'after';
    }) => {
      if (!policy.canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }
      const targetNode = resolveCurrentNode(state, identity.nodeId);
      if (targetNode?.pluginId === 'dbt' && targetNode.kind === 'dbt:model') {
        const result = configureDbtModelColumnOrder({
          draftSession: state.draftSession,
          canonicalNodesById: state.canonicalNodesById,
          nodeId: identity.nodeId,
          columnName: identity.columnId,
          targetColumnName: identity.targetColumnId,
          placement: identity.placement,
        });
        if (result.outcome === 'rejected') {
          toast.error(canvasViewCopy.columnMappingUnavailableMessage);
          return;
        }
        effects.setDraftSession(result.draftSession);
        return;
      }
      if (isReorderableCanvasSource(targetNode)) {
        const result = reorderCanvasSourceColumns({
          draftSession: state.draftSession,
          canonicalNodesById: state.canonicalNodesById,
          nodeId: identity.nodeId,
          columnName: identity.columnId,
          targetColumnName: identity.targetColumnId,
          placement: identity.placement,
        });
        if (result.outcome === 'rejected') {
          toast.error(canvasViewCopy.columnMappingUnavailableMessage);
          return;
        }
        effects.setDraftSession(result.draftSession);
        return;
      }
      const result = reorderCanvasColumnOutput({
        draftSession: state.draftSession,
        canonicalNodesById: state.canonicalNodesById,
        targetNodeId: identity.nodeId,
        columnId: identity.columnId,
        targetColumnId: identity.targetColumnId,
        placement: identity.placement,
      });
      if (result.outcome === 'rejected') {
        toast.error(formatColumnMappingRejection(result.reason));
        return;
      }
      effects.setDraftSession(result.draftSession);
    },
    [effects, policy.canEditEdges, state]
  );

  const handleRemoveColumnMapping = useCallback(
    (mapping: CanvasColumnLineageEdgeData) => {
      if (!policy.canEditEdges || !mapping.removable) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }
      const targetNode = resolveCurrentNode(state, mapping.targetNodeId);
      if (targetNode == null) {
        toast.error(canvasViewCopy.columnMappingUnavailableMessage);
        return;
      }
      const dbtTarget = targetNode.pluginId === 'dbt' && targetNode.kind === 'dbt:model';
      if (dbtTarget) {
        const result = configureDbtModelColumnOutput({
          draftSession: state.draftSession,
          canonicalNodesById: state.canonicalNodesById,
          nodeId: targetNode.id,
          columnName: mapping.targetColumnName,
          output: false,
        });
        if (result.outcome === 'rejected') {
          toast.error(canvasViewCopy.columnMappingUnavailableMessage);
          return;
        }
        effects.setDraftSession(result.draftSession);
        toast.success(canvasViewCopy.columnMappingRemovedMessage);
        return;
      }
      const result = removeCanvasColumnMapping({
        draftSession: state.draftSession,
        canonicalNodesById: state.canonicalNodesById,
        targetNode,
        outputId: mapping.outputId,
        source: {
          nodeId: mapping.sourceNodeId,
          columnName: mapping.sourceColumnName,
        },
      });
      if (result.outcome === 'rejected') {
        toast.error(formatColumnMappingRejection(result.reason));
        return;
      }
      effects.setDraftSession(result.draftSession);
      toast.success(canvasViewCopy.columnMappingRemovedMessage);
    },
    [effects, policy.canEditEdges, state]
  );

  return {
    tryColumnConnection,
    activeColumnHandleId: pendingSource == null ? null : createCanvasColumnHandleId(pendingSource),
    handleColumnPortActivate,
    handleAutomapCanvasColumns,
    handleToggleCanvasColumnOutput,
    handleReorderCanvasColumnOutput,
    handleRemoveColumnMapping,
  };
}

function useCanvasConnectionCreationHandler({
  edgeCommandRunner,
  policy,
}: {
  edgeCommandRunner: CanvasEdgeCommandRunner;
  policy: CanvasEdgeAuthoringPolicy;
}) {
  const { canEditEdges } = policy;

  return useCallback<NonNullable<ReactFlowProps<Node, Edge>['onConnect']>>(
    (connection) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }

      edgeCommandRunner.createConnection({
        connection,
        onNoop: notifyRejectedConnection,
        onCreated: () => {
          toast.success(canvasViewCopy.dependencyAddedMessage);
        },
      });
    },
    [canEditEdges, edgeCommandRunner]
  );
}

function useCanvasEdgeReconnectHandler({
  edgeCommandRunner,
  policy,
}: {
  edgeCommandRunner: CanvasEdgeCommandRunner;
  policy: CanvasEdgeAuthoringPolicy;
}) {
  const { canEditEdges } = policy;

  return useCallback<NonNullable<ReactFlowProps<Node, Edge>['onReconnect']>>(
    (edge, connection) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }

      edgeCommandRunner.reconnectEdge({
        edge,
        connection,
        onNoop: notifyRejectedConnection,
      });
    },
    [canEditEdges, edgeCommandRunner]
  );
}

export function useCanvasEdgeAuthoringHandlers({
  state,
  effects,
  policy,
}: UseCanvasEdgeAuthoringHandlersArgs): UseCanvasEdgeAuthoringHandlersResult {
  const pluginPortMap = useMemo(
    () =>
      resolveVisibleDraftPluginPortMap({
        canonicalNodesById: state.canonicalNodesById,
        runtimeCapabilities: policy.runtimeCapabilities,
      }),
    [policy.runtimeCapabilities, state.canonicalNodesById]
  );
  const edgeCommandRunner = useCanvasEdgeCommandRunner({
    state,
    effects,
    pluginPortMap,
  });
  const columnMappingHandlers = useCanvasColumnMappingHandlers({ state, effects, policy });

  const createNodeConnection = useCanvasConnectionCreationHandler({
    edgeCommandRunner,
    policy,
  });
  const onConnect = useCallback<NonNullable<ReactFlowProps<Node, Edge>['onConnect']>>(
    (connection) => {
      if (!columnMappingHandlers.tryColumnConnection(connection)) {
        createNodeConnection(connection);
      }
    },
    [columnMappingHandlers.tryColumnConnection, createNodeConnection]
  );
  const onReconnect = useCanvasEdgeReconnectHandler({
    edgeCommandRunner,
    policy,
  });

  return {
    onConnect,
    onReconnect,
    activeColumnHandleId: columnMappingHandlers.activeColumnHandleId,
    handleColumnPortActivate: columnMappingHandlers.handleColumnPortActivate,
    handleAutomapCanvasColumns: columnMappingHandlers.handleAutomapCanvasColumns,
    handleToggleCanvasColumnOutput: columnMappingHandlers.handleToggleCanvasColumnOutput,
    handleReorderCanvasColumnOutput: columnMappingHandlers.handleReorderCanvasColumnOutput,
    handleRemoveColumnMapping: columnMappingHandlers.handleRemoveColumnMapping,
  };
}
