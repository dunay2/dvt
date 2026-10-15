/**
Owned concern: present a controlled condition form using one operand component for both ports.
@baseline GH-3623: functions must remain reachable from the comparison editor.
@decision Render an injected action without owning drafts, compilation or persistence.
@consequence Formula and simple modes share their owner and authorization fences.
@version 1.0.0
 */
import { Braces, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { DvtSubstraitJoinDataType } from '@dvt/postgres-projection';
import { Button } from '../../../components/ui/button';
import { SemanticWorkbenchJoinOperandEditor } from '../SemanticWorkbenchJoinOperandEditor';
import {
  DVT_SUBSTRAIT_JOIN_PREDICATE_OPERATORS,
  DVT_SUBSTRAIT_JOIN_CONDITION_COMBINATIONS,
  isDvtSubstraitJoinNullOperator,
  type DvtSubstraitJoinPredicateOperator,
  type DvtSubstraitJoinConditionCombination,
} from '../canvasDvtSubstraitJoinCondition';
import {
  changeConditionDataType,
  type ConditionDraft,
  type ConditionFieldOption,
} from './conditionDraft';
import { COMPARISON_LABEL } from './conditionRows';
import styles from './JoinConditionForm.module.css';

export function JoinConditionForm({
  draft,
  fields,
  hasConditions,
  canApply,
  onChange,
  onClose,
  onSave,
  formulaAction,
}: Readonly<{
  draft: ConditionDraft;
  fields: readonly ConditionFieldOption[];
  hasConditions: boolean;
  canApply: boolean;
  onChange: (draft: ConditionDraft) => void;
  onClose: () => void;
  onSave: () => void;
  formulaAction?: ReactNode;
}>) {
  const fieldOptions = fields.filter((field) => field.dataType === draft.dataType);
  const dataTypes = [...new Set(fields.map((field) => field.dataType))];
  return (
    <div
      data-slot="semantic-workbench-join-condition-editor"
      className={styles.form}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || event.defaultPrevented) return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <div className={styles.header}>
        <span className={styles.title}>
          {draft.conditionKey == null ? 'NUEVA CONDICIÓN' : 'EDITAR CONDICIÓN'}
        </span>
        <select
          aria-label="Conector de la condición"
          hidden={!draft.combinationEditable}
          value={draft.combination}
          disabled={!draft.combinationEditable}
          className={styles.select}
          onChange={(event) =>
            onChange({
              ...draft,
              combination: event.currentTarget.value as DvtSubstraitJoinConditionCombination,
            })
          }
        >
          {DVT_SUBSTRAIT_JOIN_CONDITION_COMBINATIONS.map((value) => (
            <option key={value} value={value}>
              {value.toUpperCase()}
            </option>
          ))}
        </select>
        <label className={styles.dataType}>
          Tipo
          <select
            aria-label="Tipo de dato de la condición"
            value={draft.dataType}
            className={styles.select}
            onChange={(event) =>
              onChange(
                changeConditionDataType(
                  fields,
                  draft,
                  event.currentTarget.value as DvtSubstraitJoinDataType
                )
              )
            }
          >
            {dataTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Cerrar editor"
          title="Cerrar editor"
          onClick={onClose}
        >
          <X size={12} aria-hidden />
        </Button>
      </div>
      <div className={styles.operands}>
        <SemanticWorkbenchJoinOperandEditor
          side="izquierdo"
          operand={draft.left}
          dataType={draft.dataType}
          fields={fieldOptions}
          onChange={(left) => onChange({ ...draft, left })}
        />
        <label className={styles.comparison}>
          COMPARACIÓN
          <select
            aria-label="Comparador de la condición"
            value={draft.operator}
            className={styles.select}
            onChange={(event) =>
              onChange({
                ...draft,
                operator: event.currentTarget.value as DvtSubstraitJoinPredicateOperator,
              })
            }
          >
            {DVT_SUBSTRAIT_JOIN_PREDICATE_OPERATORS.map((operator) => (
              <option key={operator} value={operator}>
                {COMPARISON_LABEL[operator]}
              </option>
            ))}
          </select>
        </label>
        {isDvtSubstraitJoinNullOperator(draft.operator) ? null : (
          <SemanticWorkbenchJoinOperandEditor
            side="derecho"
            operand={draft.right}
            dataType={draft.dataType}
            fields={fieldOptions}
            onChange={(right) => onChange({ ...draft, right })}
          />
        )}
      </div>
      {draft.conditionKey != null || !hasConditions ? null : (
        <Button
          type="button"
          variant="outline"
          className={styles.groupAction}
          aria-pressed={draft.groupWithPrevious}
          title="Crea un grupo entre paréntesis con la condición anterior."
          onClick={() => onChange({ ...draft, groupWithPrevious: !draft.groupWithPrevious })}
        >
          <Braces size={12} aria-hidden />
          Agrupar con la condición anterior
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        className={styles.saveAction}
        disabled={!canApply}
        onClick={onSave}
      >
        {draft.conditionKey == null ? 'Añadir condición' : 'Guardar condición'}
      </Button>
      {formulaAction}
    </div>
  );
}
