import { useCallback, useEffect, useMemo, useState } from 'react';
import { asIsoUtcString, asNonBlankString, type CanonicalRunStatus } from '@dvt/contracts';

import { buildNodeDecorations, buildOverlayContext } from './canvasOverlayContext';
import {
  mapRunToCanonical,
  getAllOverlays,
  type RuntimeCapabilities,
} from '../../plugins/registry';
import type { CanonicalNode, CanonicalRun } from '../../types/canonical';
import type { NodeCostData } from '../../plugins/contracts/NodeCostData';
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
  impactOverlayEnabled: boolean;
};

export function useCanvasOverlayModel({
  canonicalNodes,
  currentRun,
  capabilities,
  edges,
  selectedNodeIds,
  impactOverlayEnabled,
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
  const costByNodeId = useMemo<ReadonlyMap<string, NodeCostData>>(
    () => new Map<string, NodeCostData>(),
    []
  );

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
      costByNodeId,
      impactOverlayEnabled
    );
    const activeOverlays = getAllOverlays(capabilities).filter(
      (overlay) => impactOverlayEnabled || overlay.id !== 'impact'
    );
    return buildNodeDecorations(
      canonicalNodes,
      activeOverlays,
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
    impactOverlayEnabled,
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
