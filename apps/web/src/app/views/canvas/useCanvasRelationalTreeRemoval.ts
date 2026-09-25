/** Bind relation retirement to the existing guided draft and its ordered source occurrences. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanvasRelationalTreeExistingDraft } from './canvasRelationalTreeExistingDraft';
import type { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { relationOperation } from './canvasRelationOperation';
import { useRelationRemoval } from './useRelationRemoval';

export function retainedSourceInputIds(
  previous: SubstraitDocument,
  next: SubstraitDocument,
  inputIds: readonly string[]
): readonly string[] {
  // Input slots use occurrence-anchor order, matching the canonical provenance projection.
  const occurrences = previous.sidecar.relations
    .filter((entry) => entry.sourceRef != null)
    .sort((left, right) => left.relAnchor - right.relAnchor);
  if (occurrences.length !== inputIds.length)
    throw new Error('Source occurrence slots are inconsistent.');
  const surviving = new Set(next.sidecar.relations.map((entry) => entry.relationId));
  return inputIds.filter((_, ordinal) => surviving.has(occurrences[ordinal]!.relationId));
}

export function useCanvasRelationalTreeRemoval(
  args: Readonly<{
    enabled: boolean;
    analysis: ReturnType<typeof useCanvasRelationAnalysisSession>;
    active: boolean;
    draft: SubstraitDocument | null;
    selectedInputIds: readonly string[];
    seed: CanvasRelationalTreeExistingDraft | null;
    hydrate: () => boolean;
    accept: (
      result: Readonly<{ draft: SubstraitDocument; operation: CanvasRelationalOperation }>,
      ids: readonly string[]
    ) => void;
  }>
) {
  return useRelationRemoval(
    (next) => {
      const analysis = args.analysis!;
      const ids = args.active ? args.selectedInputIds : args.seed!.inputIds;
      const retained = retainedSourceInputIds(analysis.document!, next, ids);
      if (!args.active) args.hydrate();
      args.accept({ draft: next, operation: relationOperation(analysis.session) }, retained);
    },
    args.enabled,
    args.analysis
  );
}
