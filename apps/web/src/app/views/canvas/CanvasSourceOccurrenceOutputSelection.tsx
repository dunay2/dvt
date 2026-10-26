/** Adapt one applied Source occurrence to the existing Model root Output command. */
import { useContext, useEffect, useState } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { CanvasSourceOccurrenceOutputs } from './CanvasSourceOccurrenceOutputs';
import { readCanvasSourceOccurrenceOutputSelection } from './canvasSourceOccurrenceOutputSlots';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { useRelationCommand } from './useRelationCommand';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';

export function CanvasSourceOccurrenceOutputSelection({
  relationId,
  publishedFieldNames,
  input,
  onChange,
}: Readonly<{
  relationId: string;
  publishedFieldNames: readonly string[];
  input?: CanvasDvtCompositionInput;
  onChange?: (document: SubstraitDocument) => void | boolean;
}>): JSX.Element {
  const analysis = useContext(CanvasRelationAnalysisContext);
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const [settled, setSettled] = useState<{
    analysis: typeof analysis;
    relationId: string;
    selection: Awaited<ReturnType<typeof readCanvasSourceOccurrenceOutputSelection>> | null;
  } | null>(null);
  const command = useRelationCommand(relationId, (document) => {
    if (onChange == null) return false;
    return onChange(document);
  });
  useEffect(() => {
    if (analysis?.document == null || analysis.error != null) return;
    const cancellation = new AbortController();
    void readCanvasSourceOccurrenceOutputSelection(
      analysis.session,
      relationId,
      analysis.revision,
      cancellation.signal
    )
      .then((selection) => {
        if (!cancellation.signal.aborted) setSettled({ analysis, relationId, selection });
      })
      .catch(() => {
        if (!cancellation.signal.aborted) setSettled({ analysis, relationId, selection: null });
      });
    return () => cancellation.abort();
  }, [analysis, relationId]);
  const current =
    settled?.analysis?.session === analysis?.session &&
    settled?.analysis?.permissionIdentity === analysis?.permissionIdentity &&
    analysis?.error == null &&
    settled?.relationId === relationId
      ? settled
      : null;
  const selection = current?.selection;
  return (
    <>
      <CanvasSourceOccurrenceOutputs
        fields={(selection?.fields ?? [])
          .filter((field) => publishedFieldNames.includes(field.name))
          .map((field) => ({
            ...field,
            dataType:
              input?.fields.find((physical) => physical.name === field.name)?.dataType ??
              field.dataType,
          }))}
        disabled={onChange == null || selection == null}
        editing={onChange != null}
        busy={command.state === 'busy'}
        onChange={(fieldId, included) => {
          if (onChange == null || command.state === 'busy' || selection == null) return;
          void command.execute(async (session, request) => {
            const latest = await readCanvasSourceOccurrenceOutputSelection(
              session,
              relationId,
              request.expectedRevision,
              request.signal
            );
            const field = latest.fields.find((candidate) => candidate.id === fieldId);
            if (field?.available !== true) throw new Error('Source output is unavailable.');
            const selected = latest.slots
              .filter((slot) => slot.output != null)
              .sort((a, b) => a.output!.outputOrdinal - b.output!.outputOrdinal);
            const next = included
              ? [
                  ...selected,
                  ...latest.slots.filter(
                    (slot) => field.slots.includes(slot.slot) && slot.output == null
                  ),
                ]
              : selected.filter((slot) => !field.slots.includes(slot.slot));
            return changeSelectedRelationOutputs(session, {
              ...request,
              relationId: session.rootId,
              outputs: next.map((slot) => ({ slot: slot.slot, alias: slot.name })),
            });
          });
        }}
      />
      {command.state === 'error' || current?.selection === null ? (
        <p role="alert" className="text-xs text-(--status-error)">
          {copy.fieldSelectionRejected}
        </p>
      ) : null}
    </>
  );
}
