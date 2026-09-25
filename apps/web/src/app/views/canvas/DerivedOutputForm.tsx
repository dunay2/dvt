/** One canonical command form for creating a scalar-derived output. */
import { DvtSemanticFieldNameV1Schema } from '@dvt/contracts';
import { useId, useMemo, useState, type FormEvent } from 'react';
import { DerivedOutputOperands, type DerivedOutputField } from './DerivedOutputOperands';

export type DerivedOutputFunction = Readonly<{
  capabilityId: string;
  name: string;
  minimumArgumentCount: number;
  maximumArgumentCount?: number;
  expressionTemplate?: string;
}>;
export type DerivedOutputRequest = Readonly<{
  alias: string;
  capabilityId: string;
  operandFieldIds: readonly [string, ...string[]];
}>;
export type DerivedOutputFunctionResolver = (
  fieldIds: readonly string[],
  resolution: 'proposal' | 'complete'
) => readonly DerivedOutputFunction[];

function bounds(operation: DerivedOutputFunction, fieldCount: number) {
  const minimum = Math.max(1, operation.minimumArgumentCount);
  return { minimum, maximum: Math.max(minimum, operation.maximumArgumentCount ?? fieldCount) };
}

function normalize(
  current: readonly string[],
  fields: readonly DerivedOutputField[],
  range: ReturnType<typeof bounds>
): string[] {
  const available = new Set(fields.map((field) => field.fieldId));
  const next = current.filter((fieldId) => available.has(fieldId)).slice(0, range.maximum);
  while (next.length < range.minimum && fields.length > 0)
    next.push(fields[next.length % fields.length]!.fieldId);
  return next;
}

export function DerivedOutputForm({
  fields,
  resolveFunctions,
  initialCapabilityId,
  initialOperandFieldIds,
  unavailableAliases = [],
  dataSlot = 'derived-output-form',
  copy,
  onCancel,
  onSubmit,
  onApplied,
}: Readonly<{
  fields: readonly DerivedOutputField[];
  resolveFunctions: DerivedOutputFunctionResolver;
  initialCapabilityId?: string;
  initialOperandFieldIds?: readonly [string, ...string[]];
  unavailableAliases?: readonly string[];
  dataSlot?: string;
  copy: Readonly<{
    functionLabel: string;
    operandsLabel: string;
    addOperand: string;
    removeOperand: string;
    moveOperandUp: string;
    moveOperandDown: string;
    previewLabel: string;
    aliasLabel: string;
    aliasInvalid: string;
    aliasConflict: string;
    cancel: string;
    save: string;
  }>;
  onCancel: () => void;
  onSubmit: (request: DerivedOutputRequest) => Promise<string | null> | string | null;
  onApplied?: () => void;
}>): JSX.Element | null {
  const initial = initialOperandFieldIds ?? (fields[0] == null ? null : [fields[0].fieldId]);
  const [fieldIds, setFieldIds] = useState<string[]>(() => (initial == null ? [] : [...initial]));
  const [capabilityId, setCapabilityId] = useState(initialCapabilityId ?? '');
  const [alias, setAlias] = useState('');
  const [busy, setBusy] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const errorId = useId();
  const functions = useMemo(
    () => resolveFunctions(fieldIds.slice(0, 1), 'proposal'),
    [fieldIds, resolveFunctions]
  );
  const operation = functions.find((item) => item.capabilityId === capabilityId) ?? functions[0];
  if (operation == null || fields.length === 0) return null;
  const range = bounds(operation, fields.length);
  const operands = normalize(fieldIds, fields, range);
  const compatible = resolveFunctions(operands, 'complete').some(
    (item) => item.capabilityId === operation.capabilityId
  );
  const aliasInvalid = alias.length > 0 && !DvtSemanticFieldNameV1Schema.safeParse(alias).success;
  const aliasConflict = unavailableAliases.includes(alias);
  const valid = alias.length > 0 && !aliasInvalid && !aliasConflict && compatible;
  const labels = new Map(fields.map((field) => [field.fieldId, field.name] as const));
  const names = operands.map((fieldId) => labels.get(fieldId) ?? fieldId);
  const preview =
    operation.expressionTemplate != null && names.length === 1
      ? operation.expressionTemplate.replace('{column}', names[0]!)
      : `${operation.name.toUpperCase()}(${names.join(', ')})`;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid || operands.length === 0) return;
    setBusy(true);
    const error = await onSubmit({
      alias,
      capabilityId: operation.capabilityId,
      operandFieldIds: operands as [string, ...string[]],
    });
    setBusy(false);
    setCommandError(error);
    if (error == null) onApplied?.();
  };
  const error = aliasInvalid
    ? copy.aliasInvalid
    : aliasConflict
      ? copy.aliasConflict
      : commandError;
  return (
    <form data-slot={dataSlot} className="space-y-3" onSubmit={(event) => void submit(event)}>
      <label className="block space-y-1 text-xs">
        <span className="text-(--text-muted)">{copy.functionLabel}</span>
        <select
          name="capabilityId"
          value={operation.capabilityId}
          disabled={busy}
          className="h-8 w-full rounded border border-(--border-subtle) bg-(--surface-panel) px-2"
          onChange={(event) => {
            const next = functions.find((item) => item.capabilityId === event.currentTarget.value);
            if (next == null) return;
            setCapabilityId(next.capabilityId);
            setFieldIds((current) => normalize(current, fields, bounds(next, fields.length)));
            setCommandError(null);
          }}
        >
          {functions.map((item) => (
            <option key={item.capabilityId} value={item.capabilityId}>
              {item.name.toUpperCase()}
            </option>
          ))}
        </select>
      </label>
      <DerivedOutputOperands
        fields={fields.filter((candidate) => {
          const probe =
            range.maximum === 1 ? [candidate.fieldId] : [operands[0]!, candidate.fieldId];
          return resolveFunctions(probe, 'complete').some(
            (item) => item.capabilityId === operation.capabilityId
          );
        })}
        fieldIds={operands}
        minimum={range.minimum}
        maximum={range.maximum}
        busy={busy}
        copy={copy}
        onChange={(next) => {
          setFieldIds([...next]);
          setCommandError(null);
        }}
      />
      <div className="rounded border border-(--border-subtle) p-2 text-xs">
        <span className="text-(--text-muted)">{copy.previewLabel}</span>
        <code data-slot="graph-node-column-function-expression" className="mt-1 block">
          {preview}
        </code>
      </div>
      <label className="block space-y-1 text-xs">
        <span className="text-(--text-muted)">{copy.aliasLabel}</span>
        <input
          name="alias"
          data-slot="graph-node-column-function-alias-input"
          value={alias}
          autoFocus
          disabled={busy}
          aria-invalid={error == null ? undefined : true}
          aria-describedby={error == null ? undefined : errorId}
          onChange={(event) => {
            setAlias(event.currentTarget.value);
            setCommandError(null);
          }}
          className="h-8 w-full rounded border border-(--border-subtle) bg-(--surface-panel) px-2"
        />
      </label>
      {error == null ? null : (
        <p id={errorId} role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
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
          data-slot="graph-node-column-function-alias-submit"
          disabled={busy || !valid}
          className="rounded bg-(--accent-primary) px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          {copy.save}
        </button>
      </div>
    </form>
  );
}
