/** Keep staged operation semantics aligned with their connected producers. */
import { useCallback, useEffect } from 'react';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { configureCanvasStagedBinary } from './canvasStagedBinaryConfiguration';
import { resolveCanvasStagedProducerDocument } from './canvasStagedOperationDocument';
import { configureCanvasStagedTransform } from './canvasStagedTransformConfiguration';
import type { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import type { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';

type DraftState = ReturnType<typeof useCanvasRelationalTreeDraftState>;

export function useCanvasStagedOperationConfiguration(args: {
  analysis: ReturnType<typeof useCanvasRelationAnalysisSession>;
  inputs: readonly CanvasDvtCompositionInput[];
  state: DraftState;
}) {
  const { analysis, inputs, state } = args;
  const configure = useCallback(
    (operation: CanvasStagedOperation) =>
      configureCanvasStagedBinary(
        operation,
        inputs,
        state.pendingSources,
        state.stagedOperations,
        analysis?.document
      ),
    [analysis?.document, inputs, state.pendingSources, state.stagedOperations]
  );
  useEffect(() => {
    let cancelled = false;
    const snapshot = state.stagedOperations;
    void Promise.all(
      snapshot.map(async (operation) => {
        const joined = configure(operation);
        if (joined.semanticDocument != null) return joined;
        return configureCanvasStagedTransform(
          operation,
          resolveCanvasStagedProducerDocument({
            relationId: operation.inputs[0] ?? null,
            canonical: analysis?.document ?? null,
            operations: snapshot,
            sources: state.pendingSources,
          })
        );
      })
    ).then((configured) => {
      if (cancelled) return;
      state.setStagedOperations((current) => {
        let changed = false;
        const next = current.map((operation) => {
          const index = snapshot.findIndex((candidate) => candidate.id === operation.id);
          const candidate = configured[index];
          if (
            candidate == null ||
            operation.semanticDocument != null ||
            candidate.semanticDocument == null ||
            operation.operation !== snapshot[index]?.operation ||
            operation.inputs.some((input, port) => input !== snapshot[index]?.inputs[port])
          )
            return operation;
          changed = true;
          return candidate;
        });
        return changed ? next : current;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [
    analysis,
    configure,
    state.pendingSources,
    state.setStagedOperations,
    state.stagedOperations,
  ]);
  return configure;
}
