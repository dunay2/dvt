/** Owned concern: present JOIN predicates and one explicit next-input binding. */
import { useMemo, useState } from 'react';

import { Button } from '../../components/ui/button';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import {
  inspectDvtSubstraitNInputJoinDraft,
  type DvtSubstraitInnerJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import { DvtSubstraitJoinPredicateEditors } from './DvtSubstraitJoinPredicateEditors';

const selectClassName =
  'h-8 w-full rounded border border-(--border-subtle) bg-(--surface-subtle) px-2 text-xs text-(--text-primary)';

export function CanvasRelationalTreeJoinEditor({
  appendInput,
  copy,
  draft,
  onAppend,
  onChange,
}: Readonly<{
  appendInput: CanvasDvtCompositionInput | null;
  copy: CanvasRelationalTreeWorkbenchCopy;
  draft: DvtSubstraitInnerJoinDraft;
  onAppend: (selection: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>) => void;
  onChange: (draft: DvtSubstraitInnerJoinDraft) => void;
}>): JSX.Element | null {
  const inspection = useMemo(() => inspectDvtSubstraitNInputJoinDraft(draft), [draft]);
  const outputs = inspection.ok ? inspection.projection.outputs : [];
  const [leftSourceFieldId, setLeftSourceFieldId] = useState(outputs[0]?.source.fieldId ?? '');
  const leftOutput = outputs.find((output) => output.source.fieldId === leftSourceFieldId);
  const rightFields =
    appendInput?.fields.filter((field) => field.joinDataType === leftOutput?.dataType) ?? [];
  const [rightFieldName, setRightFieldName] = useState(rightFields[0]?.name ?? '');
  if (!inspection.ok) return null;

  return (
    <div className="space-y-3">
      <DvtSubstraitJoinPredicateEditors
        disabled={false}
        draft={draft}
        projection={inspection.projection}
        onChange={onChange}
      />
      {appendInput == null ? null : (
        <form
          data-slot="canvas-relational-tree-append-join-input"
          className="space-y-2 border-t border-(--border-subtle) pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (leftSourceFieldId.length > 0 && rightFieldName.length > 0) {
              onAppend({ leftSourceFieldId, rightFieldName });
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
                const next = outputs.find(
                  (output) => output.source.fieldId === event.currentTarget.value
                );
                setLeftSourceFieldId(event.currentTarget.value);
                setRightFieldName(
                  appendInput.fields.find((field) => field.joinDataType === next?.dataType)?.name ??
                    ''
                );
              }}
            >
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
              value={rightFieldName}
              onChange={(event) => setRightFieldName(event.currentTarget.value)}
            >
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
            disabled={rightFieldName.length === 0}
          >
            {copy.inspectorDvtSubstraitAppendInputAction}
          </Button>
        </form>
      )}
    </div>
  );
}
