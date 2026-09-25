/** Controlled condition form; the same operand component serves both input ports. */
import { Braces, X } from 'lucide-react';
import type { DvtSubstraitJoinDataType } from '@dvt/postgres-projection';
import { Button } from '../../../components/ui/button';
import { SemanticWorkbenchJoinOperandEditor } from '../SemanticWorkbenchJoinOperandEditor';
import { resolveDvtSubstraitJoinUnaryFunctions } from '../canvasDvtSubstraitJoinOperand';
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

const selectClass =
  'mt-1 w-full rounded border border-teal-700 bg-(--surface-subtle) p-2 font-mono text-xs text-emerald-300';

export function JoinConditionForm({
  draft,
  fields,
  hasConditions,
  canApply,
  onChange,
  onClose,
  onSave,
}: Readonly<{
  draft: ConditionDraft;
  fields: readonly ConditionFieldOption[];
  hasConditions: boolean;
  canApply: boolean;
  onChange: (draft: ConditionDraft) => void;
  onClose: () => void;
  onSave: () => void;
}>) {
  const fieldOptions = fields.filter((field) => field.dataType === draft.dataType);
  const functions = resolveDvtSubstraitJoinUnaryFunctions({
    dataType: draft.dataType,
    provider: 'postgres',
  });
  const dataTypes = [...new Set(fields.map((field) => field.dataType))];
  return (
    <div
      data-slot="semantic-workbench-join-condition-editor"
      className="@container mt-2 rounded-lg border border-teal-700 bg-(--surface-subtle) p-2"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || event.defaultPrevented) return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="mr-auto font-semibold text-emerald-300">
          {draft.conditionKey == null ? 'NUEVA CONDICIÓN' : 'EDITAR CONDICIÓN'}
        </span>
        <select
          aria-label="Conector de la condición"
          hidden={!draft.combinationEditable}
          value={draft.combination}
          disabled={!draft.combinationEditable}
          className={selectClass}
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
        <label className="flex items-center gap-2 text-(--text-muted)">
          Tipo
          <select
            aria-label="Tipo de dato de la condición"
            value={draft.dataType}
            className={selectClass}
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
      <div className="grid grid-cols-1 gap-3 @min-[40rem]:grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)]">
        <SemanticWorkbenchJoinOperandEditor
          side="izquierdo"
          operand={draft.left}
          dataType={draft.dataType}
          fields={fieldOptions}
          functions={functions}
          onChange={(left) => onChange({ ...draft, left })}
        />
        <label className="mt-2 block text-xs text-(--text-muted)">
          COMPARACIÓN
          <select
            aria-label="Comparador de la condición"
            value={draft.operator}
            className={selectClass}
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
            functions={functions}
            onChange={(right) => onChange({ ...draft, right })}
          />
        )}
      </div>
      {draft.conditionKey != null || !hasConditions ? null : (
        <Button
          type="button"
          variant="outline"
          className="mt-2 w-full"
          aria-pressed={draft.groupWithPrevious}
          title="Crea un grupo entre paréntesis con la condición anterior."
          onClick={() => onChange({ ...draft, groupWithPrevious: !draft.groupWithPrevious })}
        >
          <Braces size={12} aria-hidden />
          Agrupar con la condición anterior
        </Button>
      )}
      <Button type="button" size="sm" className="mt-2" disabled={!canApply} onClick={onSave}>
        {draft.conditionKey == null ? 'Añadir condición' : 'Guardar condición'}
      </Button>
    </div>
  );
}
