/** One canonical command form for creating a scalar-derived output. */
import {
  DvtSemanticFieldNameV1Schema,
  DvtStringLiteralV1Schema,
  DvtTimestampLiteralV1Schema,
} from '@dvt/contracts';
import { useId, useState, type FormEvent } from 'react';

import { DerivedExpressionBuilder } from './DerivedExpressionBuilder';
import {
  collectDerivedExpressionFieldIds,
  type DerivedExpressionDraft,
  type DerivedExpressionFunction,
  type DerivedExpressionFunctionResolver,
} from './DerivedExpressionNodeEditor';
import type { DerivedOutputField } from './DerivedOutputOperands';

export type DerivedOutputFunction = DerivedExpressionFunction;
export type DerivedOutputFunctionResolver = DerivedExpressionFunctionResolver;
export type DerivedOutputRequest = Readonly<{
  alias: string;
  expression: DerivedExpressionDraft;
}>;

function firstFieldId(expression: DerivedExpressionDraft): string | null {
  return collectDerivedExpressionFieldIds(expression)[0] ?? null;
}

function operationFor(
  expression: DerivedExpressionDraft,
  fields: readonly DerivedOutputField[],
  resolveFunctions: DerivedOutputFunctionResolver
): DerivedExpressionFunction | null {
  if (expression.kind !== 'function') return null;
  const fieldId = firstFieldId(expression) ?? fields[0]?.fieldId;
  if (fieldId == null) return null;
  return (
    resolveFunctions([fieldId], 'proposal').find(
      (candidate) => candidate.capabilityId === expression.capabilityId
    ) ?? null
  );
}

function validExpression(
  expression: DerivedExpressionDraft,
  fields: readonly DerivedOutputField[],
  resolveFunctions: DerivedOutputFunctionResolver
): boolean {
  if (expression.kind === 'field')
    return fields.some((field) => field.fieldId === expression.fieldId);
  if (expression.kind === 'string-literal')
    return DvtStringLiteralV1Schema.safeParse(expression.value).success;
  if (expression.kind === 'timestamp-literal')
    return DvtTimestampLiteralV1Schema.safeParse(expression.value).success;

  const operation = operationFor(expression, fields, resolveFunctions);
  if (operation == null) return false;
  const minimum = Math.max(1, operation.minimumArgumentCount);
  const maximum = Math.max(
    minimum,
    operation.maximumArgumentCount ?? Math.max(fields.length, minimum)
  );
  return (
    expression.arguments.length >= minimum &&
    expression.arguments.length <= maximum &&
    expression.arguments.every((argument) => validExpression(argument, fields, resolveFunctions))
  );
}

function initialExpression(
  fields: readonly DerivedOutputField[],
  resolveFunctions: DerivedOutputFunctionResolver,
  initialCapabilityId?: string,
  initialOperandFieldIds?: readonly [string, ...string[]],
  initialMode?: 'function' | 'string-literal' | 'timestamp-literal'
): DerivedExpressionDraft {
  if (initialMode === 'string-literal') return { kind: 'string-literal', value: '' };
  if (initialMode === 'timestamp-literal') return { kind: 'timestamp-literal', value: '' };
  const fieldId = initialOperandFieldIds?.[0] ?? fields[0]?.fieldId ?? '';
  const functions = fieldId.length === 0 ? [] : resolveFunctions([fieldId], 'proposal');
  const operation =
    functions.find((candidate) => candidate.capabilityId === initialCapabilityId) ?? functions[0];
  if (operation == null) return { kind: 'field', fieldId };
  const minimum = Math.max(1, operation.minimumArgumentCount);
  const maximum = Math.max(
    minimum,
    operation.maximumArgumentCount ?? Math.max(fields.length, minimum)
  );
  const requested = [...(initialOperandFieldIds ?? [fieldId])].slice(0, maximum);
  while (requested.length < minimum) requested.push(fieldId);
  return {
    kind: 'function',
    capabilityId: operation.capabilityId,
    arguments: requested.map((operandFieldId) => ({
      kind: 'field' as const,
      fieldId: operandFieldId,
    })) as [DerivedExpressionDraft, ...DerivedExpressionDraft[]],
  };
}

export function DerivedOutputForm({
  fields,
  resolveFunctions,
  initialCapabilityId,
  initialOperandFieldIds,
  initialMode,
  allowLiterals = true,
  allowNested = true,
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
  initialMode?: 'function' | 'string-literal' | 'timestamp-literal';
  allowLiterals?: boolean;
  allowNested?: boolean;
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
    nodeTypeLabel?: string;
    functionNodeLabel?: string;
    fieldNodeLabel?: string;
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
  const [expression, setExpression] = useState<DerivedExpressionDraft>(() =>
    initialExpression(
      fields,
      resolveFunctions,
      initialCapabilityId,
      initialOperandFieldIds,
      initialMode
    )
  );
  const [alias, setAlias] = useState('');
  const [busy, setBusy] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const errorId = useId();
  if (fields.length === 0 && !allowLiterals) return null;

  const aliasInvalid = alias.length > 0 && !DvtSemanticFieldNameV1Schema.safeParse(alias).success;
  const aliasConflict = unavailableAliases.includes(alias);
  const expressionValid = validExpression(expression, fields, resolveFunctions);
  const valid = alias.length > 0 && !aliasInvalid && !aliasConflict && expressionValid;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid) return;
    setBusy(true);
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
        expression={expression}
        fields={fields}
        resolveFunctions={resolveFunctions}
        allowLiterals={allowLiterals}
        allowNested={allowNested}
        busy={busy}
        copy={copy}
        onChange={(next) => {
          setExpression(next);
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
