/** Owned concern: serialize Canvas column-authoring commands over the latest draft session. */
import { useCallback, useMemo } from 'react';

import type {
  GraphNodeCalculatedColumnIdentity,
  GraphNodeInputMapping,
  GraphNodeColumnFunctionApplyIdentity,
  GraphNodeColumnFunctionApplyResult,
  GraphNodeColumnOutputToggleIdentity,
  GraphNodeColumnReorderIdentity,
  GraphNodeStructuredFieldIdentity,
} from '../../plugins/graph/graphNodeColumnContracts';
import type { CanonicalNode } from '../../types/canonical';
import { applyToggleOutput, applyReorderOutput } from './canvasColumnOutputCommandAdapter';
import type { CanvasColumnMappingResult } from './canvasColumnMappingModel';
import { applyCanvasCalculatedColumn } from './canvasCalculatedColumnAuthoring';
import { applyCanvasColumnFunction } from './canvasColumnFunctionAuthoring';
import type { CanvasDraftSession } from './canvasDraftSession';
import type { CanvasDraftSessionCommandRunner } from './useCanvasWorkspaceDraftSession';
import { useCanvasRelationOutputCommand } from './useCanvasRelationOutputCommand';
import { useCanvasColumnDraftCommand } from './useCanvasColumnDraftCommand';
import { bindCanvasInputField, removeCanvasInputField } from './canvasInputBindingAuthoring';
import { applyCanvasStructuredField } from './canvasStructuredFieldAuthoring';

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
  mapInput: (identity: GraphNodeInputMapping) => Promise<CanvasColumnMappingResult>;
  removeInput: (identity: GraphNodeInputMapping) => Promise<CanvasColumnMappingResult>;
  toggleOutput: (
    identity: GraphNodeColumnOutputToggleIdentity
  ) => Promise<CanvasColumnMappingResult>;
  reorderOutput: (identity: GraphNodeColumnReorderIdentity) => Promise<CanvasColumnMappingResult>;
  applyFunction: (
    identity: GraphNodeColumnFunctionApplyIdentity
  ) => Promise<GraphNodeColumnFunctionApplyResult>;
  addCalculated: (
    identity: GraphNodeCalculatedColumnIdentity
  ) => Promise<GraphNodeColumnFunctionApplyResult>;
  applyStructured: (
    identity: GraphNodeStructuredFieldIdentity
  ) => GraphNodeColumnFunctionApplyResult;
};

export function useCanvasColumnAuthoringCommandRunner({
  state,
  effects,
}: UseCanvasColumnAuthoringCommandRunnerArgs): CanvasColumnAuthoringCommandRunner {
  const { canonicalNodesById } = state;
  const { runDraftSessionCommand } = effects;
  const submit = useCanvasColumnDraftCommand(runDraftSessionCommand);
  const runOutput = useCanvasRelationOutputCommand(canonicalNodesById, submit);
  const mapInput = useCallback(
    (identity: GraphNodeInputMapping) =>
      submit(
        (draftSession, signal) =>
          bindCanvasInputField({ draftSession, canonicalNodesById, ...identity, signal }),
        () => ({ outcome: 'rejected' as const, reason: 'invalid_transform_authority' as const })
      ),
    [canonicalNodesById, submit]
  );
  const removeInput = useCallback(
    (identity: GraphNodeInputMapping) =>
      submit(
        (draftSession, signal) =>
          removeCanvasInputField({ draftSession, canonicalNodesById, ...identity, signal }),
        () => ({ outcome: 'rejected' as const, reason: 'invalid_transform_authority' as const })
      ),
    [canonicalNodesById, submit]
  );
  const toggleOutput = useCallback(
    (identity: GraphNodeColumnOutputToggleIdentity) =>
      runOutput(identity, (currentDraftSession) =>
        applyToggleOutput(currentDraftSession, canonicalNodesById, identity)
      ),
    [canonicalNodesById, runOutput]
  );

  const reorderOutput = useCallback(
    (identity: GraphNodeColumnReorderIdentity) =>
      runOutput(identity, (currentDraftSession) =>
        applyReorderOutput(currentDraftSession, canonicalNodesById, identity)
      ),
    [canonicalNodesById, runOutput]
  );

  const applyFunction = useCallback(
    async (
      identity: GraphNodeColumnFunctionApplyIdentity
    ): Promise<GraphNodeColumnFunctionApplyResult> => {
      const result = await submit(
        (currentDraftSession) =>
          applyCanvasColumnFunction({
            draftSession: currentDraftSession,
            canonicalNodesById,
            identity,
          }),
        () => ({ outcome: 'rejected' as const, reason: 'invalid_document' as const })
      );
      return result.outcome === 'applied'
        ? { outcome: 'applied', createdFieldId: result.createdFieldId }
        : result;
    },
    [canonicalNodesById, submit]
  );

  const addCalculated = useCallback(
    async (
      identity: GraphNodeCalculatedColumnIdentity
    ): Promise<GraphNodeColumnFunctionApplyResult> => {
      const result = await submit(
        (currentDraftSession) =>
          applyCanvasCalculatedColumn({
            draftSession: currentDraftSession,
            canonicalNodesById,
            request: identity,
          }),
        () => ({ outcome: 'rejected' as const, reason: 'invalid_document' as const })
      );
      return result.outcome === 'applied'
        ? { outcome: 'applied', createdFieldId: result.createdFieldId }
        : result;
    },
    [canonicalNodesById, submit]
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
      mapInput,
      removeInput,
      toggleOutput,
      reorderOutput,
      applyFunction,
      addCalculated,
      applyStructured,
    }),
    [
      addCalculated,
      applyFunction,
      applyStructured,
      reorderOutput,
      toggleOutput,
      mapInput,
      removeInput,
    ]
  );
}
