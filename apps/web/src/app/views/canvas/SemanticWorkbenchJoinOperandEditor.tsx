import { X } from 'lucide-react';

import type {
  DvtSubstraitJoinDataType,
  DvtSubstraitJoinPredicateOperand,
} from './canvasDvtSubstraitJoinComposition';
import type { DvtSubstraitJoinUnaryFunction } from './canvasDvtSubstraitJoinOperand';

const selectStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #245f88',
  borderRadius: 6,
  background: '#05090f',
  padding: '8px 9px',
  color: '#7dd3fc',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: 9,
} as const;

export type SemanticWorkbenchJoinOperandDraft = Readonly<{
  kind: 'field' | 'literal';
  fieldId: string;
  rawValue: string;
  functionIds: readonly string[];
}>;

export type SemanticWorkbenchJoinFieldOption = Readonly<{
  fieldId: string;
  label: string;
  dataType: DvtSubstraitJoinDataType;
}>;

export function defaultSemanticWorkbenchJoinLiteralValue(
  dataType: DvtSubstraitJoinDataType
): string {
  return dataType === 'bool' ? 'true' : '';
}

function parseJoinLiteral(
  dataType: DvtSubstraitJoinDataType,
  rawValue: string
): DvtSubstraitJoinPredicateOperand | null {
  if (dataType === 'string') {
    return { kind: 'literal', literal: { dataType: 'string', value: rawValue } };
  }
  if (dataType === 'bool') {
    return rawValue === 'true' || rawValue === 'false'
      ? { kind: 'literal', literal: { dataType: 'bool', value: rawValue === 'true' } }
      : null;
  }
  if (dataType === 'i64') {
    return /^-?\d+$/.test(rawValue)
      ? { kind: 'literal', literal: { dataType: 'i64', value: BigInt(rawValue) } }
      : null;
  }
  if (dataType === 'fp64') {
    const value = Number(rawValue);
    return rawValue.trim().length > 0 && Number.isFinite(value)
      ? { kind: 'literal', literal: { dataType: 'fp64', value } }
      : null;
  }
  const milliseconds = Date.parse(rawValue);
  return Number.isFinite(milliseconds)
    ? {
        kind: 'literal',
        literal: {
          dataType: 'precisionTimestampTz',
          value: new Date(milliseconds).toISOString(),
        },
      }
    : null;
}

export function buildSemanticWorkbenchJoinOperand(args: {
  draft: SemanticWorkbenchJoinOperandDraft;
  dataType: DvtSubstraitJoinDataType;
}): DvtSubstraitJoinPredicateOperand | null {
  const base: DvtSubstraitJoinPredicateOperand | null =
    args.draft.kind === 'field'
      ? { kind: 'field', sourceFieldId: args.draft.fieldId }
      : parseJoinLiteral(args.dataType, args.draft.rawValue);
  return base == null
    ? null
    : args.draft.functionIds.reduce<DvtSubstraitJoinPredicateOperand>(
        (input, capabilityId) => ({ kind: 'function', capabilityId, input }),
        base
      );
}

function JoinOperandFunctionChain(props: {
  functionIds: readonly string[];
  functions: readonly DvtSubstraitJoinUnaryFunction[];
  onChange: (functionIds: readonly string[]) => void;
}) {
  const nameById = new Map(
    props.functions.map((capability) => [capability.capabilityId, capability.name] as const)
  );
  return (
    <div style={{ marginTop: 7 }}>
      <div style={{ color: '#94a3b8', fontSize: 8 }}>FUNCIONES · INTERIOR → EXTERIOR</div>
      {props.functionIds.map((capabilityId, index) => (
        <div
          key={`${capabilityId}-${index}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 4,
            border: '1px solid #155e75',
            borderRadius: 5,
            background: '#082f49',
            padding: '5px 7px',
            color: '#67e8f9',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 8,
          }}
        >
          <span>
            {index + 1}. {(nameById.get(capabilityId) ?? capabilityId).toUpperCase()}
          </span>
          <button
            type="button"
            title="Retirar esta función"
            aria-label={`Retirar función ${index + 1}`}
            onClick={() => props.onChange(props.functionIds.filter((_, item) => item !== index))}
            style={{ border: 0, background: 'transparent', padding: 0, color: '#67e8f9' }}
          >
            <X aria-hidden="true" size={11} />
          </button>
        </div>
      ))}
      <select
        aria-label="Añadir función exterior al operando"
        value=""
        disabled={props.functions.length === 0}
        onChange={(event) => {
          if (event.currentTarget.value.length === 0) return;
          props.onChange([...props.functionIds, event.currentTarget.value]);
        }}
        style={{ ...selectStyle, marginTop: 5, color: '#34d399' }}
      >
        <option value="">
          {props.functions.length === 0 ? 'Sin funciones compatibles' : '+ Añadir función exterior'}
        </option>
        {props.functions.map((capability) => (
          <option key={capability.capabilityId} value={capability.capabilityId}>
            {capability.name.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
}

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
      <JoinOperandFunctionChain
        functionIds={props.operand.functionIds}
        functions={props.functions}
        onChange={(functionIds) => props.onChange({ ...props.operand, functionIds })}
      />
    </div>
  );
}
