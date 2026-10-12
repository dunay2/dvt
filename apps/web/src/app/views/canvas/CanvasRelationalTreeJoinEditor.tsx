/** Compose selected JOIN properties and occurrence append without shape-specific inspection. */
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { DvtSubstraitJoinPredicateEditors } from './DvtSubstraitJoinPredicateEditors';
import { useSelectedJoin } from './useSelectedJoin';
import { CanvasJoinTypeProperties } from './CanvasJoinTypeProperties';
import { useEffect, useRef, useState } from 'react';
import type { ConditionDraft } from './join-condition/conditionDraft';
import { hasPendingConditionDraft } from './SemanticWorkbenchJoinConditionEditor';
import {
  CanvasJoinPredicateFormula,
  type JoinPredicateFormulaDraft,
} from './CanvasJoinPredicateFormulaController';

export function CanvasRelationalTreeJoinEditor({
  copy,
  onChange,
  onPendingConditionChange,
  selectedRelationId,
  disabled = false,
}: Readonly<{
  copy: CanvasRelationalTreeWorkbenchCopy;
  onChange: (draft: SubstraitDocument) => void;
  onPendingConditionChange?: (pending: boolean) => void;
  selectedRelationId: string | null;
  disabled?: boolean;
}>): JSX.Element | null {
  const selected = useSelectedJoin(selectedRelationId);
  const [drafts, setDrafts] = useState<Readonly<Record<string, ConditionDraft | null>>>({});
  const [formulaDraft, setFormulaDraft] = useState<JoinPredicateFormulaDraft | null>(null);
  const pending = formulaDraft != null || Object.values(drafts).some(hasPendingConditionDraft);
  const callback = useRef(onPendingConditionChange);
  callback.current = onPendingConditionChange;
  useEffect(() => {
    callback.current?.(pending);
    return () => callback.current?.(false);
  }, [pending]);
  if (selected == null) return null;
  return (
    <div className="min-h-0 space-y-3">
      <CanvasJoinTypeProperties
        selected={selected}
        copy={copy}
        onChange={onChange}
        disabled={disabled || formulaDraft != null}
      />
      <CanvasJoinPredicateFormula
        selected={selected}
        draft={formulaDraft?.relationId === selected.relationId ? formulaDraft : null}
        onDraftChange={setFormulaDraft}
        onChange={onChange}
        disabled={disabled || Object.values(drafts).some(hasPendingConditionDraft)}
      >
        <DvtSubstraitJoinPredicateEditors
          selected={selected}
          disabled={disabled}
          onChange={onChange}
          draft={drafts[selected.relationId] ?? null}
          onDraftChange={(update) =>
            setDrafts((current) => ({
              ...current,
              [selected.relationId]:
                typeof update === 'function'
                  ? update(current[selected.relationId] ?? null)
                  : update,
            }))
          }
        />
      </CanvasJoinPredicateFormula>
    </div>
  );
}
