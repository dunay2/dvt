import { Braces, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import type {
  DvtSubstraitJoinDataType,
  DvtSubstraitNInputJoinProjection,
} from './canvasDvtSubstraitJoinComposition';
import {
  DVT_SUBSTRAIT_JOIN_PREDICATE_OPERATORS,
  DVT_SUBSTRAIT_JOIN_CONDITION_COMBINATIONS,
  dvtSubstraitJoinConditionKey,
  isDvtSubstraitJoinConditionGroup,
  isDvtSubstraitJoinNullCondition,
  isDvtSubstraitJoinNullOperator,
  type DvtSubstraitJoinComparisonCondition,
  type DvtSubstraitJoinPredicateOperator,
  type DvtSubstraitJoinConditionCombination,
  type DvtSubstraitJoinPredicateCondition,
} from './canvasDvtSubstraitJoinCondition';
import {
  dvtSubstraitJoinOperandKey,
  resolveDvtSubstraitJoinOperandDataType,
  resolveDvtSubstraitJoinUnaryFunctions,
  type DvtSubstraitJoinPredicateOperand,
} from './canvasDvtSubstraitJoinOperand';
import {
  SemanticWorkbenchJoinOperandEditor,
  buildSemanticWorkbenchJoinOperand,
  defaultSemanticWorkbenchJoinLiteralValue,
  type SemanticWorkbenchJoinFieldOption,
  type SemanticWorkbenchJoinOperandDraft,
} from './SemanticWorkbenchJoinOperandEditor';

const border = '#263b5c';
const panel = '#09111f';
const muted = '#94a3b8';
const accent = '#7dd3fc';
const COMPARISON_LABEL: Readonly<Record<DvtSubstraitJoinPredicateOperator, string>> = {
  equal: '=',
  not_equal: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  is_null: 'IS NULL',
  is_not_null: 'IS NOT NULL',
};
const SELECT_STYLE = {
  width: '100%',
  boxSizing: 'border-box',
  marginTop: 7,
  border: '1px solid #0f766e',
  borderRadius: 6,
  background: '#05090f',
  padding: '8px 9px',
  color: '#34d399',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: 11,
} as const;

type ConditionFieldOption = SemanticWorkbenchJoinFieldOption & Readonly<{ inputIndex: number }>;
type ConditionDraft = Readonly<{
  conditionKey: string | null;
  dataType: DvtSubstraitJoinDataType;
  left: SemanticWorkbenchJoinOperandDraft;
  right: SemanticWorkbenchJoinOperandDraft;
  operator: DvtSubstraitJoinPredicateOperator;
  combination: DvtSubstraitJoinConditionCombination;
  combinationEditable: boolean;
  groupWithPrevious: boolean;
}>;

export type SemanticWorkbenchJoinConditionRow =
  | Readonly<{ kind: 'group-open' | 'group-close'; depth: number; label: string }>
  | Readonly<{
      kind: 'comparison';
      depth: number;
      label: string;
      conditionKey: string;
      condition: DvtSubstraitJoinComparisonCondition<DvtSubstraitJoinPredicateOperand>;
      combinationEditable: boolean;
    }>;

const predicateOperandKey = (operand: DvtSubstraitJoinPredicateOperand) =>
  dvtSubstraitJoinOperandKey(operand, (field) => field.sourceFieldId);

function literalText(operand: Extract<DvtSubstraitJoinPredicateOperand, { kind: 'literal' }>) {
  return operand.literal.dataType === 'string'
    ? `'${operand.literal.value}'`
    : String(operand.literal.value);
}

function operandText(
  operand: DvtSubstraitJoinPredicateOperand,
  fieldLabelById: ReadonlyMap<string, string>,
  functionNameById: ReadonlyMap<string, string>
): string {
  if (operand.kind === 'field') {
    return fieldLabelById.get(operand.sourceFieldId) ?? operand.sourceFieldId;
  }
  if (operand.kind === 'literal') return literalText(operand);
  const name = functionNameById.get(operand.capabilityId) ?? operand.capabilityId;
  return `${name.toUpperCase()}(${operandText(operand.input, fieldLabelById, functionNameById)})`;
}

export function projectSemanticWorkbenchJoinConditionRows(args: {
  conditions: readonly DvtSubstraitJoinPredicateCondition[];
  fieldLabelById: ReadonlyMap<string, string>;
  functionNameById?: ReadonlyMap<string, string>;
}): readonly SemanticWorkbenchJoinConditionRow[] {
  const rows: SemanticWorkbenchJoinConditionRow[] = [];
  const functionNameById = args.functionNameById ?? new Map<string, string>();
  const visit = (
    condition: DvtSubstraitJoinPredicateCondition,
    depth: number,
    showCombination: boolean
  ) => {
    const combination = condition.combination ?? 'and';
    if (isDvtSubstraitJoinConditionGroup(condition)) {
      rows.push({
        kind: 'group-open',
        depth,
        label: `${showCombination ? `${combination.toUpperCase()} ` : ''}(`,
      });
      condition.conditions.forEach((child, index) => visit(child, depth + 1, index > 0));
      rows.push({ kind: 'group-close', depth, label: ')' });
      return;
    }
    rows.push({
      kind: 'comparison',
      depth,
      label: `${showCombination ? `${combination.toUpperCase()} ` : ''}${operandText(
        condition.left,
        args.fieldLabelById,
        functionNameById
      )} ${COMPARISON_LABEL[condition.operator ?? 'equal']}${
        isDvtSubstraitJoinNullCondition(condition)
          ? ''
          : ` ${operandText(condition.right, args.fieldLabelById, functionNameById)}`
      }`,
      conditionKey: dvtSubstraitJoinConditionKey(condition, predicateOperandKey),
      condition,
      combinationEditable: showCombination,
    });
  };
  args.conditions.forEach((condition, index) => visit(condition, 0, index > 0));
  return rows;
}

function rawLiteralValue(operand: Extract<DvtSubstraitJoinPredicateOperand, { kind: 'literal' }>) {
  return String(operand.literal.value);
}

function operandDraft(
  operand: DvtSubstraitJoinPredicateOperand,
  fallbackFieldId: string
): SemanticWorkbenchJoinOperandDraft {
  const functionIds: string[] = [];
  let base = operand;
  while (base.kind === 'function') {
    functionIds.unshift(base.capabilityId);
    base = base.input;
  }
  return base.kind === 'field'
    ? { kind: 'field', fieldId: base.sourceFieldId, rawValue: '', functionIds }
    : {
        kind: 'literal',
        fieldId: fallbackFieldId,
        rawValue: rawLiteralValue(base),
        functionIds,
      };
}

function IconAction(props: { label: string; children: ReactNode; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={props.label}
          title={props.label}
          onClick={props.onClick}
          style={{
            display: 'grid',
            width: 26,
            height: 26,
            flex: '0 0 26px',
            placeItems: 'center',
            border: `1px solid ${border}`,
            borderRadius: 6,
            background: panel,
            color: accent,
            cursor: 'pointer',
          }}
        >
          {props.children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{props.label}</TooltipContent>
    </Tooltip>
  );
}

export function SemanticWorkbenchJoinConditionEditor(props: {
  onEditingChange?: (editing: boolean) => void;
  projection: DvtSubstraitNInputJoinProjection;
  rightInputIndex: number;
  conditions: readonly DvtSubstraitJoinPredicateCondition[];
  onAdd: (
    condition: DvtSubstraitJoinComparisonCondition<DvtSubstraitJoinPredicateOperand>,
    groupWithPrevious: boolean
  ) => void;
  onUpdate: (
    conditionKey: string,
    condition: DvtSubstraitJoinComparisonCondition<DvtSubstraitJoinPredicateOperand>
  ) => void;
  onRemove: (conditionKey: string) => void;
}) {
  const [conditionDraft, setConditionDraft] = useState<ConditionDraft | null>(null);
  const editingCallback = useRef(props.onEditingChange);
  editingCallback.current = props.onEditingChange;
  const editing = conditionDraft != null;
  useEffect(() => {
    editingCallback.current?.(editing);
    return () => editingCallback.current?.(false);
  }, [editing]);
  const fields = useMemo<readonly ConditionFieldOption[]>(
    () =>
      props.projection.inputs.slice(0, props.rightInputIndex + 1).flatMap((input, inputIndex) =>
        input.fields.map((field) => ({
          fieldId: field.fieldId,
          label: `${input.schema}.${input.table}.${field.name}`,
          dataType: field.dataType,
          inputIndex,
        }))
      ),
    [props.projection.inputs, props.rightInputIndex]
  );
  const fieldById = useMemo(
    () => new Map(fields.map((field) => [field.fieldId, field] as const)),
    [fields]
  );
  const dataTypes = useMemo(
    () => Array.from(new Set(fields.map((field) => field.dataType))),
    [fields]
  );
  const functionNameById = useMemo(
    () => new Map(dataTypes.flatMap(mapDataTypeToFunctionEntries)),
    [dataTypes]
  );
  const rows = useMemo(
    () =>
      projectSemanticWorkbenchJoinConditionRows({
        conditions: props.conditions,
        fieldLabelById: new Map(fields.map((field) => [field.fieldId, field.label] as const)),
        functionNameById,
      }),
    [fields, functionNameById, props.conditions]
  );
  const fieldOptions =
    conditionDraft == null
      ? []
      : fields.filter((field) => field.dataType === conditionDraft.dataType);
  const functions =
    conditionDraft == null
      ? []
      : resolveDvtSubstraitJoinUnaryFunctions({
          dataType: conditionDraft.dataType,
          provider: 'postgres',
        });
  const leftOperand =
    conditionDraft == null
      ? null
      : buildSemanticWorkbenchJoinOperand({
          draft: conditionDraft.left,
          dataType: conditionDraft.dataType,
        });
  const rightOperand =
    conditionDraft == null
      ? null
      : buildSemanticWorkbenchJoinOperand({
          draft: conditionDraft.right,
          dataType: conditionDraft.dataType,
        });

  const unary = conditionDraft != null && isDvtSubstraitJoinNullOperator(conditionDraft.operator);
  const canApply = leftOperand != null && (unary || rightOperand != null);

  const startNewCondition = () => {
    const left = fields[0];
    if (left == null) return;
    const right =
      fields.find(
        (field) => field.inputIndex !== left.inputIndex && field.dataType === left.dataType
      ) ??
      fields.find((field) => field.fieldId !== left.fieldId && field.dataType === left.dataType);
    setConditionDraft({
      conditionKey: null,
      dataType: left.dataType,
      left: { kind: 'field', fieldId: left.fieldId, rawValue: '', functionIds: [] },
      right: {
        kind: right == null ? 'literal' : 'field',
        fieldId: right?.fieldId ?? left.fieldId,
        rawValue: defaultSemanticWorkbenchJoinLiteralValue(left.dataType),
        functionIds: [],
      },
      operator: 'equal',
      combination: 'and',
      combinationEditable: true,
      groupWithPrevious: false,
    });
  };

  const editCondition = (
    row: Extract<SemanticWorkbenchJoinConditionRow, { kind: 'comparison' }>
  ) => {
    const dataType = resolveDvtSubstraitJoinOperandDataType(
      row.condition.left,
      (field) => fieldById.get(field.sourceFieldId)?.dataType ?? null
    );
    const rightDataType = isDvtSubstraitJoinNullCondition(row.condition)
      ? dataType
      : resolveDvtSubstraitJoinOperandDataType(
          row.condition.right,
          (field) => fieldById.get(field.sourceFieldId)?.dataType ?? null
        );
    const fallback = fields.find((field) => field.dataType === dataType);
    if (dataType == null || dataType !== rightDataType || fallback == null) return;
    setConditionDraft({
      conditionKey: row.conditionKey,
      dataType,
      left: operandDraft(row.condition.left, fallback.fieldId),
      right: isDvtSubstraitJoinNullCondition(row.condition)
        ? {
            kind: 'literal',
            fieldId: fallback.fieldId,
            rawValue: defaultSemanticWorkbenchJoinLiteralValue(dataType),
            functionIds: [],
          }
        : operandDraft(row.condition.right, fallback.fieldId),
      operator: row.condition.operator ?? 'equal',
      combination: row.condition.combination ?? 'and',
      combinationEditable: row.combinationEditable,
      groupWithPrevious: false,
    });
  };

  return (
    <div data-slot="semantic-workbench-join-condition-list" style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: muted, fontSize: 11, fontWeight: 700 }}>CONDICIONES DEL JOIN</span>
        <IconAction label="Añadir condición" onClick={startNewCondition}>
          <Plus aria-hidden="true" size={13} />
        </IconAction>
      </div>
      {rows.length === 0 ? (
        <div style={{ marginTop: 7, color: muted, fontSize: 11 }}>Sin condiciones.</div>
      ) : (
        <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
          {rows.map((row, index) =>
            row.kind === 'comparison' ? (
              <div
                key={`${row.conditionKey}-${index}`}
                data-slot="semantic-workbench-join-condition-row"
                hidden={conditionDraft?.conditionKey === row.conditionKey}
                style={{
                  display: conditionDraft?.conditionKey === row.conditionKey ? 'none' : 'flex',
                  alignItems: 'center',
                  gap: 5,
                  marginLeft: row.depth * 12,
                  border: '1px solid #164e63',
                  borderRadius: 6,
                  background: '#071827',
                  padding: '6px 7px',
                }}
              >
                <span
                  style={{
                    minWidth: 0,
                    flex: 1,
                    overflowWrap: 'anywhere',
                    color: '#d1fae5',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 11,
                  }}
                >
                  {row.label}
                </span>
                <IconAction label="Editar condición" onClick={() => editCondition(row)}>
                  <Pencil aria-hidden="true" size={11} />
                </IconAction>
                {rows.filter((item) => item.kind === 'comparison').length > 1 ? (
                  <IconAction
                    label="Eliminar condición"
                    onClick={() => {
                      props.onRemove(row.conditionKey);
                      setConditionDraft((current) =>
                        current?.conditionKey === row.conditionKey ? null : current
                      );
                    }}
                  >
                    <Trash2 aria-hidden="true" size={11} />
                  </IconAction>
                ) : null}
              </div>
            ) : (
              <div
                key={`${row.kind}-${row.depth}-${index}`}
                style={{
                  marginLeft: row.depth * 12,
                  color: '#34d399',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {row.label}
              </div>
            )
          )}
        </div>
      )}
      {conditionDraft == null ? null : (
        <div
          data-slot="semantic-workbench-join-condition-editor"
          className="@container"
          onKeyDown={(event) => {
            if (event.key !== 'Escape' || event.defaultPrevented) return;
            event.preventDefault();
            event.stopPropagation();
            setConditionDraft(null);
          }}
          style={{
            marginTop: 8,
            border: '1px solid #0f766e',
            borderRadius: 8,
            background: '#071827',
            padding: 9,
          }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="mr-auto" style={{ color: '#34d399', fontSize: 11, fontWeight: 700 }}>
              {conditionDraft.conditionKey == null ? 'NUEVA CONDICIÓN' : 'EDITAR CONDICIÓN'}
            </span>
            <select
              aria-label="Conector de la condición"
              hidden={!conditionDraft.combinationEditable}
              value={conditionDraft.combination}
              disabled={!conditionDraft.combinationEditable}
              title={
                conditionDraft.combinationEditable
                  ? 'Conector booleano con la condición anterior.'
                  : 'La primera condición no tiene conector anterior.'
              }
              style={{ ...SELECT_STYLE, width: 'auto', marginTop: 0 }}
              onChange={(event) =>
                setConditionDraft({
                  ...conditionDraft,
                  combination: event.currentTarget.value as DvtSubstraitJoinConditionCombination,
                })
              }
            >
              {DVT_SUBSTRAIT_JOIN_CONDITION_COMBINATIONS.map((combination) => (
                <option key={combination} value={combination}>
                  {combination.toUpperCase()}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2" style={{ color: muted, fontSize: 11 }}>
              Tipo
              <select
                aria-label="Tipo de dato de la condición"
                value={conditionDraft.dataType}
                style={{ ...SELECT_STYLE, width: 'auto', marginTop: 0 }}
                onChange={(event) => {
                  const dataType = event.currentTarget.value as DvtSubstraitJoinDataType;
                  const compatible = fields.filter((field) => field.dataType === dataType);
                  const left = compatible[0];
                  if (left == null) return;
                  const right =
                    compatible.find((field) => field.inputIndex !== left.inputIndex) ??
                    compatible[1];
                  setConditionDraft({
                    ...conditionDraft,
                    dataType,
                    left: { kind: 'field', fieldId: left.fieldId, rawValue: '', functionIds: [] },
                    right: {
                      kind: right == null ? 'literal' : 'field',
                      fieldId: right?.fieldId ?? left.fieldId,
                      rawValue: defaultSemanticWorkbenchJoinLiteralValue(dataType),
                      functionIds: [],
                    },
                  });
                }}
              >
                {dataTypes.map((dataType) => (
                  <option key={dataType} value={dataType}>
                    {dataType}
                  </option>
                ))}
              </select>
            </label>
            <IconAction label="Cerrar editor" onClick={() => setConditionDraft(null)}>
              <X aria-hidden="true" size={11} />
            </IconAction>
          </div>
          <div className="grid grid-cols-1 gap-3 @min-[40rem]:grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)]">
            <SemanticWorkbenchJoinOperandEditor
              side="izquierdo"
              operand={conditionDraft.left}
              dataType={conditionDraft.dataType}
              fields={fieldOptions}
              functions={functions}
              onChange={(left) => setConditionDraft({ ...conditionDraft, left })}
            />
            <label style={{ display: 'block', marginTop: 8, color: muted, fontSize: 11 }}>
              COMPARACIÓN
              <select
                aria-label="Comparador de la condición"
                value={conditionDraft.operator}
                style={SELECT_STYLE}
                onChange={(event) =>
                  setConditionDraft({
                    ...conditionDraft,
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
            {unary ? null : (
              <SemanticWorkbenchJoinOperandEditor
                side="derecho"
                operand={conditionDraft.right}
                dataType={conditionDraft.dataType}
                fields={fieldOptions}
                functions={functions}
                onChange={(right) => setConditionDraft({ ...conditionDraft, right })}
              />
            )}
          </div>
          {conditionDraft.conditionKey != null || props.conditions.length === 0 ? null : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-pressed={conditionDraft.groupWithPrevious}
                  onClick={() =>
                    setConditionDraft({
                      ...conditionDraft,
                      groupWithPrevious: !conditionDraft.groupWithPrevious,
                    })
                  }
                  style={{
                    display: 'flex',
                    width: '100%',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 8,
                    border: `1px solid ${conditionDraft.groupWithPrevious ? '#10b981' : border}`,
                    borderRadius: 6,
                    background: conditionDraft.groupWithPrevious ? '#064e3b' : panel,
                    padding: '7px 9px',
                    color: conditionDraft.groupWithPrevious ? '#d1fae5' : muted,
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  <Braces aria-hidden="true" size={12} />
                  Agrupar con la condición anterior
                </button>
              </TooltipTrigger>
              <TooltipContent>
                Crea un grupo entre paréntesis con la condición anterior.
              </TooltipContent>
            </Tooltip>
          )}
          <button
            type="button"
            disabled={!canApply}
            onClick={() => {
              if (leftOperand == null) return;
              const condition: DvtSubstraitJoinComparisonCondition<DvtSubstraitJoinPredicateOperand> | null =
                isDvtSubstraitJoinNullOperator(conditionDraft.operator)
                  ? {
                      left: leftOperand,
                      operator: conditionDraft.operator,
                      combination: conditionDraft.combination,
                    }
                  : rightOperand == null
                    ? null
                    : {
                        left: leftOperand,
                        right: rightOperand,
                        operator: conditionDraft.operator,
                        combination: conditionDraft.combination,
                      };
              if (condition == null) return;
              if (conditionDraft.conditionKey == null) {
                props.onAdd(condition, conditionDraft.groupWithPrevious);
              } else {
                props.onUpdate(conditionDraft.conditionKey, condition);
              }
              setConditionDraft(null);
            }}
            style={{
              width: 'auto',
              marginTop: 7,
              border: '1px solid #0f766e',
              borderRadius: 6,
              background: !canApply ? '#111827' : '#064e3b',
              padding: '8px 9px',
              color: !canApply ? '#64748b' : '#d1fae5',
              cursor: !canApply ? 'not-allowed' : 'pointer',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {conditionDraft.conditionKey == null ? 'Añadir condición' : 'Guardar condición'}
          </button>
        </div>
      )}
    </div>
  );
}

function mapDataTypeToFunctionEntries(dataType: DvtSubstraitJoinDataType) {
  return resolveDvtSubstraitJoinUnaryFunctions({ dataType, provider: 'postgres' }).map(
    (capability) => [capability.capabilityId, capability.name] as const
  );
}
