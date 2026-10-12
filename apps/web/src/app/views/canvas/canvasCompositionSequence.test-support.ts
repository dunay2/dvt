/** Reproducible catalog ordering and a harness around the real staged commands. */
import {
  canvasStagedCompositionSignatures,
  isCanvasStagedOperationKind,
  type CanvasStagedOperation,
  type CanvasStagedOperationKind,
} from './canvasStagedOperation';
import { createCanvasStagedOperationActions } from './canvasStagedOperationActions';
import { createPendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { source } from './canvasRelationalOperator.test-support';

export const compositionKinds = Object.keys(canvasStagedCompositionSignatures).filter(
  isCanvasStagedOperationKind
);

export function orderedCompositionKinds(seed: number): CanvasStagedOperationKind[] {
  const ordered = [...compositionKinds];
  let state = seed;
  for (let index = ordered.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const other = state % (index + 1);
    [ordered[index], ordered[other]] = [ordered[other]!, ordered[index]!];
  }
  return ordered;
}

export function compositionInput(table: string): CanvasDvtCompositionInput {
  const physical = source(table);
  return {
    ...physical,
    fields: physical.fields.map((field) => ({
      name: field.name,
      dataType: field.type,
      joinDataType: field.type,
    })),
  };
}

export function compositionGraphHarness() {
  const inputs = Array.from({ length: compositionKinds.length + 1 }, (_, index) =>
    compositionInput(`source_${index}`)
  );
  const state = {
    operations: [] as readonly CanvasStagedOperation[],
    sources: inputs.map((input) => createPendingSourceOccurrence(input)),
    selectedId: null as string | null,
  };
  const commands = (editable = true): ReturnType<typeof createCanvasStagedOperationActions> =>
    createCanvasStagedOperationActions({
      editable,
      start: () => true,
      operations: state.operations,
      setOperations: (update) => {
        state.operations = update(state.operations);
      },
      selectedId: state.selectedId,
      setSelectedId: (id) => {
        state.selectedId = id;
      },
      producerIds: [
        ...state.sources.map((entry) => entry.read.binding.relationId),
        ...state.operations.map((operation) => operation.id),
      ],
      consumedProducerIds: [],
    });
  return { state, inputs, commands };
}
