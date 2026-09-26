/** Owned concern: prepare an explicit occurrence intent in the existing discardable session. */
import type { CanvasDvtCompositionInput } from '../canvasDvtCompositionInputCatalog';
import type { CanvasRelationAnalysisSession } from '../canvasRelationAnalysisSession';
import type { SourceOccurrenceRejection } from './sourceOccurrencePolicy';
import {
  createPendingSourceOccurrence,
  type PendingSourceOccurrence,
} from './pendingSourceOccurrence';
import { nextSourceOccurrenceAlias } from './sourceOccurrenceAlias';
import { parseOccurrenceAlias } from './renameSourceOccurrence';

export function createSourceOccurrenceActions(
  args: Readonly<{
    editable: boolean;
    session: CanvasRelationAnalysisSession | null;
    revision: number;
    inputs: readonly CanvasDvtCompositionInput[];
    start: () => boolean;
    setAppendInputId: (id: string | null) => void;
    pending: readonly PendingSourceOccurrence[];
    setPending: (
      update: (current: readonly PendingSourceOccurrence[]) => readonly PendingSourceOccurrence[]
    ) => void;
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;
    selectInitialInput: (id: string) => void;
  }>
) {
  const rejection = (id: string): SourceOccurrenceRejection | null => {
    if (!args.editable) return 'read_only';
    const input = args.inputs.find((candidate) => candidate.nodeId === id);
    return input == null || input.fields.length === 0 ? 'unavailable' : null;
  };
  const drop = (id: string): string | null => {
    const input = args.inputs.find((candidate) => candidate.nodeId === id);
    if (input == null || rejection(id) != null) return null;
    const occurrence = createPendingSourceOccurrence(input);
    if (!args.start()) return null;
    const occupied = args.session?.sourceAliases(args.revision) ?? new Set<string>();
    args.setPending((current) => {
      const aliases = new Set([
        ...occupied,
        ...current.map((item) => item.read.binding.displayName),
      ]);
      const displayName = nextSourceOccurrenceAlias(occurrence.read.binding.displayName, aliases);
      return [
        ...current,
        {
          ...occurrence,
          read: { ...occurrence.read, binding: { ...occurrence.read.binding, displayName } },
        },
      ];
    });
    args.setSelectedId(occurrence.read.binding.relationId);
    args.setAppendInputId(null);
    return occurrence.read.binding.relationId;
  };
  return {
    pending: args.pending,
    selectedId: args.selectedId,
    rejection,
    drop,
    add: (id: string) => {
      drop(id);
    },
    select: (id: string) => {
      const pending = args.pending.find((item) => item.read.binding.relationId === id);
      if (pending == null) return;
      args.setSelectedId(id);
      args.setAppendInputId(null);
    },
    clearSelection: () => {
      args.setSelectedId(null);
      args.setAppendInputId(null);
    },
    connect: (id: string) => {
      const pending = args.pending.find((item) => item.read.binding.relationId === id);
      if (!args.editable || pending == null) return;
      args.setSelectedId(id);
      if (args.session == null) args.selectInitialInput(pending.sourceNodeId);
      args.setAppendInputId(args.session == null ? null : pending.sourceNodeId);
    },
    rename: (id: string, alias: string): boolean => {
      const name = parseOccurrenceAlias(alias);
      if (
        !args.editable ||
        !name.success ||
        !args.pending.some((item) => item.read.binding.relationId === id) ||
        args.session?.sourceAliases(args.revision).has(name.data) ||
        args.pending.some(
          (item) =>
            item.read.binding.relationId !== id && item.read.binding.displayName === name.data
        )
      )
        return false;
      args.setPending((current) =>
        current.map((item) =>
          item.read.binding.relationId !== id
            ? item
            : {
                ...item,
                read: { ...item.read, binding: { ...item.read.binding, displayName: name.data } },
              }
        )
      );
      return true;
    },
    remove: (id: string) => {
      args.setPending((current) => current.filter((item) => item.read.binding.relationId !== id));
      if (args.selectedId === id) {
        args.setSelectedId(null);
        args.setAppendInputId(null);
      }
    },
  };
}

export type SourceOccurrenceActions = ReturnType<typeof createSourceOccurrenceActions>;
