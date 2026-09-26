/** Ordered operand controls shared by every derived-output entry point. */
import { ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react';

export type DerivedOutputField = Readonly<{
  fieldId: string;
  name: string;
  dataType: string;
}>;

export function DerivedOutputOperands({
  fields,
  fieldIds,
  minimum,
  maximum,
  busy,
  copy,
  onChange,
}: Readonly<{
  fields: readonly DerivedOutputField[];
  fieldIds: readonly string[];
  minimum: number;
  maximum: number;
  busy: boolean;
  copy: Readonly<{
    operandsLabel: string;
    addOperand: string;
    removeOperand: string;
    moveOperandUp: string;
    moveOperandDown: string;
  }>;
  onChange: (fieldIds: readonly string[]) => void;
}>): JSX.Element {
  const move = (index: number, offset: -1 | 1) => {
    const next = [...fieldIds];
    [next[index], next[index + offset]] = [next[index + offset]!, next[index]!];
    onChange(next);
  };
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs text-(--text-muted)">{copy.operandsLabel}</legend>
      {fieldIds.map((fieldId, index) => (
        <div key={String(index)} data-slot="graph-node-expression-operand" className="flex gap-1">
          <select
            value={fieldId}
            disabled={busy}
            className="h-8 min-w-0 flex-1 rounded border border-(--border-subtle) bg-(--surface-panel) px-2 text-xs"
            onChange={(event) =>
              onChange(fieldIds.map((item, slot) => (slot === index ? event.target.value : item)))
            }
          >
            {fields.map((field) => (
              <option key={field.fieldId} value={field.fieldId}>
                {field.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            data-slot="graph-node-expression-move-up"
            aria-label={copy.moveOperandUp.replace('{index}', String(index + 1))}
            disabled={busy || index === 0}
            onClick={() => move(index, -1)}
            className="grid size-8 place-items-center rounded border border-(--border-subtle) disabled:opacity-40"
          >
            <ChevronUp className="size-3" />
          </button>
          <button
            type="button"
            data-slot="graph-node-expression-move-down"
            aria-label={copy.moveOperandDown.replace('{index}', String(index + 1))}
            disabled={busy || index === fieldIds.length - 1}
            onClick={() => move(index, 1)}
            className="grid size-8 place-items-center rounded border border-(--border-subtle) disabled:opacity-40"
          >
            <ChevronDown className="size-3" />
          </button>
          <button
            type="button"
            data-slot="graph-node-expression-remove"
            aria-label={copy.removeOperand.replace('{index}', String(index + 1))}
            disabled={busy || fieldIds.length <= minimum}
            onClick={() => onChange(fieldIds.filter((_, slot) => slot !== index))}
            className="grid size-8 place-items-center rounded border border-(--border-subtle) disabled:opacity-40"
          >
            <Minus className="size-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        data-slot="graph-node-expression-add-operand"
        disabled={busy || fieldIds.length >= maximum}
        onClick={() =>
          onChange([
            ...fieldIds,
            (fields.find((field) => !fieldIds.includes(field.fieldId)) ?? fields[0])!.fieldId,
          ])
        }
        className="flex items-center gap-1 text-xs text-(--status-info) disabled:opacity-40"
      >
        <Plus className="size-3" />
        {copy.addOperand}
      </button>
    </fieldset>
  );
}
