import { X } from 'lucide-react';

import type { DvtSubstraitJoinUnaryFunction } from '../canvasDvtSubstraitJoinOperand';

import { selectStyle } from './operandStyles';

export function JoinOperandFunctionChain(props: {
  functionIds: readonly string[];
  functions: readonly DvtSubstraitJoinUnaryFunction[];
  onChange: (functionIds: readonly string[]) => void;
  baseLabel: string;
  side: 'izquierdo' | 'derecho';
}) {
  const nameById = new Map(
    props.functions.map((capability) => [capability.capabilityId, capability.name] as const)
  );
  return (
    <div style={{ marginTop: 7 }}>
      <div className="text-[10px] text-(--text-muted)">Resultado del operando {props.side}</div>
      <div data-slot="semantic-operand-function-tree" className="my-2 border-l border-cyan-800">
        {[...props.functionIds].reverse().map((capabilityId, outerIndex) => {
          const index = props.functionIds.length - outerIndex - 1;
          return (
            <div
              key={`${capabilityId}-${index}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 4,
                marginLeft: outerIndex * 16 + 8,
                border: '1px solid #155e75',
                borderRadius: 5,
                background: '#082f49',
                padding: '5px 7px',
                color: '#67e8f9',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 11,
              }}
            >
              <span>{(nameById.get(capabilityId) ?? capabilityId).toUpperCase()}(</span>
              <button
                type="button"
                title="Retirar esta función"
                aria-label={`Retirar función ${index + 1}`}
                onClick={() =>
                  props.onChange(props.functionIds.filter((_, item) => item !== index))
                }
                style={{ border: 0, background: 'transparent', padding: 0, color: '#67e8f9' }}
              >
                <X aria-hidden="true" size={11} />
              </button>
            </div>
          );
        })}
        <div
          data-slot="semantic-operand-function-leaf"
          className="border-l border-cyan-800 px-2 py-1 font-mono text-[11px] text-sky-200"
          style={{ marginLeft: props.functionIds.length * 16 + 8 }}
        >
          {props.baseLabel}
        </div>
        {[...props.functionIds].reverse().map((capabilityId, index) => (
          <div
            key={`${capabilityId}-${index}`}
            aria-hidden="true"
            className="font-mono text-[11px] text-cyan-300"
            style={{ marginLeft: (props.functionIds.length - index - 1) * 16 + 8 }}
          >
            )
          </div>
        ))}
      </div>
      <select
        aria-label={`Añadir función exterior al operando ${props.side}`}
        value=""
        disabled={props.functions.length === 0}
        onChange={(event) => {
          if (event.currentTarget.value.length === 0) return;
          props.onChange([...props.functionIds, event.currentTarget.value]);
        }}
        style={{ ...selectStyle, marginTop: 5, color: '#34d399' }}
      >
        <option value="">
          {props.functions.length === 0
            ? 'Sin funciones compatibles'
            : `Envolver operando ${props.side} con…`}
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
