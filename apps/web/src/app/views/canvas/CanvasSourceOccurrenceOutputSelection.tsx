/** Adapt one applied Source occurrence to the existing Model root Output command. */
import { useContext, useEffect, useState } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { CanvasSourceOccurrenceOutputs } from './CanvasSourceOccurrenceOutputs';
import {
  readCanvasSourceOccurrenceOutputSelection,
  sourceOccurrenceOutputEdits,
} from './canvasSourceOccurrenceOutputSlots';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { useRelationCommand } from './useRelationCommand';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { useCanvasOutputPresentation } from './CanvasRelationalTreeEditorFrame';

export function CanvasSourceOccurrenceOutputSelection({
  relationId,
  publishedFieldNames,
  input,
  onChange,
  recovery,
}: Readonly<{
  relationId: string;
  publishedFieldNames: readonly string[];
  input?: CanvasDvtCompositionInput;
  onChange?: (document: SubstraitDocument) => void | boolean;
  recovery?: Readonly<{
    fieldIds: ReadonlySet<string>;
    busy: boolean;
    restore: (fieldId: string) => Promise<boolean>;
  }>;
}>): JSX.Element {
  const analysis = useContext(CanvasRelationAnalysisContext);
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const presentation = useCanvasOutputPresentation();
  const editing = presentation.editing && onChange != null;
  const [recoveryError, setRecoveryError] = useState(false);
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
  const unavailable = current?.selection === null || analysis?.error != null;
  const presentationSelection =
    selection ??
    (settled?.relationId === relationId &&
    (analysis == null || settled.analysis?.session === analysis.session)
      ? settled.selection
      : null);
  return (
    <>
      <CanvasSourceOccurrenceOutputs
        fields={(presentationSelection?.fields ?? [])
          .filter(
            (field) =>
              publishedFieldNames.includes(field.name) ||
              (editing && recovery?.fieldIds.has(field.id))
          )
          .map((field) => ({
            ...field,
            available:
              field.available ||
              (editing && field.canRecoverInput && recovery?.fieldIds.has(field.id) === true),
            dataType:
              input?.fields.find((physical) => physical.name === field.name)?.dataType ??
              field.dataType,
          }))}
        disabled={onChange == null || unavailable}
        editing={editing}
        showExcluded={editing && presentation.showExcluded}
        busy={
          (!unavailable && selection == null) || command.state === 'busy' || recovery?.busy === true
        }
        onChange={(fieldId, included) => {
          if (
            !editing ||
            onChange == null ||
            command.state === 'busy' ||
            recovery?.busy ||
            selection == null
          )
            return;
          if (included && recovery?.fieldIds.has(fieldId)) {
            if (!selection.fields.find((field) => field.id === fieldId)?.canRecoverInput) return;
            setRecoveryError(false);
            void recovery
              .restore(fieldId)
              .then((accepted) => setRecoveryError(!accepted))
              .catch(() => setRecoveryError(true));
            return;
          }
          void command.execute(async (session, request) => {
            const latest = await readCanvasSourceOccurrenceOutputSelection(
              session,
              relationId,
              request.expectedRevision,
              request.signal
            );
            const field = latest.fields.find((candidate) => candidate.id === fieldId);
            if (field?.available !== true) throw new Error('Source output is unavailable.');
            return changeSelectedRelationOutputs(session, {
              ...request,
              relationId: session.rootId,
              outputs: sourceOccurrenceOutputEdits(latest, new Map([[fieldId, included]])),
            });
          });
        }}
      />
      {recoveryError || command.state === 'error' || unavailable ? (
        <p role="alert" className="text-xs text-(--status-error)">
          {copy.fieldSelectionRejected}
        </p>
      ) : null}
    </>
  );
}
