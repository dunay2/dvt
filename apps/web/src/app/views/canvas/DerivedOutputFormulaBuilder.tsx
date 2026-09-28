/** Recursive visual Formula Builder over an ephemeral draft. */
import { ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react';
import type { DvtSubstraitColumnFunction } from '@dvt/postgres-projection';

import type { DerivedOutputField } from './DerivedOutputOperands';
import {
  compatibleDerivedOutputVisualFields,
  defaultDerivedOutputVisualFormula,
  derivedOutputVisualFormulaCandidates,
  derivedOutputVisualFormulaDataType,
  formatDerivedOutputVisualFormula,
  type DerivedOutputVisualFormula,
  visualFormulaFunctionLabel,
} from './canvasDerivedOutputVisualFormula';

type FormulaNodeKind = DerivedOutputVisualFormula['kind'];

type BuilderCopy = Readonly<{
  formulaLabel: string;
  previewLabel: string;
  functionLabel: string;
  operandsLabel: string;
  addOperand: string;
  removeOperand: string;
  moveOperandUp: string;
  moveOperandDown: string;
  nodeTypeLabel: string;
  fieldNodeLabel: string;
  functionNodeLabel: string;
  textLiteralNodeLabel: string;
  numberLiteralNodeLabel: string;
  booleanLiteralNodeLabel: string;
  literalValueLabel: string;
  resultTypeLabel: string;
}>;

function normalizeArguments(
  function_: DvtSubstraitColumnFunction,
  current: readonly DerivedOutputVisualFormula[],
  fallback: DerivedOutputVisualFormula
): [DerivedOutputVisualFormula, ...DerivedOutputVisualFormula[]] {
  const maximum = function_.maximumArgumentCount ?? Math.max(function_.minimumArgumentCount, 16);
  const next = current.slice(0, maximum);
  while (next.length < function_.minimumArgumentCount) next.push(next[0] ?? fallback);
  if (next.length === 0) next.push(fallback);
  return next as [DerivedOutputVisualFormula, ...DerivedOutputVisualFormula[]];
}

function FormulaNodeEditor({
  expression,
  fields,
  provider,
  busy,
  copy,
  depth,
  onChange,
}: Readonly<{
  expression: DerivedOutputVisualFormula;
  fields: readonly DerivedOutputField[];
  provider: string;
  busy: boolean;
  copy: BuilderCopy;
  depth: number;
  onChange: (expression: DerivedOutputVisualFormula) => void;
}>): JSX.Element {
  const candidates = derivedOutputVisualFormulaCandidates(expression, fields, provider);
  const selected =
    expression.kind === 'function'
      ? candidates.find((candidate) => candidate.capabilityId === expression.capabilityId)
      : undefined;
  const canUseFunction = candidates.length > 0 || expression.kind === 'function';

  const changeKind = (kind: FormulaNodeKind) => {
    if (kind === expression.kind) return;
    if (kind === 'field') {
      onChange(defaultDerivedOutputVisualFormula(fields));
      return;
    }
    if (kind === 'string-literal') {
      onChange({ kind, value: '' });
      return;
    }
    if (kind === 'number-literal') {
      onChange({ kind, value: '0' });
      return;
    }
    if (kind === 'boolean-literal') {
      onChange({ kind, value: false });
      return;
    }
    const function_ =
      candidates.find(
        (candidate) =>
          candidate.minimumArgumentCount === 1 && candidate.maximumArgumentCount === 1
      ) ?? candidates[0];
    if (function_ == null) return;
    onChange({
      kind: 'function',
      capabilityId: function_.capabilityId,
      arguments: normalizeArguments(function_, [expression], expression),
    });
  };

  return (
    <div
      data-slot="derived-formula-node"
      data-depth={depth}
      className="space-y-2 rounded border border-(--border-subtle) bg-(--surface-panel) p-2"
    >
      <label className="block space-y-1 text-xs">
        <span className="text-(--text-muted)">{copy.nodeTypeLabel}</span>
        <select
          data-slot="derived-formula-node-kind"
          data-depth={depth}
          value={expression.kind}
          disabled={busy}
          className="h-8 w-full rounded border border-(--border-subtle) bg-(--surface-panel) px-2"
          onChange={(event) => changeKind(event.currentTarget.value as FormulaNodeKind)}
        >
          {fields.length === 0 ? null : <option value="field">{copy.fieldNodeLabel}</option>}
          {canUseFunction ? <option value="function">{copy.functionNodeLabel}</option> : null}
          <option value="string-literal">{copy.textLiteralNodeLabel}</option>
          <option value="number-literal">{copy.numberLiteralNodeLabel}</option>
          <option value="boolean-literal">{copy.booleanLiteralNodeLabel}</option>
        </select>
      </label>

      {expression.kind === 'field' ? (
        <select
          data-slot="derived-formula-field"
          value={expression.fieldId}
          disabled={busy}
          className="h-8 w-full rounded border border-(--border-subtle) bg-(--surface-panel) px-2 text-xs"
          onChange={(event) => onChange({ kind: 'field', fieldId: event.currentTarget.value })}
        >
          {fields.map((field) => (
            <option key={field.fieldId} value={field.fieldId}>
              {field.name}
            </option>
          ))}
        </select>
      ) : expression.kind === 'string-literal' || expression.kind === 'number-literal' ? (
        <label className="block space-y-1 text-xs">
          <span className="text-(--text-muted)">{copy.literalValueLabel}</span>
          <input
            data-slot="derived-formula-literal"
            value={expression.value}
            disabled={busy}
            className="h-8 w-full rounded border border-(--border-subtle) bg-(--surface-panel) px-2"
            inputMode={expression.kind === 'number-literal' ? 'decimal' : undefined}
            onChange={(event) => onChange({ ...expression, value: event.currentTarget.value })}
          />
        </label>
      ) : expression.kind === 'boolean-literal' ? (
        <select
          data-slot="derived-formula-boolean"
          value={expression.value ? 'true' : 'false'}
          disabled={busy}
          className="h-8 w-full rounded border border-(--border-subtle) bg-(--surface-panel) px-2 text-xs"
          onChange={(event) =>
            onChange({ kind: 'boolean-literal', value: event.currentTarget.value === 'true' })
          }
        >
          <option value="true">TRUE</option>
          <option value="false">FALSE</option>
        </select>
      ) : (
        <FunctionNodeEditor
          expression={expression}
          fields={fields}
          provider={provider}
          busy={busy}
          copy={copy}
          depth={depth}
          candidates={candidates}
          selected={selected}
          onChange={onChange}
        />
      )}
    </div>
  );
}

function FunctionNodeEditor({
  expression,
  fields,
  provider,
  busy,
  copy,
  depth,
  candidates,
  selected,
  onChange,
}: Readonly<{
  expression: Extract<DerivedOutputVisualFormula, { kind: 'function' }>;
  fields: readonly DerivedOutputField[];
  provider: string;
  busy: boolean;
  copy: BuilderCopy;
  depth: number;
  candidates: readonly DvtSubstraitColumnFunction[];
  selected?: DvtSubstraitColumnFunction;
  onChange: (expression: DerivedOutputVisualFormula) => void;
}>): JSX.Element {
  const choices =
    candidates.some((candidate) => candidate.capabilityId === expression.capabilityId)
      ? candidates
      : [
          {
            capabilityId: expression.capabilityId,
            name: visualFormulaFunctionLabel(expression.capabilityId),
            category: 'text' as const,
            minimumArgumentCount: expression.arguments.length,
            maximumArgumentCount: expression.arguments.length,
          },
          ...candidates,
        ];
  const active =
    selected ?? choices.find((candidate) => candidate.capabilityId === expression.capabilityId)!;
  const maximum = active.maximumArgumentCount ?? 16;
  const minimum = active.minimumArgumentCount;

  const updateArguments = (arguments_: readonly DerivedOutputVisualFormula[]) =>
    onChange({
      kind: 'function',
      capabilityId: expression.capabilityId,
      arguments: arguments_ as [DerivedOutputVisualFormula, ...DerivedOutputVisualFormula[]],
    });

  return (
    <div className="space-y-2">
      <label className="block space-y-1 text-xs">
        <span className="text-(--text-muted)">{copy.functionLabel}</span>
        <select
          data-slot="derived-formula-function"
          data-depth={depth}
          value={expression.capabilityId}
          disabled={busy}
          className="h-8 w-full rounded border border-(--border-subtle) bg-(--surface-panel) px-2"
          onChange={(event) => {
            const function_ = choices.find(
              (candidate) => candidate.capabilityId === event.currentTarget.value
            );
            if (function_ == null) return;
            onChange({
              kind: 'function',
              capabilityId: function_.capabilityId,
              arguments: normalizeArguments(
                function_,
                expression.arguments,
                expression.arguments[0] ?? defaultDerivedOutputVisualFormula(fields)
              ),
            });
          }}
        >
          {choices.map((function_) => (
            <option key={function_.capabilityId} value={function_.capabilityId}>
              {function_.name.toUpperCase()}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-2">
        <span className="text-xs text-(--text-muted)">{copy.operandsLabel}</span>
        {expression.arguments.map((argument, index) => {
          const compatibleFields = compatibleDerivedOutputVisualFields({
            expression,
            argumentIndex: index,
            fields,
            provider,
          });
          return (
            <div
              key={index}
              data-slot="derived-formula-argument"
              data-depth={depth}
              data-argument-index={index}
              className="flex items-start gap-1"
            >
              <div className="min-w-0 flex-1 border-l border-(--border-subtle) pl-2">
              <FormulaNodeEditor
                expression={argument}
                fields={compatibleFields}
                provider={provider}
                busy={busy}
                copy={copy}
                depth={depth + 1}
                onChange={(next) =>
                  updateArguments(
                    expression.arguments.map((candidate, slot) =>
                      slot === index ? next : candidate
                    )
                  )
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                aria-label={copy.moveOperandUp.replace('{index}', String(index + 1))}
                disabled={busy || index === 0}
                onClick={() => {
                  const next = [...expression.arguments];
                  [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
                  updateArguments(next);
                }}
                className="grid size-7 place-items-center rounded border border-(--border-subtle) disabled:opacity-40"
              >
                <ChevronUp className="size-3" />
              </button>
              <button
                type="button"
                aria-label={copy.moveOperandDown.replace('{index}', String(index + 1))}
                disabled={busy || index === expression.arguments.length - 1}
                onClick={() => {
                  const next = [...expression.arguments];
                  [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
                  updateArguments(next);
                }}
                className="grid size-7 place-items-center rounded border border-(--border-subtle) disabled:opacity-40"
              >
                <ChevronDown className="size-3" />
              </button>
              <button
                type="button"
                aria-label={copy.removeOperand.replace('{index}', String(index + 1))}
                disabled={busy || expression.arguments.length <= minimum}
                onClick={() =>
                  updateArguments(expression.arguments.filter((_, slot) => slot !== index))
                }
                className="grid size-7 place-items-center rounded border border-(--border-subtle) disabled:opacity-40"
              >
                <Minus className="size-3" />
              </button>
              </div>
            </div>
          );
        })}
        <button
          type="button"
          data-slot="derived-formula-add-argument"
          disabled={busy || expression.arguments.length >= maximum}
          onClick={() =>
            updateArguments([
              ...expression.arguments,
              expression.arguments[0] ?? defaultDerivedOutputVisualFormula(fields),
            ])
          }
          className="flex items-center gap-1 text-xs text-(--status-info) disabled:opacity-40"
        >
          <Plus className="size-3" />
          {copy.addOperand}
        </button>
      </div>
    </div>
  );
}

export function DerivedOutputFormulaBuilder({
  expression,
  fields,
  provider,
  busy,
  copy,
  onChange,
}: Readonly<{
  expression: DerivedOutputVisualFormula;
  fields: readonly DerivedOutputField[];
  provider: string;
  busy: boolean;
  copy: BuilderCopy;
  onChange: (expression: DerivedOutputVisualFormula) => void;
}>): JSX.Element {
  const resultType = derivedOutputVisualFormulaDataType(expression, fields, provider);
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold">{copy.formulaLabel}</legend>
      <FormulaNodeEditor
        expression={expression}
        fields={fields}
        provider={provider}
        busy={busy}
        copy={copy}
        depth={0}
        onChange={onChange}
      />
      <div className="rounded border border-(--border-subtle) bg-(--surface-elevated) p-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-(--text-muted)">{copy.previewLabel}</span>
          <span data-slot="derived-formula-result-type" className="text-(--text-muted)">
            {copy.resultTypeLabel}: {resultType ?? '—'}
          </span>
        </div>
        <code data-slot="derived-formula-preview" className="mt-1 block break-words">
          {formatDerivedOutputVisualFormula(expression, fields) ?? '—'}
        </code>
      </div>
    </fieldset>
  );
}
