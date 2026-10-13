/**
Owned concern: compose selected JOIN properties without shape-specific inspection.
@baseline GH-3623: switching to functions must preserve the controlled comparison draft.
@decision Keep comparison and formula drafts in this owner; clear the comparison only after acceptance.
@consequence Cancel restores pending edits and both editors share the same relation command.
@version 1.0.0
 */
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { DvtSubstraitJoinPredicateEditors } from './DvtSubstraitJoinPredicateEditors';
import { useSelectedJoin } from './useSelectedJoin';
import { CanvasJoinTypeProperties } from './CanvasJoinTypeProperties';
import { useEffect, useRef, useState } from 'react';
import type { ConditionDraft } from './join-condition/conditionDraft';
import { hasPendingConditionDraft } from './SemanticWorkbenchJoinConditionEditor';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import {
  CanvasJoinPredicateFormula,
  type JoinPredicateFormulaDraft,
} from './CanvasJoinPredicateFormulaController';

type ComparisonDraft = Readonly<{ revision: number; condition: ConditionDraft }>;

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
  const [drafts, setDrafts] = useState<Readonly<Record<string, ComparisonDraft | null>>>({});
  const [formulaDraft, setFormulaDraft] = useState<JoinPredicateFormulaDraft | null>(null);
  const language = useApplicationLanguageStore((state) => state.language);
  const semanticCopy = resolveCanvasSemanticEditorCopy(language);
  const pendingComparisons = Object.values(drafts).some((draft) =>
    hasPendingConditionDraft(draft?.condition ?? null)
  );
  const pending = formulaDraft != null || pendingComparisons;
  const callback = useRef(onPendingConditionChange);
  callback.current = onPendingConditionChange;
  useEffect(() => {
    callback.current?.(pending);
    return () => callback.current?.(false);
  }, [pending]);
  if (selected == null) return null;
  const comparisonDraft = drafts[selected.relationId];
  const stale = comparisonDraft != null && comparisonDraft.revision !== selected.revision;
  return (
    <div className="min-h-0 space-y-3">
      {stale ? <p role="alert">{semanticCopy.derivedOutput.stale}</p> : null}
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
        disabled={disabled}
        editBlocked={stale || pendingComparisons}
        onAccepted={() => setDrafts((current) => ({ ...current, [selected.relationId]: null }))}
      >
        {(onEditFormula, formulaDisabled) => (
          <DvtSubstraitJoinPredicateEditors
            selected={selected}
            disabled={disabled}
            saveBlocked={stale}
            onEditFormula={onEditFormula}
            formulaDisabled={formulaDisabled || stale}
            onChange={onChange}
            draft={comparisonDraft?.condition ?? null}
            onDraftChange={(update) =>
              setDrafts((current) => {
                const previous = current[selected.relationId];
                const condition =
                  typeof update === 'function' ? update(previous?.condition ?? null) : update;
                return {
                  ...current,
                  [selected.relationId]:
                    condition == null
                      ? null
                      : {
                          revision: previous?.revision ?? selected.revision,
                          condition,
                        },
                };
              })
            }
          />
        )}
      </CanvasJoinPredicateFormula>
    </div>
  );
}
