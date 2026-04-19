import { useCallback } from 'react';
import { toast } from 'sonner';

import {
  CANONICAL_NODE_DRAG_MIME_TYPE,
  type CanonicalNode,
  type CanonicalNodeStatus,
  type CoreNodeRole,
  type PluginNodeKind,
} from '../../types/canonical';
import { dropCanonicalNode } from './canvasGraphAggregate';
import { admitExplicitCanvasNode } from './canvasInteractionCommands';
import { canvasViewCopy } from './copy';
import type { UseCanvasGraphHandlersParams, UseCanvasGraphHandlersResult } from './useCanvasGraphHandlers.types';

const CANONICAL_NODE_ROLES: ReadonlySet<CoreNodeRole> = new Set([
  'input',
  'transform',
  'check',
  'output',
  'control',
]);

const CANONICAL_NODE_STATUSES: ReadonlySet<CanonicalNodeStatus> = new Set([
  'idle',
  'running',
  'success',
  'failed',
  'skipped',
  'warn',
]);

function parseCanonicalDropPayload(dataTransfer: DataTransfer): CanonicalNode | null {
  const payload = dataTransfer.getData(CANONICAL_NODE_DRAG_MIME_TYPE);
  if (!payload) {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as Partial<CanonicalNode>;
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.name !== 'string' ||
      typeof parsed.pluginId !== 'string' ||
      typeof parsed.kind !== 'string' ||
      typeof parsed.role !== 'string' ||
      typeof parsed.status !== 'string'
    ) {
      return null;
    }

    if (
      !CANONICAL_NODE_ROLES.has(parsed.role as CoreNodeRole) ||
      !CANONICAL_NODE_STATUSES.has(parsed.status as CanonicalNodeStatus)
    ) {
      return null;
    }

    return {
      id: parsed.id,
      name: parsed.name,
      pluginId: parsed.pluginId,
      kind: parsed.kind as PluginNodeKind,
      role: parsed.role as CoreNodeRole,
      status: parsed.status as CanonicalNodeStatus,
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((tag): tag is string => typeof tag === 'string')
        : [],
      path: typeof parsed.path === 'string' ? parsed.path : undefined,
      description: typeof parsed.description === 'string' ? parsed.description : undefined,
      lastDuration: typeof parsed.lastDuration === 'number' ? parsed.lastDuration : undefined,
      lastCost: typeof parsed.lastCost === 'number' ? parsed.lastCost : undefined,
      metadata:
        parsed.metadata && typeof parsed.metadata === 'object'
          ? (parsed.metadata as Record<string, unknown>)
          : undefined,
    };
  } catch {
    return null;
  }
}

type UseCanvasNodeDropHandlersArgs = Pick<
  UseCanvasGraphHandlersParams,
  | 'graphStrategy'
  | 'canEditEdges'
  | 'columnLevelLineageEnabled'
  | 'setNodes'
  | 'setDraftSession'
>;

type UseCanvasNodeDropHandlersResult = Pick<
  UseCanvasGraphHandlersResult,
  'handleDrop' | 'handleDragOver'
>;

export function useCanvasNodeDropHandlers({
  graphStrategy,
  canEditEdges,
  columnLevelLineageEnabled,
  setNodes,
  setDraftSession,
}: UseCanvasNodeDropHandlersArgs): UseCanvasNodeDropHandlersResult {
  const handleDrop = useCallback<React.DragEventHandler<HTMLDivElement>>(
    (event) => {
      event.preventDefault();
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }

      const canonicalNode =
        parseCanonicalDropPayload(event.dataTransfer) ??
        graphStrategy.parseDropPayload(event.dataTransfer);
      if (!canonicalNode) {
        return;
      }

      const reactFlowBounds = (event.target as HTMLElement).getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 40,
      };

      setNodes((existingNodes) => {
        const dropResult = dropCanonicalNode({
          canonicalNode,
          position,
          nodes: existingNodes,
          graphStrategy,
          columnLevelLineageEnabled,
        });

        if (dropResult.outcome === 'noop') {
          toast.info(dropResult.reason);
          return existingNodes;
        }

        if (dropResult.outcome === 'rejected') {
          toast.error(dropResult.reason);
          return existingNodes;
        }

        setDraftSession((currentSession) =>
          admitExplicitCanvasNode(currentSession, canonicalNode.id)
        );
        toast.success(`Added ${canonicalNode.name} to canvas`);
        return dropResult.nextNodes;
      });
    },
    [
      canEditEdges,
      columnLevelLineageEnabled,
      graphStrategy,
      setDraftSession,
      setNodes,
    ]
  );

  const handleDragOver = useCallback<React.DragEventHandler<HTMLDivElement>>((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return {
    handleDrop,
    handleDragOver,
  };
}
