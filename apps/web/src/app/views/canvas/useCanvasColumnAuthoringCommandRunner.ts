/** Owned concern: serialize Canvas column-authoring commands over the latest draft session. */
import { useCallback, useMemo } from 'react';

import type {
  GraphNodeCalculatedColumnIdentity,
  GraphNodeColumnFunctionApplyIdentity,
  GraphNodeColumnFunctionApplyResult,
  GraphNodeColumnOutputToggleIdentity,
  GraphNodeColumnReorderIdentity,
  GraphNodeStructuredFieldIdentity,
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
import { applyCanvasCalculatedColumn } from './canvasCalculatedColumnAuthoring';
import { applyCanvasColumnFunction } from './canvasColumnFunctionAuthoring';
import type { CanvasDraftSession } from './canvasDraftSession';
import type { CanvasDraftSessionCommandRunner } from './useCanvasWorkspaceDraftSession';
import {
  applyCanvasStructuredField,
  reorderCanvasStructuredFieldChildren,
} from './canvasStructuredFieldAuthoring';

type CanvasColumnAuthoringCommandRunnerState = {
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  draftSession: CanvasDraftSession;
};

type CanvasColumnAuthoringCommandRunnerEffects = {
  runDraftSessionCommand: CanvasDraftSessionCommandRunner;
};

type UseCanvasColumnAuthoringCommandRunnerArgs = {
  state: CanvasColumnAuthoringCommandRunnerState;
  effects: CanvasColumnAuthoringCommandRunnerEffects;
};

export type CanvasColumnAuthoringCommandRunner = {
  toggleOutput: (identity: GraphNodeColumnOutputToggleIdentity) => CanvasColumnMappingResult;
  reorderOutput: (identity: GraphNodeColumnReorderIdentity) => CanvasColumnMappingResult;
  applyFunction: (
    identity: GraphNodeColumnFunctionApplyIdentity
  ) => GraphNodeColumnFunctionApplyResult;
  addCalculated: (
    identity: GraphNodeCalculatedColumnIdentity
  ) => GraphNodeColumnFunctionApplyResult;
  applyStructured: (
    identity: GraphNodeStructuredFieldIdentity
  ) => GraphNodeColumnFunctionApplyResult;
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

export function useCanvasColumnAuthoringCommandRunner({
  state,
  effects,
}: UseCanvasColumnAuthoringCommandRunnerArgs): CanvasColumnAuthoringCommandRunner {
  const { canonicalNodesById } = state;
  const { runDraftSessionCommand } = effects;
  const toggleOutput = useCallback(
    (identity: GraphNodeColumnOutputToggleIdentity) =>
      runDraftSessionCommand((currentDraftSession) =>
        applyToggleOutput(currentDraftSession, canonicalNodesById, identity)
      ),
    [canonicalNodesById, runDraftSessionCommand]
  );

  const reorderOutput = useCallback(
    (identity: GraphNodeColumnReorderIdentity) =>
      runDraftSessionCommand((currentDraftSession) =>
        applyReorderOutput(currentDraftSession, canonicalNodesById, identity)
      ),
    [canonicalNodesById, runDraftSessionCommand]
  );

  const applyFunction = useCallback(
    (identity: GraphNodeColumnFunctionApplyIdentity): GraphNodeColumnFunctionApplyResult => {
      const result = runDraftSessionCommand((currentDraftSession) =>
        applyCanvasColumnFunction({
          draftSession: currentDraftSession,
          canonicalNodesById,
          identity,
        })
      );
      return result.outcome === 'applied'
        ? { outcome: 'applied', createdFieldId: result.createdFieldId }
        : result;
    },
    [canonicalNodesById, runDraftSessionCommand]
  );

  const addCalculated = useCallback(
    (identity: GraphNodeCalculatedColumnIdentity): GraphNodeColumnFunctionApplyResult => {
      const result = runDraftSessionCommand((currentDraftSession) =>
        applyCanvasCalculatedColumn({
          draftSession: currentDraftSession,
          canonicalNodesById,
          request: identity,
        })
      );
      return result.outcome === 'applied'
        ? { outcome: 'applied', createdFieldId: result.createdFieldId }
        : result;
    },
    [canonicalNodesById, runDraftSessionCommand]
  );

  const applyStructured = useCallback(
    (identity: GraphNodeStructuredFieldIdentity): GraphNodeColumnFunctionApplyResult => {
      const result = runDraftSessionCommand((currentDraftSession) =>
        applyCanvasStructuredField({
          draftSession: currentDraftSession,
          canonicalNodesById,
          request: identity,
        })
      );
      return result.outcome === 'applied'
        ? { outcome: 'applied', createdFieldId: result.createdFieldId }
        : result;
    },
    [canonicalNodesById, runDraftSessionCommand]
  );

  return useMemo(
    () => ({
      toggleOutput,
      reorderOutput,
      applyFunction,
      addCalculated,
      applyStructured,
    }),
    [addCalculated, applyFunction, applyStructured, reorderOutput, toggleOutput]
  );
}
