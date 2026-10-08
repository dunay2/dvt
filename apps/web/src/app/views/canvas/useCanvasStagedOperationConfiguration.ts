/**
 * Owned concern: align staged configuration with one current producer snapshot.
 * @baseline ADR-0064: retained configuration is not executable semantic authority.
 * @decision Reuse exact restoration and canonical wrapper transactions behind the effect.
 * @consequence Asynchronous configuration never substitutes another graph's producers.
 * @version 1.0.0
 */
import { useCallback, useEffect } from 'react';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import {
  readCanvasStagedCompositionSignature,
  type CanvasStagedOperation,
} from './canvasStagedOperation';
import { configureCanvasStagedComposition } from './canvasStagedCompositionConfiguration';
import { resolveCanvasStagedProducerDocument } from './canvasStagedOperationDocument';
import { configureCanvasStagedTransform } from './canvasStagedTransformConfiguration';
import type { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import type { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';
import { restoreCanvasOperationConfiguration } from './canvasRetainedOperationConfiguration';
import { restoreCanvasRetainedInputWrappers } from './canvasRetainedInputWrappers';

type DraftState = ReturnType<typeof useCanvasRelationalTreeDraftState>;

export function useCanvasStagedOperationConfiguration(args: {
  analysis: ReturnType<typeof useCanvasRelationAnalysisSession>;
  inputs: readonly CanvasDvtCompositionInput[];
  state: Pick<DraftState, 'stagedOperations' | 'pendingSources' | 'setStagedOperations'>;
}) {
  const { analysis, inputs, state } = args;
  const configureImmediate = useCallback(
    (operation: CanvasStagedOperation) => {
      const signature = readCanvasStagedCompositionSignature(operation.operation);
      if (operation.configurationDocument != null && signature.repeatedInput == null)
        return restoreCanvasOperationConfiguration(
          operation,
          operation.inputs.map((relationId) =>
            resolveCanvasStagedProducerDocument({
              relationId,
              canonical: analysis?.document ?? null,
              operations: state.stagedOperations,
              sources: state.pendingSources,
            })
          )
        );
      const strategy = signature.configuration;
      return strategy === 'composition'
        ? configureCanvasStagedComposition(
            operation,
            inputs,
            state.pendingSources,
            state.stagedOperations,
            analysis?.document
          )
        : operation;
    },
    [analysis?.document, inputs, state.pendingSources, state.stagedOperations]
  );
  useEffect(() => {
    let cancelled = false;
    const snapshot = state.stagedOperations;
    void Promise.all(
      snapshot.map(async (operation) => {
        if (operation.configurationDocument != null) {
          const restored = configureImmediate(operation);
          return restoreCanvasRetainedInputWrappers(
            restored,
            operation.inputs.map((relationId) =>
              resolveCanvasStagedProducerDocument({
                relationId,
                canonical: analysis?.document ?? null,
                operations: snapshot,
                sources: state.pendingSources,
              })
            )
          );
        }
        const strategy = readCanvasStagedCompositionSignature(operation.operation).configuration;
        if (strategy === 'composition') return configureImmediate(operation);
        if (strategy === 'manual') return operation;
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
        if (current !== snapshot) return current;
        let changed = false;
        const next = current.map((operation, index) => {
          const candidate = configured[index];
          if (
            candidate == null ||
            operation.semanticDocument != null ||
            candidate.semanticDocument == null
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
    configureImmediate,
    state.pendingSources,
    state.setStagedOperations,
    state.stagedOperations,
  ]);
  return configureImmediate;
}
