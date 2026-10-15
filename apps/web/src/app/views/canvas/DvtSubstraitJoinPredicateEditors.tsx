/**
Owned concern: edit one selected JOIN through the shared typed read model and atomic command.
@baseline GH-3623: simple comparisons and functions are two views of the same predicate.
@decision Project pending comparisons with the existing condition helpers before formula handoff.
@consequence Switching editors does not write or drop sibling clauses.
@version 1.0.0
 */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { SelectedJoin } from './canvasSelectedJoin';
import { replaceSelectedJoinConditions } from './canvasSelectedJoinPredicate';
import { useRelationCommand } from './useRelationCommand';
import { SemanticWorkbenchJoinConditionEditor } from './SemanticWorkbenchJoinConditionEditor';
import { CanvasSelectedJoinConditionTree } from './CanvasSelectedJoinConditionTree';
import type { Dispatch, SetStateAction } from 'react';
import type { Comparison, ConditionDraft } from './join-condition/conditionDraft';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { Button } from '../../components/ui/button';
import styles from './DvtSubstraitJoinPredicateEditors.module.css';
import {
  appendDvtSubstraitJoinComparison,
  updateDvtSubstraitJoinComparison,
  removeDvtSubstraitJoinComparison,
  type DvtSubstraitJoinPredicateCondition,
} from './canvasDvtSubstraitJoinCondition';
import {
  dvtSubstraitJoinOperandKey,
  type DvtSubstraitJoinPredicateOperand,
} from './canvasDvtSubstraitJoinOperand';

const operandKey = (operand: DvtSubstraitJoinPredicateOperand) =>
  dvtSubstraitJoinOperandKey(operand, (field) => field.sourceFieldId);

export function DvtSubstraitJoinPredicateEditors({
  selected,
  disabled,
  onChange,
  draft,
  onDraftChange,
  onEditFormula,
  formulaDisabled = false,
  saveBlocked = false,
}: Readonly<{
  selected: SelectedJoin;
  disabled: boolean;
  onChange: (document: SubstraitDocument) => void;
  draft: ConditionDraft | null;
  onDraftChange: Dispatch<SetStateAction<ConditionDraft | null>>;
  onEditFormula?: (conditions: readonly DvtSubstraitJoinPredicateCondition[]) => void;
  formulaDisabled?: boolean;
  saveBlocked?: boolean;
}>) {
  const command = useRelationCommand(selected.relationId, onChange);
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language).joinFormula;
  const conditions = selected.conditions;
  const commit = (next: readonly DvtSubstraitJoinPredicateCondition[] | null) =>
    next == null || saveBlocked
      ? Promise.resolve(false)
      : command.execute((session, request) =>
          replaceSelectedJoinConditions(session, { ...request, conditions: next })
        );
  if (conditions == null)
    return (
      <>
        <CanvasSelectedJoinConditionTree
          selected={selected}
          conditions={null}
          onSelectCondition={() => undefined}
        />
        <p role="status">{copy.advanced}</p>
      </>
    );
  return (
    <fieldset
      disabled={disabled || command.state === 'busy'}
      className={styles.editors}
      data-slot="dvt-substrait-join-predicate-editors"
      data-relation-id={selected.relationId}
    >
      {command.state === 'error' ? <p role="alert">{copy.failed}</p> : null}
      <SemanticWorkbenchJoinConditionEditor
        key={selected.relationId}
        fields={selected.fields}
        conditions={conditions}
        draft={draft}
        onDraftChange={onDraftChange}
        saveBlocked={saveBlocked}
        renderFormulaAction={
          onEditFormula == null
            ? undefined
            : (edit) => {
                const next = projectEditedConditions(conditions, edit);
                return (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    data-slot="join-condition-formula-edit"
                    disabled={formulaDisabled || command.state === 'busy' || next == null}
                    onClick={() => {
                      if (next != null) onEditFormula(next);
                    }}
                  >
                    {copy.edit}
                  </Button>
                );
              }
        }
        renderExpression={(edit, onSelectCondition) => {
          const preview = projectEditedConditions(conditions, edit);
          return (
            <CanvasSelectedJoinConditionTree
              selected={selected}
              conditions={preview}
              onSelectCondition={onSelectCondition}
            />
          );
        }}
        onAdd={(condition, groupWithPrevious) =>
          commit(appendDvtSubstraitJoinComparison({ conditions, condition, groupWithPrevious }))
        }
        onUpdate={(conditionKey, condition) =>
          commit(
            updateDvtSubstraitJoinComparison({ conditions, conditionKey, condition, operandKey })
          )
        }
        onRemove={(conditionKey) =>
          commit(removeDvtSubstraitJoinComparison({ conditions, conditionKey, operandKey }))
        }
      />
    </fieldset>
  );
}

function projectEditedConditions(
  conditions: readonly DvtSubstraitJoinPredicateCondition[],
  edit: Readonly<{
    conditionKey: string | null;
    condition: Comparison | null;
    groupWithPrevious: boolean;
  }> | null
) {
  if (edit == null) return conditions;
  if (edit.condition == null) return null;
  return edit.conditionKey == null
    ? appendDvtSubstraitJoinComparison({
        conditions,
        condition: edit.condition,
        groupWithPrevious: edit.groupWithPrevious,
      })
    : updateDvtSubstraitJoinComparison({
        conditions,
        condition: edit.condition,
        conditionKey: edit.conditionKey,
        operandKey,
      });
}
