/** One selected JOIN editor over the shared typed read model and atomic condition command. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { SelectedJoin } from './canvasSelectedJoin';
import { replaceSelectedJoinConditions } from './canvasSelectedJoinPredicate';
import { useRelationCommand } from './useRelationCommand';
import { SemanticWorkbenchJoinConditionEditor } from './SemanticWorkbenchJoinConditionEditor';
import { CanvasSelectedJoinConditionTree } from './CanvasSelectedJoinConditionTree';
import type { Dispatch, SetStateAction } from 'react';
import type { ConditionDraft } from './join-condition/conditionDraft';
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
}: Readonly<{
  selected: SelectedJoin;
  disabled: boolean;
  onChange: (document: SubstraitDocument) => void;
  draft: ConditionDraft | null;
  onDraftChange: Dispatch<SetStateAction<ConditionDraft | null>>;
}>) {
  const command = useRelationCommand(selected.relationId, onChange);
  const conditions = selected.conditions;
  const commit = (next: readonly DvtSubstraitJoinPredicateCondition[] | null) =>
    next == null
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
        <p role="status">Esta expresión no se puede editar con el formulario de condiciones.</p>
      </>
    );
  return (
    <fieldset
      disabled={disabled || command.state === 'busy'}
      className="min-h-0 border-0 p-0"
      data-slot="dvt-substrait-join-predicate-editors"
      data-relation-id={selected.relationId}
    >
      {command.state === 'error' ? (
        <p role="alert">No se pudo guardar la condición. Revisa sus operandos.</p>
      ) : null}
      <SemanticWorkbenchJoinConditionEditor
        key={selected.relationId}
        fields={selected.fields}
        conditions={conditions}
        draft={draft}
        onDraftChange={onDraftChange}
        renderExpression={(edit, onSelectCondition) => {
          const preview =
            edit == null
              ? conditions
              : edit.condition == null
                ? null
                : edit.conditionKey == null
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
