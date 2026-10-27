/** Test fixture: independent detached Reads and current pending Output command state. */
import { vi } from 'vitest';
import type { CanvasDvtCompositionInput } from '../canvasDvtCompositionInputCatalog';
import { occurrenceInput } from './occurrence.test.fixtures';
import { createSourceOccurrenceActions } from './sourceOccurrenceActions';
import {
  createPendingSourceOccurrence,
  type PendingSourceOccurrence,
} from './pendingSourceOccurrence';

export const pendingSourceOutputInput: CanvasDvtCompositionInput = {
  ...occurrenceInput.source,
  fields: occurrenceInput.fields.map((name) => ({
    name,
    dataType: 'bigint',
    joinDataType: 'i64',
  })),
};
export function createPendingSourceOutputSession(
  options: {
    editable?: boolean;
    start?: () => boolean;
    input?: CanvasDvtCompositionInput;
    creationInput?: CanvasDvtCompositionInput;
    nested?: boolean;
  } = {}
): {
  left: PendingSourceOccurrence;
  right: PendingSourceOccurrence;
  start: ReturnType<typeof vi.fn<() => boolean>>;
  actions: () => ReturnType<typeof createSourceOccurrenceActions>;
  pending: () => readonly PendingSourceOccurrence[];
  producer: CanvasDvtCompositionInput;
} {
  const producer = options.input ?? pendingSourceOutputInput;
  const created = createPendingSourceOccurrence(options.creationInput ?? producer);
  const left = options.nested
    ? {
        ...created,
        read: {
          ...created.read,
          fields: [
            ...created.read.fields,
            {
              ...created.read.fields[0]!,
              fieldId: 'nested-detail',
              parentFieldId: created.read.fields[0]!.fieldId,
              outputOrdinal: 0,
            },
          ],
        },
      }
    : created;
  const right = createPendingSourceOccurrence(options.creationInput ?? producer);
  let pending: readonly PendingSourceOccurrence[] = [left, right];
  const start = vi.fn(options.start ?? (() => true));
  const actions = (): ReturnType<typeof createSourceOccurrenceActions> =>
    createSourceOccurrenceActions({
      editable: options.editable ?? true,
      session: null,
      revision: 0,
      inputs: [producer],
      start,
      pending,
      setPending: (update) => {
        pending = update(pending);
      },
      selectedId: null,
      setSelectedId: vi.fn(),
    });
  return { left, right, start, actions, pending: () => pending, producer };
}
