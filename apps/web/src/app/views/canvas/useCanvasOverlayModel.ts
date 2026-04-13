import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  asIsoUtcString,
  asNonBlankString,
  type CanonicalRunStatus,
} from '@dvt/contracts';

import { buildNodeDecorations, buildOverlayContext } from './canvasOverlayContext';
import {
  mapRunToCanonical,
  getAllOverlays,
  type RuntimeCapabilities,
} from '../../plugins/registry';
import type { CanonicalNode, CanonicalRun } from '../../types/canonical';
import type { NodeCostData } from '../../plugins/contracts/PluginServices';
import type { Edge } from '@xyflow/react';

function buildRunStatusByNodeId(canonicalRun: CanonicalRun | null): ReadonlyMap<string, string> {
  const runStatusByNodeId = new Map<string, string>();

  if (!canonicalRun) {
    return runStatusByNodeId;
  }

  for (const task of canonicalRun.tasks) {
    runStatusByNodeId.set(task.nodeId, task.status);
  }

  return runStatusByNodeId;
}

function toCanonicalRunStatus(canonicalRun: CanonicalRun | null): CanonicalRunStatus | null {
  if (!canonicalRun) {
    return null;
  }

  const statusMap: Record<CanonicalRun['status'], CanonicalRunStatus['status']> = {
    pending: 'PENDING',
    running: 'RUNNING',
    completed: 'COMPLETED',
    failed: 'FAILED',
    cancelled: 'CANCELLED',
  };

  return {
    runId: asNonBlankString(canonicalRun.runId),
    status: statusMap[canonicalRun.status],
    startedAt: asIsoUtcString(canonicalRun.startedAt),
    ...(canonicalRun.finishedAt === undefined
      ? {}
      : { completedAt: asIsoUtcString(canonicalRun.finishedAt) }),
  };
}

type UseCanvasOverlayModelArgs = {
  canonicalNodes: CanonicalNode[];
  currentRun: unknown;
  capabilities: RuntimeCapabilities | undefined;
  edges: Edge[];
  selectedNodeIds: string[];
};

export function useCanvasOverlayModel({
  canonicalNodes,
  currentRun,
  capabilities,
  edges,
  selectedNodeIds,
}: UseCanvasOverlayModelArgs) {
  const activeCanonicalRun = useMemo(
    () => (currentRun ? mapRunToCanonical(currentRun, capabilities) : null),
    [capabilities, currentRun]
  );
  const activeRunStatus = useMemo(
    () => toCanonicalRunStatus(activeCanonicalRun),
    [activeCanonicalRun]
  );
  const activeRunId = activeCanonicalRun?.runId ?? null;
  const runStatusByNodeId = useMemo(
    () => buildRunStatusByNodeId(activeCanonicalRun),
    [activeCanonicalRun]
  );
  const costByNodeId = useMemo(() => {
    const nodeCosts = new Map<string, NodeCostData>();

    for (const node of canonicalNodes) {
      if (typeof node.lastCost !== 'number') {
        continue;
      }

      nodeCosts.set(node.id, {
        nodeId: node.id,
        cost: node.lastCost,
        currency: 'USD',
        breakdown:
          typeof node.lastDuration === 'number'
            ? { durationSeconds: node.lastDuration }
            : undefined,
      });
    }

    return nodeCosts;
  }, [canonicalNodes]);

  const [exclusiveOverlayMode, setExclusiveOverlayMode] = useState<'runtime' | 'cost'>('runtime');

  useEffect(() => {
    if (costByNodeId.size === 0 && exclusiveOverlayMode === 'cost') {
      setExclusiveOverlayMode('runtime');
    }
  }, [costByNodeId.size, exclusiveOverlayMode]);

  const overlayDecorations = useMemo(() => {
    const activeExclusiveOverlayId =
      exclusiveOverlayMode === 'runtime' && activeRunStatus == null ? null : exclusiveOverlayMode;
    const overlayCtx = buildOverlayContext(
      edges,
      selectedNodeIds,
      activeRunStatus,
      runStatusByNodeId,
      costByNodeId
    );
    return buildNodeDecorations(
      canonicalNodes,
      getAllOverlays(capabilities),
      activeExclusiveOverlayId,
      overlayCtx
    );
  }, [
    activeRunStatus,
    capabilities,
    canonicalNodes,
    costByNodeId,
    edges,
    exclusiveOverlayMode,
    runStatusByNodeId,
    selectedNodeIds,
  ]);

  const handleToggleCostOverlay = useCallback(() => {
    if (costByNodeId.size === 0) {
      return;
    }

    setExclusiveOverlayMode((current) => (current === 'cost' ? 'runtime' : 'cost'));
  }, [costByNodeId.size]);

  return {
    activeRunId,
    runStatusByNodeId,
    overlayDecorations,
    exclusiveOverlayMode,
    canUseCostOverlay: costByNodeId.size > 0,
    handleToggleCostOverlay,
  };
}
