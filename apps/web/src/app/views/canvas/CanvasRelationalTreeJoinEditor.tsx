/** Owned concern: present JOIN predicates and one explicit next-input binding. */
import { useMemo, useState } from 'react';

import { Button } from '../../components/ui/button';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import {
  inspectDvtSubstraitJoinPredicateContext,
  type DvtSubstraitInnerJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import { DvtSubstraitJoinPredicateEditors } from './DvtSubstraitJoinPredicateEditors';
import type { CanonicalNode } from '../../types/canonical';
import { resolveCanvasDvtJoinFieldPair } from './canvasDvtJoinTypeAdmission';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

const selectClassName =
  'h-8 w-full rounded border border-(--border-subtle) bg-(--surface-subtle) px-2 text-xs text-(--text-primary)';

export function CanvasRelationalTreeJoinEditor({
  appendInput,
  copy,
  draft,
  onAppend,
  onChange,
  onPendingConditionChange,
  selectedRelationId,
  transformNode,
}: Readonly<{
  appendInput: CanvasDvtCompositionInput | null;
  copy: CanvasRelationalTreeWorkbenchCopy;
  draft: DvtSubstraitInnerJoinDraft;
  onAppend: (selection: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>) => void;
  onChange: (draft: DvtSubstraitInnerJoinDraft) => void;
  onPendingConditionChange?: (pending: boolean) => void;
  selectedRelationId: string | null;
  transformNode: CanonicalNode;
}>): JSX.Element | null {
  const language = useApplicationLanguageStore((state) => state.language);
  const editorCopy = resolveCanvasSemanticEditorCopy(language);
  const inspection = useMemo(
    () => inspectDvtSubstraitJoinPredicateContext(draft)?.inspection,
    [draft]
  );
  const outputs = inspection?.ok ? inspection.projection.outputs : [];
  const inputId = appendInput?.nodeId ?? null;
  const [selection, setSelection] = useState({
    inputId,
    leftSourceFieldId: '',
    rightFieldName: '',
  });
  if (selection.inputId !== inputId) {
    setSelection({ inputId, leftSourceFieldId: '', rightFieldName: '' });
  }
  const existingFields = outputs.map((output) => ({
    name: output.source.name,
    joinDataType: output.dataType,
    fieldId: output.source.fieldId,
  }));
  const suggestion = resolveCanvasDvtJoinFieldPair(existingFields, appendInput?.fields ?? []);
  const manualLeft =
    selection.inputId === inputId
      ? existingFields.find((field) => field.fieldId === selection.leftSourceFieldId)
      : undefined;
  const leftField = manualLeft ?? suggestion?.left;
  const leftSourceFieldId = leftField?.fieldId ?? '';
  const rightFields =
    appendInput?.fields.filter(
      (field) => field.joinDataType != null && field.joinDataType === leftField?.joinDataType
    ) ?? [];
  const selectedRightField =
    manualLeft != null && rightFields.some((field) => field.name === selection.rightFieldName)
      ? selection.rightFieldName
      : (resolveCanvasDvtJoinFieldPair(leftField == null ? [] : [leftField], rightFields)?.right
          .name ?? '');
  if (!inspection?.ok) return null;

  return (
    <div className="h-full min-h-0 space-y-3">
      <div className="h-full min-h-0" hidden={appendInput != null}>
        <DvtSubstraitJoinPredicateEditors
          disabled={false}
          draft={draft}
          projection={inspection.projection}
          onChange={onChange}
          onPendingConditionChange={onPendingConditionChange}
          selectedRelationId={selectedRelationId}
          transformNode={transformNode}
        />
      </div>
      {appendInput == null ? null : (
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
              {outputs.map((output) => (
                <option key={output.source.fieldId} value={output.source.fieldId}>
                  {inspection.projection.inputs[output.source.inputIndex]?.table ?? '?'}.
                  {output.source.name}
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
      )}
    </div>
  );
}
