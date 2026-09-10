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
  removeCanvasColumnMapping,
} from './canvasColumnMappingAuthoring';
import { automapCanvasColumns } from './canvasColumnAutomap';
import type { CanvasColumnMappingRejection } from './canvasColumnMappingModel';

import { resolveCanvasColumnMappingTarget } from './canvasColumnProjectionAuthority';

import type {
  GraphNodeColumnOutputToggleIdentity,
  GraphNodeColumnReorderIdentity,
} from '../../plugins/graph/graphNodeColumnContracts';
import {
  createCanvasColumnHandleId,
  parseCanvasColumnHandleId,
  type CanvasColumnHandleIdentity,
  type CanvasColumnLineageEdgeData,
} from './canvasColumnLineageProjection';
import {
  useCanvasColumnOutputCommandRunner,
  type CanvasColumnOutputCommandRunner,
} from './useCanvasColumnOutputCommandRunner';
import {
  useCanvasEdgeCommandRunner,
  type CanvasEdgeCommandRunner,
} from './useCanvasEdgeCommandRunner';

type UseCanvasEdgeAuthoringHandlersArgs = CanvasEdgeAuthoringContracts;

type UseCanvasEdgeAuthoringHandlersResult = {
  onConnect: NonNullable<ReactFlowProps<Node, Edge>['onConnect']>;
  onReconnect: NonNullable<ReactFlowProps<Node, Edge>['onReconnect']>;
  setExecutionGate: CanvasEdgeCommandRunner['setExecutionGate'];
  activeColumnHandleId: string | null;
  handleColumnPortActivate: (identity: CanvasColumnHandleIdentity) => void;
  handleAutomapCanvasColumns: (
    nodeId: string,
    columns: readonly Readonly<{ name: string; type: string }>[]
  ) => void;
  handleToggleCanvasColumnOutput: (identity: GraphNodeColumnOutputToggleIdentity) => void;
  handleReorderCanvasColumnOutput: (identity: GraphNodeColumnReorderIdentity) => void;
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
  if (reason === 'complex_expression_not_editable') {
    return canvasViewCopy.columnMappingComplexExpressionMessage;
  }
  if (reason === 'no_compatible_mappings') {
    return canvasViewCopy.columnMappingNoCompatibleColumnsMessage;
  }
  if (reason === 'source_output_required') {
    return canvasViewCopy.sourceOutputRequiredMessage;
  }
  if (reason === 'source_output_last_field') {
    return canvasViewCopy.sourceOutputLastFieldMessage;
  }
  return canvasViewCopy.columnMappingUnavailableMessage;
}

function resolveCurrentNode(
  draftSession: CanvasEdgeAuthoringState['draftSession'],
  canonicalNodesById: CanvasEdgeAuthoringState['canonicalNodesById'],
  nodeId: string
): CanonicalNode | undefined {
  return draftSession.localNodeCatalog?.[nodeId] ?? canonicalNodesById.get(nodeId);
}

