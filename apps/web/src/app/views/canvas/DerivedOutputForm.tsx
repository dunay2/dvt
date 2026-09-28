/** One canonical command form for creating a scalar-derived output. */
import {
  DvtSemanticFieldNameV1Schema,
  DvtStringLiteralV1Schema,
  DvtTimestampLiteralV1Schema,
} from '@dvt/contracts';
import { useId, useMemo, useState, type FormEvent } from 'react';
import {
  DerivedExpressionBuilder,
  type DerivedExpressionFunction,
  type DerivedExpressionMode,
} from './DerivedExpressionBuilder';
import type { DerivedOutputField } from './DerivedOutputOperands';

export type DerivedOutputFunction = DerivedExpressionFunction;
export type DerivedOutputRequest = Readonly<{
  alias: string;
  expression:
    | Readonly<{
        kind: 'function';
        capabilityIds: readonly [string, ...string[]];
        operandFieldIds: readonly [string, ...string[]];
      }>
    | Readonly<{ kind: 'string-literal'; value: string }>
    | Readonly<{ kind: 'timestamp-literal'; value: string }>;
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
  range: Readonly<{ minimum: number; maximum: number }>
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
  initialMode,
  allowLiterals = true,
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
  initialMode?: DerivedExpressionMode;
  allowLiterals?: boolean;
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
    formulaLabel?: string;
    wrapFunction?: string;
    removeWrapper?: string;
    nodeTypeLabel?: string;
    functionNodeLabel?: string;
    stringLiteralNodeLabel?: string;
    timestampLiteralNodeLabel?: string;
    literalValueLabel?: string;
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
  const [wrappers, setWrappers] = useState<string[]>([]);
  const [mode, setMode] = useState<DerivedExpressionMode>(initialMode ?? 'function');
  const [literalValue, setLiteralValue] = useState('');
  const [alias, setAlias] = useState('');
  const [busy, setBusy] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const errorId = useId();
  const functions = useMemo(
    () => resolveFunctions(fieldIds.slice(0, 1), 'proposal'),
    [fieldIds, resolveFunctions]
  );
  const operation = functions.find((item) => item.capabilityId === capabilityId) ?? functions[0];
  if (fields.length === 0 && !allowLiterals) return null;
  const range =
    operation == null
      ? { minimum: 1, maximum: Math.max(1, fields.length) }
      : bounds(operation, fields.length);
  const operands = normalize(fieldIds, fields, range);
  const compatible =
    operation != null &&
    resolveFunctions(operands, 'complete').some(
      (item) => item.capabilityId === operation.capabilityId
    );
  const wrapperCandidates =
    operation?.category === 'text'
      ? functions.filter(
          (candidate) =>
            candidate.category === 'text' &&
            candidate.minimumArgumentCount === 1 &&
            candidate.maximumArgumentCount === 1
        )
      : [];
  const wrappersValid = wrappers.every((wrapperCapabilityId) =>
    wrapperCandidates.some((candidate) => candidate.capabilityId === wrapperCapabilityId)
  );
  const aliasInvalid = alias.length > 0 && !DvtSemanticFieldNameV1Schema.safeParse(alias).success;
  const aliasConflict = unavailableAliases.includes(alias);
  const literalValid =
    mode === 'string-literal'
      ? DvtStringLiteralV1Schema.safeParse(literalValue).success
      : mode === 'timestamp-literal'
        ? DvtTimestampLiteralV1Schema.safeParse(literalValue).success
        : true;
  const expressionValid =
    mode === 'function' ? compatible && wrappersValid && operation != null : literalValid;
  const valid = alias.length > 0 && !aliasInvalid && !aliasConflict && expressionValid;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !valid ||
      (mode === 'function' && operands.length === 0) ||
      (mode === 'function' && operation == null)
    )
      return;
    setBusy(true);
    const expression: DerivedOutputRequest['expression'] =
      mode === 'function'
        ? {
            kind: 'function',
            capabilityIds: [operation!.capabilityId, ...wrappers] as [string, ...string[]],
            operandFieldIds: operands as [string, ...string[]],
          }
        : { kind: mode, value: literalValue };
    const error = await onSubmit({ alias, expression });
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
      <DerivedExpressionBuilder
        fields={
          operation == null
            ? fields
            : fields.filter((candidate) => {
                const probe =
                  range.maximum === 1 ? [candidate.fieldId] : [operands[0]!, candidate.fieldId];
                return resolveFunctions(probe, 'complete').some(
                  (item) => item.capabilityId === operation.capabilityId
                );
              })
        }
        functions={functions}
        mode={mode}
        allowLiterals={allowLiterals}
        literalValue={literalValue}
        operation={operation}
        operands={operands}
        wrappers={wrappers}
        minimum={range.minimum}
        maximum={range.maximum}
        busy={busy}
        copy={copy}
        onModeChange={(nextMode) => {
          setMode(nextMode);
          setWrappers([]);
          setCommandError(null);
        }}
        onLiteralValueChange={(nextValue) => {
          setLiteralValue(nextValue);
          setCommandError(null);
        }}
        onOperationChange={(nextCapabilityId) => {
          const next = functions.find((item) => item.capabilityId === nextCapabilityId);
          if (next == null) return;
          setCapabilityId(next.capabilityId);
          setFieldIds((current) => normalize(current, fields, bounds(next, fields.length)));
          setWrappers([]);
          setCommandError(null);
        }}
        onOperandsChange={(next) => {
          setFieldIds([...next]);
          setCommandError(null);
        }}
        onWrappersChange={(next) => {
          setWrappers([...next]);
          setCommandError(null);
        }}
      />
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
