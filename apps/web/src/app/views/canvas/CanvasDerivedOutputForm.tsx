/** Explicit list-mode authoring of one scalar output; no document writes occur before submit. */
import { DvtSemanticFieldNameV1Schema } from '@dvt/contracts';
import {
  admitsCompleteArgumentCount,
  resolveDvtSubstraitColumnFunctions,
} from '@dvt/postgres-projection';
import { Minus, Plus } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import type { CanvasDerivedOutputField } from './useCanvasDerivedOutputAuthoring';

type Request = Readonly<{
  alias: string;
  capabilityId: string;
  operandFieldIds: readonly [string, ...string[]];
}>;

function normalizeOperands(
  current: readonly string[],
  fields: readonly CanvasDerivedOutputField[],
  minimum: number,
  maximum: number
): string[] {
  const available = new Set(fields.map((field) => field.fieldId));
  const next = current.filter((fieldId) => available.has(fieldId)).slice(0, maximum);
  while (next.length < minimum && fields.length > 0)
    next.push(fields[next.length % fields.length]!.fieldId);
  return next;
}

export function CanvasDerivedOutputForm({
  fields,
  provider,
  busy,
  copy,
  onCancel,
  onSubmit,
}: Readonly<{
  fields: readonly CanvasDerivedOutputField[];
  provider: string;
  busy: boolean;
  copy: Readonly<{
    functionLabel: string;
    operandsLabel: string;
    addOperand: string;
    removeOperand: string;
    aliasLabel: string;
    cancel: string;
    save: string;
  }>;
  onCancel: () => void;
  onSubmit: (request: Request) => Promise<boolean>;
}>): JSX.Element | null {
  const [fieldIds, setFieldIds] = useState<string[]>(() =>
    fields[0] == null ? [] : [fields[0].fieldId]
  );
  const [capabilityId, setCapabilityId] = useState('');
  const [alias, setAlias] = useState('');
  const primary = fields.find((field) => field.fieldId === fieldIds[0]) ?? fields[0];
  const functions = useMemo(
    () =>
      primary == null
        ? []
        : resolveDvtSubstraitColumnFunctions({
            dataType: primary.dataType,
            provider,
            resolution: 'proposal',
          }),
    [primary, provider]
  );
  const operation = functions.find((item) => item.capabilityId === capabilityId) ?? functions[0];
  if (primary == null || operation == null) return null;
  const minimum = Math.max(1, operation.minimumArgumentCount);
  const maximum = Math.max(minimum, operation.maximumArgumentCount ?? fields.length);
  const operands = normalizeOperands(fieldIds, fields, minimum, maximum);
  const dataTypes = operands.map(
    (fieldId) => fields.find((field) => field.fieldId === fieldId)!.dataType
  );
  const compatible = resolveDvtSubstraitColumnFunctions({
    dataTypes,
    provider,
    resolution: 'complete',
  }).find((item) => item.capabilityId === operation.capabilityId);
  const valid =
    DvtSemanticFieldNameV1Schema.safeParse(alias.trim()).success &&
    compatible != null &&
    admitsCompleteArgumentCount(compatible, operands.length);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid || operands.length === 0) return;
    void onSubmit({
      alias: alias.trim(),
      capabilityId: operation.capabilityId,
      operandFieldIds: operands as [string, ...string[]],
    });
  };
  return (
    <form data-slot="canvas-derived-output-form" className="space-y-3" onSubmit={submit}>
      <label className="block space-y-1 text-xs">
        <span className="text-(--text-muted)">{copy.functionLabel}</span>
        <select
          name="capability"
          value={operation.capabilityId}
          disabled={busy}
          className="h-8 w-full rounded border border-(--border-subtle) bg-(--surface-panel) px-2"
          onChange={(event) => {
            const next = functions.find((item) => item.capabilityId === event.currentTarget.value);
            if (next == null) return;
            setCapabilityId(next.capabilityId);
            setFieldIds((current) =>
              normalizeOperands(
                current,
                fields,
                Math.max(1, next.minimumArgumentCount),
                Math.max(next.minimumArgumentCount, next.maximumArgumentCount ?? fields.length)
              )
            );
          }}
        >
          {functions.map((item) => (
            <option key={item.capabilityId} value={item.capabilityId}>
              {item.name.toUpperCase()}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="space-y-2">
        <legend className="text-xs text-(--text-muted)">{copy.operandsLabel}</legend>
        {operands.map((fieldId, index) => (
          <div key={String(index)} className="flex gap-2">
            <select
              value={fieldId}
              disabled={busy}
              className="h-8 min-w-0 flex-1 rounded border border-(--border-subtle) bg-(--surface-panel) px-2 text-xs"
              onChange={(event) =>
                setFieldIds(
                  operands.map((item, slot) => (slot === index ? event.target.value : item))
                )
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
              aria-label={copy.removeOperand}
              disabled={busy || operands.length <= minimum}
              onClick={() => setFieldIds(operands.filter((_, slot) => slot !== index))}
              className="grid size-8 place-items-center rounded border border-(--border-subtle) disabled:opacity-40"
            >
              <Minus className="size-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={busy || operands.length >= maximum}
          onClick={() => setFieldIds([...operands, fields[0]!.fieldId])}
          className="flex items-center gap-1 text-xs text-(--status-info) disabled:opacity-40"
        >
          <Plus className="size-3" />
          {copy.addOperand}
        </button>
      </fieldset>
      <label className="block space-y-1 text-xs">
        <span className="text-(--text-muted)">{copy.aliasLabel}</span>
        <input
          name="alias"
          value={alias}
          disabled={busy}
          onChange={(event) => setAlias(event.currentTarget.value)}
          className="h-8 w-full rounded border border-(--border-subtle) bg-(--surface-panel) px-2"
        />
      </label>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          data-slot="canvas-derived-output-cancel"
          onClick={onCancel}
          disabled={busy}
          className="rounded px-3 py-1.5 text-xs"
        >
          {copy.cancel}
        </button>
        <button
          type="submit"
          disabled={busy || !valid}
          className="rounded bg-(--accent-primary) px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          {copy.save}
        </button>
      </div>
    </form>
  );
}
