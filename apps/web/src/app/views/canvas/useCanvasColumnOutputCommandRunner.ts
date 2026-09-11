/** Owned concern: serialize Canvas column-output commands over the latest draft session. */
import { useCallback, useMemo, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type {
  GraphNodeColumnOutputToggleIdentity,
  GraphNodeColumnReorderIdentity,
} from '../../plugins/graph/graphNodeColumnContracts';
import type { CanonicalNode } from '../../types/canonical';
import {
  reorderCanvasColumnOutput,
  setCanvasColumnOutputIncluded,
} from './canvasColumnOutputAuthoring';
import {
  resolveCanvasSessionNode,
  type CanvasColumnMappingResult,
} from './canvasColumnMappingModel';
import { isDbtCompatibleModel } from './canvasDbtAuthoringModel';
import {
  configureDbtModelColumnOrder,
  configureDbtModelColumnOutput,
} from './canvasDbtModelColumnCommand';
import type { CanvasDraftSession } from './canvasDraftSession';
import { reorderCanvasStructuredFieldChildren } from './canvasStructuredFieldAuthoring';

type CanvasColumnOutputCommandRunnerState = {
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  draftSession: CanvasDraftSession;
};

type CanvasColumnOutputCommandRunnerEffects = {
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
};

type UseCanvasColumnOutputCommandRunnerArgs = {
  state: CanvasColumnOutputCommandRunnerState;
  effects: CanvasColumnOutputCommandRunnerEffects;
};

export type CanvasColumnOutputCommandRunner = {
  toggleOutput: (identity: GraphNodeColumnOutputToggleIdentity) => CanvasColumnMappingResult;
  reorderOutput: (identity: GraphNodeColumnReorderIdentity) => CanvasColumnMappingResult;
};

function applyToggleOutput(
  draftSession: CanvasDraftSession,
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>,
  identity: GraphNodeColumnOutputToggleIdentity
): CanvasColumnMappingResult {
  const targetNode = resolveCanvasSessionNode(draftSession, canonicalNodesById, identity.nodeId);
  if (targetNode != null && isDbtCompatibleModel(targetNode)) {
    const result = configureDbtModelColumnOutput({
      draftSession,
      canonicalNodesById,
      nodeId: identity.nodeId,
      columnName: identity.columnId,
      output: identity.output,
    });
    return result.outcome === 'applied'
      ? result
      : { outcome: 'rejected', reason: 'invalid_transform_authority' };
  }

  return setCanvasColumnOutputIncluded({
    draftSession,
    canonicalNodesById,
    targetNodeId: identity.nodeId,
    columnId: identity.columnId,
    columnType: identity.columnType,
    output: identity.output,
    placement: identity.placement,
  });
}

function applyReorderOutput(
  draftSession: CanvasDraftSession,
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>,
  identity: GraphNodeColumnReorderIdentity
): CanvasColumnMappingResult {
  if (identity.parentColumnId != null) {
    const result = reorderCanvasStructuredFieldChildren({
      draftSession,
      canonicalNodesById,
      request: {
        nodeId: identity.nodeId,
        parentFieldId: identity.parentColumnId,
        fieldId: identity.columnId,
        targetFieldId: identity.targetColumnId,
        placement: identity.placement,
      },
    });
    return result.outcome === 'applied'
      ? result
      : { outcome: 'rejected', reason: 'mapping_not_found' };
  }

  const targetNode = resolveCanvasSessionNode(draftSession, canonicalNodesById, identity.nodeId);
  if (targetNode != null && isDbtCompatibleModel(targetNode)) {
    const result = configureDbtModelColumnOrder({
      draftSession,
      canonicalNodesById,
      nodeId: identity.nodeId,
      columnName: identity.columnId,
      targetColumnName: identity.targetColumnId,
      placement: identity.placement,
    });
    return result.outcome === 'applied'
      ? result
      : { outcome: 'rejected', reason: 'invalid_transform_authority' };
  }

  return reorderCanvasColumnOutput({
    draftSession,
    canonicalNodesById,
    targetNodeId: identity.nodeId,
    columnId: identity.columnId,
    targetColumnId: identity.targetColumnId,
    placement: identity.placement,
  });
}

export function useCanvasColumnOutputCommandRunner({
  state,
  effects,
}: UseCanvasColumnOutputCommandRunnerArgs): CanvasColumnOutputCommandRunner {
  const { canonicalNodesById, draftSession } = state;
  const { setDraftSession } = effects;
  const latestDraftSessionRef = useRef(draftSession);
  latestDraftSessionRef.current = draftSession;

  const runCommand = useCallback(
    (
      command: (currentDraftSession: CanvasDraftSession) => CanvasColumnMappingResult
    ): CanvasColumnMappingResult => {
      const baselineDraftSession = latestDraftSessionRef.current;
      const result = command(baselineDraftSession);
      if (result.outcome === 'rejected') {
        return result;
      }

      latestDraftSessionRef.current = result.draftSession;
      setDraftSession((currentDraftSession) => {
        const applied =
          currentDraftSession === baselineDraftSession ? result : command(currentDraftSession);
        const nextDraftSession =
          applied.outcome === 'applied' ? applied.draftSession : currentDraftSession;
        latestDraftSessionRef.current = nextDraftSession;
        return nextDraftSession;
      });
      return result;
    },
    [setDraftSession]
  );

  const toggleOutput = useCallback(
    (identity: GraphNodeColumnOutputToggleIdentity) =>
      runCommand((currentDraftSession) =>
        applyToggleOutput(currentDraftSession, canonicalNodesById, identity)
      ),
    [canonicalNodesById, runCommand]
  );

  const reorderOutput = useCallback(
    (identity: GraphNodeColumnReorderIdentity) =>
      runCommand((currentDraftSession) =>
        applyReorderOutput(currentDraftSession, canonicalNodesById, identity)
      ),
    [canonicalNodesById, runCommand]
  );

  return useMemo(() => ({ toggleOutput, reorderOutput }), [reorderOutput, toggleOutput]);
}
