import type { DvtSubstraitJoinDataType } from '@dvt/postgres-projection';
import type { DvtSubstraitJoinUnaryFunction } from './canvasDvtSubstraitJoinOperand';
import { JoinOperandFunctionChain } from './join-condition/JoinOperandFunctionChain';
import { selectStyle } from './join-condition/operandStyles';
import {
  defaultSemanticWorkbenchJoinLiteralValue,
  type SemanticWorkbenchJoinOperandDraft,
  type SemanticWorkbenchJoinFieldOption,
} from './join-condition/operandDraft';
export function SemanticWorkbenchJoinOperandEditor(props: {
  side: 'izquierdo' | 'derecho';
  operand: SemanticWorkbenchJoinOperandDraft;
  dataType: DvtSubstraitJoinDataType;
  fields: readonly SemanticWorkbenchJoinFieldOption[];
  functions: readonly DvtSubstraitJoinUnaryFunction[];
  onChange: (operand: SemanticWorkbenchJoinOperandDraft) => void;
}) {
  return (
    <div data-slot={`semantic-workbench-join-${props.side}-operand`} style={{ marginTop: 9 }}>
      <div style={{ color: '#94a3b8', fontSize: 9, fontWeight: 700 }}>
        OPERANDO {props.side.toUpperCase()}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '86px minmax(0, 1fr)',
          gap: 6,
          marginTop: 5,
        }}
      >
        <select
          aria-label={`Tipo del operando ${props.side}`}
          value={props.operand.kind}
          onChange={(event) =>
            props.onChange({
              ...props.operand,
              kind: event.currentTarget.value as 'field' | 'literal',
              rawValue:
                event.currentTarget.value === 'literal' && props.operand.rawValue.length === 0
                  ? defaultSemanticWorkbenchJoinLiteralValue(props.dataType)
                  : props.operand.rawValue,
            })
          }
          style={selectStyle}
        >
          <option value="field">FIELD</option>
          <option value="literal">VALUE</option>
        </select>
        {props.operand.kind === 'field' ? (
          <select
            aria-label={`Campo del operando ${props.side}`}
            value={props.operand.fieldId}
            onChange={(event) =>
              props.onChange({ ...props.operand, fieldId: event.currentTarget.value })
            }
            style={selectStyle}
          >
            {props.fields.map((option) => (
              <option key={option.fieldId} value={option.fieldId}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            aria-label={`Valor literal del operando ${props.side}`}
            title={`Literal tipado como ${props.dataType}.`}
            value={props.operand.rawValue}
            onChange={(event) =>
              props.onChange({ ...props.operand, rawValue: event.currentTarget.value })
            }
            placeholder={`VALUE · ${props.dataType}`}
            style={selectStyle}
          />
        )}
      </div>
      <details className="mt-2" open={props.operand.functionIds.length > 0 ? true : undefined}>
        <summary className="cursor-pointer text-[10px] text-(--text-muted)">
          Funciones
          {props.operand.functionIds.length > 0 ? ` (${props.operand.functionIds.length})` : ''}
        </summary>
        <JoinOperandFunctionChain
          side={props.side}
          baseLabel={
            props.operand.kind === 'field'
              ? (props.fields.find((field) => field.fieldId === props.operand.fieldId)?.label ??
                props.operand.fieldId)
              : `${props.dataType} ${JSON.stringify(props.operand.rawValue)}`
          }
          functionIds={props.operand.functionIds}
          functions={props.functions}
          onChange={(functionIds) => props.onChange({ ...props.operand, functionIds })}
        />
      </details>
    </div>
  );
}
