/** Owned concern: bind an explicit new occurrence using distinguishable canonical input fields. */
import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from '../canvasSemanticEditorCopy';
import { resolveCanvasDvtJoinFieldPair } from '../canvasDvtJoinTypeAdmission';
import { useSelectedRelationInput } from '../useSelectedRelationInput';
import { conditionDataType } from '../canvasSelectedJoin';
import type { CanvasDvtCompositionInput } from '../canvasDvtCompositionInputCatalog';
import type { CanvasRelationalTreeWorkbenchCopy } from '../canvasRelationalTreeWorkbench.types';

const selectClassName =
  'h-8 w-full rounded border border-(--border-subtle) bg-(--surface-subtle) px-2 text-xs text-(--text-primary)';

export function SourceOccurrenceAppendForm({
  appendInput,
  copy,
  onAppend,
}: Readonly<{
  appendInput: CanvasDvtCompositionInput;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onAppend: (selection: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>) => void;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const editorCopy = resolveCanvasSemanticEditorCopy(language);
  const selected = useSelectedRelationInput(null, 'insert');
  const inputId = appendInput?.nodeId ?? null;
  const [selection, setSelection] = useState({
    inputId,
    leftSourceFieldId: '',
    rightFieldName: '',
  });
  useEffect(() => {
    setSelection({ inputId, leftSourceFieldId: '', rightFieldName: '' });
  }, [inputId]);
  const activeSelection =
    selection.inputId === inputId
      ? selection
      : { inputId, leftSourceFieldId: '', rightFieldName: '' };
  const existingFields =
    selected?.schema.bindings
      .filter((field) => field.parentFieldId == null)
      .map((field) => ({
        name: field.displayName ?? field.fieldId,
        joinDataType: conditionDataType(
          selected.schema.fields[field.outputOrdinal]?.type.kind.case
        ),
        fieldId: field.fieldId,
      })) ?? [];
  const suggestion = resolveCanvasDvtJoinFieldPair(existingFields, appendInput?.fields ?? []);
  const manualLeft = existingFields.find(
    (field) => field.fieldId === activeSelection.leftSourceFieldId
  );
  const leftField = manualLeft ?? suggestion?.left;
  const leftSourceFieldId = leftField?.fieldId ?? '';
  const rightFields =
    appendInput?.fields.filter(
      (field) => field.joinDataType != null && field.joinDataType === leftField?.joinDataType
    ) ?? [];
  const selectedRightField =
    manualLeft != null && rightFields.some((field) => field.name === activeSelection.rightFieldName)
      ? activeSelection.rightFieldName
      : (resolveCanvasDvtJoinFieldPair(leftField == null ? [] : [leftField], rightFields)?.right
          .name ?? '');
  return (
    <form
      data-slot="canvas-relational-tree-append-join-input"
      className="space-y-2 border-t border-(--border-subtle) pt-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (leftSourceFieldId.length > 0 && selectedRightField.length > 0) {
          onAppend({ leftSourceFieldId, rightFieldName: selectedRightField });
        }
      }}
    >
      <h4 className="text-[11px] font-semibold uppercase text-(--text-muted)">
        {copy.inspectorDvtSubstraitAppendInputTitle}: {appendInput.table}
      </h4>
      <label className="block space-y-1 text-[11px] text-(--text-muted)">
        <span>{copy.inspectorDvtSubstraitExistingFieldLabel}</span>
        <select
          data-slot="canvas-relational-tree-existing-field"
          className={selectClassName}
          value={leftSourceFieldId}
          onChange={(event) => {
            setSelection({
              inputId,
              leftSourceFieldId: event.currentTarget.value,
              rightFieldName: '',
            });
          }}
        >
          {leftSourceFieldId.length === 0 ? (
            <option value="" disabled>
              {editorCopy.noCompatibleJoinFields}
            </option>
          ) : null}
          {existingFields.map((field) => (
            <option key={field.fieldId} value={field.fieldId}>
              {field.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-[11px] text-(--text-muted)">
        <span>{copy.inspectorDvtSubstraitConnectedFieldLabel}</span>
        <select
          data-slot="canvas-relational-tree-connected-field"
          className={selectClassName}
          value={selectedRightField}
          disabled={rightFields.length === 0}
          onChange={(event) =>
            setSelection({
              inputId,
              leftSourceFieldId,
              rightFieldName: event.currentTarget.value,
            })
          }
        >
          {rightFields.length === 0 ? (
            <option value="" disabled>
              {editorCopy.noCompatibleJoinFields}
            </option>
          ) : null}
          {rightFields.map((field) => (
            <option key={field.name} value={field.name}>
              {appendInput.table}.{field.name}
            </option>
          ))}
        </select>
      </label>
      <Button
        type="submit"
        size="sm"
        data-slot="canvas-relational-tree-append-input"
        disabled={leftSourceFieldId.length === 0 || selectedRightField.length === 0}
      >
        {copy.inspectorDvtSubstraitAppendInputAction}
      </Button>
    </form>
  );
}