function useCanvasColumnMappingHandlers(
  { state, effects, policy }: CanvasEdgeAuthoringContracts,
  columnOutputCommandRunner: CanvasColumnOutputCommandRunner
) {
  const [pendingSource, setPendingSource] = useState<CanvasColumnHandleIdentity | null>(null);
  const { canonicalNodesById, draftSession } = state;
  const { setDraftSession } = effects;
  const { canEditEdges } = policy;

  const tryColumnConnection = useCallback(
    (connection: PendingConnection): boolean => {
      const sourceHandle = parseCanvasColumnHandleId(connection.sourceHandle);
      const targetHandle = parseCanvasColumnHandleId(connection.targetHandle);
      if (sourceHandle == null && targetHandle == null) return false;
      if (
        !canEditEdges ||
        sourceHandle?.direction !== 'source' ||
        targetHandle?.direction !== 'target' ||
        sourceHandle.nodeId !== connection.source ||
        targetHandle.nodeId !== connection.target
      ) {
        toast.error(
          canEditEdges
            ? canvasViewCopy.columnMappingUnavailableMessage
            : canvasViewCopy.mutationUnavailableMessage
        );
        return true;
      }
      const targetNode = resolveCurrentNode(draftSession, canonicalNodesById, targetHandle.nodeId);
      const target =
        targetNode == null
          ? null
          : resolveCanvasColumnMappingTarget(targetNode, targetHandle.columnId);
      if (target == null) {
        toast.error(canvasViewCopy.columnMappingUnavailableMessage);
        return true;
      }
      const result = applyCanvasColumnMapping({
        draftSession,
        canonicalNodesById,
        source: { nodeId: sourceHandle.nodeId, columnId: sourceHandle.columnId },
        target,
      });
      if (result.outcome === 'rejected') {
        toast.error(formatColumnMappingRejection(result.reason));
        return true;
      }
      setDraftSession(result.draftSession);
      setPendingSource(null);
      toast.success(canvasViewCopy.columnMappingAddedMessage);
      return true;
    },
    [canEditEdges, canonicalNodesById, draftSession, setDraftSession]
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
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }
      const result = automapCanvasColumns({
        draftSession,
        canonicalNodesById,
        targetNodeId: nodeId,
        targetColumns: columns,
      });
      if (result.outcome === 'rejected') {
        toast.error(formatColumnMappingRejection(result.reason));
        return;
      }
      setDraftSession(result.draftSession);
      toast.success(
        canvasViewCopy.columnMappingAutomapSummaryTemplate.replace(
          '{count}',
          String(result.appliedCount)
        )
      );
    },
    [canEditEdges, canonicalNodesById, draftSession, setDraftSession]
  );

  const handleToggleCanvasColumnOutput = useCallback(
    (identity: GraphNodeColumnOutputToggleIdentity) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }
      const result = columnOutputCommandRunner.toggleOutput(identity);
      if (result.outcome === 'rejected') {
        toast.error(formatColumnMappingRejection(result.reason));
      }
    },
    [canEditEdges, columnOutputCommandRunner]
  );

  const handleReorderCanvasColumnOutput = useCallback(
    (identity: GraphNodeColumnReorderIdentity) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }
      const result = columnOutputCommandRunner.reorderOutput(identity);
      if (result.outcome === 'rejected') {
        toast.error(formatColumnMappingRejection(result.reason));
      }
    },
    [canEditEdges, columnOutputCommandRunner]
  );
  const handleRemoveColumnMapping = useCallback(
    (mapping: CanvasColumnLineageEdgeData) => {
      if (!canEditEdges || !mapping.removable) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }
      const targetNode = resolveCurrentNode(draftSession, canonicalNodesById, mapping.targetNodeId);
      if (targetNode == null) {
        toast.error(canvasViewCopy.columnMappingUnavailableMessage);
        return;
      }
      const result = removeCanvasColumnMapping({
        draftSession,
        canonicalNodesById,
        targetNode,
        outputId: mapping.outputId,
        source: {
          nodeId: mapping.sourceNodeId,
          columnId: mapping.sourceFieldId,
        },
      });
      if (result.outcome === 'rejected') {
        toast.error(formatColumnMappingRejection(result.reason));
        return;
      }
      setDraftSession(result.draftSession);
      toast.success(canvasViewCopy.columnMappingRemovedMessage);
    },
    [canEditEdges, canonicalNodesById, draftSession, setDraftSession]
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
  const columnOutputCommandRunner = useCanvasColumnOutputCommandRunner({ state, effects });
  const columnMappingHandlers = useCanvasColumnMappingHandlers(
    { state, effects, policy },
    columnOutputCommandRunner
  );

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
    setExecutionGate: edgeCommandRunner.setExecutionGate,
    activeColumnHandleId: columnMappingHandlers.activeColumnHandleId,
    handleColumnPortActivate: columnMappingHandlers.handleColumnPortActivate,
    handleAutomapCanvasColumns: columnMappingHandlers.handleAutomapCanvasColumns,
    handleToggleCanvasColumnOutput: columnMappingHandlers.handleToggleCanvasColumnOutput,
    handleReorderCanvasColumnOutput: columnMappingHandlers.handleReorderCanvasColumnOutput,
    handleRemoveColumnMapping: columnMappingHandlers.handleRemoveColumnMapping,
  };
}
