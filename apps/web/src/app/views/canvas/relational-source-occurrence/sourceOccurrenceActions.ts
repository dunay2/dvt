/** Owned concern: prepare an explicit occurrence intent in the existing discardable session. */
import type { CanvasDvtCompositionInput } from '../canvasDvtCompositionInputCatalog';
import type { RelationAnalysisResult } from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from '../canvasRelationAnalysisSession';
import type { CanvasRelationalOperation } from '../canvasRelationalOperationChoices';
import { sourceOccurrenceAppendRejection } from './sourceOccurrencePolicy';
import type { Dispatch, SetStateAction } from 'react';
import {
  createPendingSourceOccurrence,
  type PendingSourceOccurrence,
} from './pendingSourceOccurrence';
import { nextSourceOccurrenceAlias } from './sourceOccurrenceAlias';

export function createSourceOccurrenceActions(
  args: Readonly<{
    editable: boolean;
    output: RelationAnalysisResult | null;
    session: CanvasRelationAnalysisSession | null;
    revision: number;
    operation: CanvasRelationalOperation | null;
    inputs: readonly CanvasDvtCompositionInput[];
    start: () => boolean;
    setAppendInputId: (id: string | null) => void;
    pending: readonly PendingSourceOccurrence[];
    setPending: Dispatch<SetStateAction<readonly PendingSourceOccurrence[]>>;
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;
    selectInitialInput: (id: string) => void;
  }>
) {
  const rejection = (id: string) =>
    sourceOccurrenceAppendRejection({
      editable: args.editable,
      output: args.output,
      session: args.session,
      revision: args.revision,
      operation: args.operation,
      input: args.inputs.find((input) => input.nodeId === id),
    });
  const drop = (id: string): string | null => {
    const input = args.inputs.find((candidate) => candidate.nodeId === id);
    if (
      !args.editable ||
      input == null ||
      input.fields.length === 0 ||
      input.fields.some((field) => field.joinDataType == null)
    )
      return null;
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
    return occurrence.read.binding.relationId;
  };
  const select = (relationId: string, sourceId: string) => {
    args.setSelectedId(relationId);
    if (args.session == null) args.selectInitialInput(sourceId);
    args.setAppendInputId(args.session == null ? null : sourceId);
  };
  return {
    pending: args.pending,
    selectedId: args.selectedId,
    rejection,
    drop,
    add: (id: string) => {
      const relationId = drop(id);
      if (relationId == null) return;
      select(relationId, id);
    },
    select: (id: string) => {
      const pending = args.pending.find((item) => item.read.binding.relationId === id);
      if (pending == null) return;
      select(id, pending.sourceNodeId);
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
