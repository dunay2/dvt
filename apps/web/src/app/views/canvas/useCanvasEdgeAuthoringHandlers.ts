/** Owned concern: translate edge-authoring gestures into governed connection proposals and confirmations. */

import { type Edge, type Node, type ReactFlowProps } from '@xyflow/react';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import { getPluginPortMap } from '../../plugins/registry';
import type { RuntimeCapabilities } from '../../plugins/registry';
import type { CanonicalNode } from '../../types/canonical';
import type {
  CanvasEdgeAuthoringContracts,
  CanvasEdgeAuthoringPolicy,
} from './canvasGraphHandlerContracts';
import { canvasViewCopy, formatCanvasConnectionRejection } from './copy';
import type {
  GraphNodeColumnOutputToggleIdentity,
  GraphNodeColumnReorderIdentity,
} from '../../plugins/graph/graphNodeColumnContracts';
import {
  type CanvasColumnHandleIdentity,
  type CanvasColumnLineageEdgeData,
} from './canvasColumnLineageProjection';
import type { CanvasColumnAuthoringCommandRunner } from './useCanvasColumnAuthoringCommandRunner';
import { useCanvasColumnConnectionHandlers } from './useCanvasColumnConnectionHandlers';
import type { CanvasRelationalPredicateSeed } from './canvasRelationalPredicateSeed';
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
  relationalPredicateSeed: CanvasRelationalPredicateSeed | null;
  clearRelationalPredicateSeed: () => void;
};

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

      void edgeCommandRunner
        .createConnection({
          connection,
          onNoop: notifyRejectedConnection,
          onCreated: () => {
            toast.success(canvasViewCopy.dependencyAddedMessage);
          },
        })
        .catch(() => toast.error(canvasViewCopy.dependencyCreationFailedMessage));
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

export function useCanvasEdgeAuthoringHandlers(
  { state, effects, policy }: UseCanvasEdgeAuthoringHandlersArgs,
  columnAuthoringCommandRunner: CanvasColumnAuthoringCommandRunner
): UseCanvasEdgeAuthoringHandlersResult {
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
    canEditEdges: policy.canEditEdges,
  });
  const columnMappingHandlers = useCanvasColumnConnectionHandlers(
    { state, effects, policy },
    columnAuthoringCommandRunner
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
    relationalPredicateSeed: columnMappingHandlers.relationalPredicateSeed,
    clearRelationalPredicateSeed: columnMappingHandlers.clearRelationalPredicateSeed,
  };
}
