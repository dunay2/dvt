/** Keep staged operation semantics aligned with their connected producers. */
import { useEffect } from 'react';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
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
}): void {
  const { analysis, inputs, state } = args;
  useEffect(() => {
    let cancelled = false;
    const snapshot = state.stagedOperations;
    void Promise.all(
      snapshot.map(async (operation) => {
        const joined = configureCanvasStagedBinary(
          operation,
          inputs,
          state.pendingSources,
          snapshot,
          analysis?.document
        );
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
  }, [analysis, inputs, state.pendingSources, state.setStagedOperations, state.stagedOperations]);
}
