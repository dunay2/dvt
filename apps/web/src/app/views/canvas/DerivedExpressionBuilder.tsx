/** Visual scalar-expression builder. Substrait remains the persisted semantic authority. */
import { CornerDownRight, Plus, X } from 'lucide-react';

import { DerivedOutputOperands, type DerivedOutputField } from './DerivedOutputOperands';

export type DerivedExpressionMode = 'function' | 'string-literal' | 'timestamp-literal';

export type DerivedExpressionFunction = Readonly<{
  capabilityId: string;
  name: string;
  category?: 'text' | 'date-time';
  minimumArgumentCount: number;
  maximumArgumentCount?: number;
  expressionTemplate?: string;
}>;

export function DerivedExpressionBuilder({
  fields,
  functions,
  mode,
  allowLiterals,
  literalValue,
  operation,
  operands,
  wrappers,
  minimum,
  maximum,
  busy,
  copy,
  onModeChange,
  onLiteralValueChange,
  onOperationChange,
  onOperandsChange,
  onWrappersChange,
}: Readonly<{
  fields: readonly DerivedOutputField[];
  functions: readonly DerivedExpressionFunction[];
  mode: DerivedExpressionMode;
  allowLiterals: boolean;
  literalValue: string;
  operation?: DerivedExpressionFunction;
  operands: readonly string[];
  wrappers: readonly string[];
  minimum: number;
  maximum: number;
  busy: boolean;
  copy: Readonly<{
    formulaLabel?: string;
    functionLabel: string;
    operandsLabel: string;
    addOperand: string;
    removeOperand: string;
    moveOperandUp: string;
    moveOperandDown: string;
    wrapFunction?: string;
    removeWrapper?: string;
    previewLabel: string;
    nodeTypeLabel?: string;
    functionNodeLabel?: string;
    stringLiteralNodeLabel?: string;
    timestampLiteralNodeLabel?: string;
    literalValueLabel?: string;
  }>;
  onModeChange: (mode: DerivedExpressionMode) => void;
  onLiteralValueChange: (value: string) => void;
  onOperationChange: (capabilityId: string) => void;
  onOperandsChange: (fieldIds: readonly string[]) => void;
  onWrappersChange: (capabilityIds: readonly string[]) => void;
}>): JSX.Element {
  const wrapperCandidates =
    operation?.category === 'text'
      ? functions.filter(
          (candidate) =>
            candidate.category === 'text' &&
            candidate.minimumArgumentCount === 1 &&
            candidate.maximumArgumentCount === 1
        )
      : [];
  const labels = new Map(fields.map((field) => [field.fieldId, field.name] as const));
  const names = operands.map((fieldId) => labels.get(fieldId) ?? fieldId);
  const basePreview =
    operation == null
      ? ''
      : operation.expressionTemplate != null && names.length === 1
        ? operation.expressionTemplate.replace('{column}', names[0]!)
        : `${operation.name.toUpperCase()}(${names.join(', ')})`;
  const preview = wrappers.reduce((value, capabilityId) => {
    const wrapper = wrapperCandidates.find((candidate) => candidate.capabilityId === capabilityId);
    return wrapper == null ? value : `${wrapper.name.toUpperCase()}(${value})`;
  }, basePreview);

  const baseNode =
    operation == null ? null : (
      <div
        data-slot="derived-expression-base"
        className="space-y-2 rounded border border-(--border-subtle) bg-(--surface-panel) p-2"
      >
        <label className="block space-y-1 text-xs">
          <span className="text-(--text-muted)">{copy.functionLabel}</span>
          <select
            name="capabilityId"
            value={operation.capabilityId}
            disabled={busy}
            className="h-8 w-full rounded border border-(--border-subtle) bg-(--surface-panel) px-2"
            onChange={(event) => onOperationChange(event.currentTarget.value)}
          >
            {functions.map((item) => (
              <option key={item.capabilityId} value={item.capabilityId}>
                {item.name.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <DerivedOutputOperands
          fields={fields}
          fieldIds={operands}
          minimum={minimum}
          maximum={maximum}
          busy={busy}
          copy={copy}
          onChange={onOperandsChange}
        />
      </div>
    );

  const renderLevel = (index: number): JSX.Element | null => {
    if (index < 0) return baseNode;
    const capabilityId = wrappers[index]!;
    const wrapper =
      wrapperCandidates.find((candidate) => candidate.capabilityId === capabilityId) ??
      wrapperCandidates[0];
    if (wrapper == null) return baseNode;
    return (
      <div
        data-slot="derived-expression-wrapper"
        data-depth={wrappers.length - index}
        className="space-y-2 rounded border border-(--border-subtle) bg-(--surface-elevated) p-2"
      >
        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1 space-y-1 text-xs">
            <span className="text-(--text-muted)">{copy.functionLabel}</span>
            <select
              data-slot="derived-expression-wrapper-function"
              value={wrapper.capabilityId}
              disabled={busy}
              className="h-8 w-full rounded border border-(--border-subtle) bg-(--surface-panel) px-2"
              onChange={(event) =>
                onWrappersChange(
                  wrappers.map((item, slot) =>
                    slot === index ? event.currentTarget.value : item
                  )
                )
              }
            >
              {wrapperCandidates.map((candidate) => (
                <option key={candidate.capabilityId} value={candidate.capabilityId}>
                  {candidate.name.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          {copy.removeWrapper == null ? null : (
            <button
              type="button"
              data-slot="derived-expression-remove-wrapper"
              aria-label={copy.removeWrapper.replace('{index}', String(index + 1))}
              disabled={busy}
              onClick={() => onWrappersChange(wrappers.filter((_, slot) => slot !== index))}
              className="grid size-8 place-items-center rounded border border-(--border-subtle) disabled:opacity-40"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
        <div className="flex items-start gap-2 border-l border-(--border-subtle) pl-3">
          <CornerDownRight className="mt-2 size-3 shrink-0 text-(--text-muted)" />
          <div className="min-w-0 flex-1">{renderLevel(index - 1)}</div>
        </div>
      </div>
    );
  };

  const literalPreview =
    mode === 'string-literal'
      ? JSON.stringify(literalValue)
      : mode === 'timestamp-literal'
        ? `TIMESTAMP_TZ(${JSON.stringify(literalValue)})`
        : preview;

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold text-(--text-default)">
        {copy.formulaLabel ?? copy.previewLabel}
      </legend>
      {allowLiterals ? (
        <label className="block space-y-1 text-xs">
          <span className="text-(--text-muted)">{copy.nodeTypeLabel ?? 'Node type'}</span>
          <select
            data-slot="derived-expression-kind"
            value={mode}
            disabled={busy}
            className="h-8 w-full rounded border border-(--border-subtle) bg-(--surface-panel) px-2"
            onChange={(event) => onModeChange(event.currentTarget.value as DerivedExpressionMode)}
          >
            {functions.length === 0 ? null : (
              <option value="function">{copy.functionNodeLabel ?? 'Function'}</option>
            )}
            <option value="string-literal">
              {copy.stringLiteralNodeLabel ?? 'Text constant'}
            </option>
            <option value="timestamp-literal">
              {copy.timestampLiteralNodeLabel ?? 'Timestamp constant'}
            </option>
          </select>
        </label>
      ) : null}
      {mode === 'function' ? (
        <>
          <div data-slot="derived-expression-tree">
            {wrappers.length === 0 ? baseNode : renderLevel(wrappers.length - 1)}
          </div>
          {copy.wrapFunction == null || wrapperCandidates.length === 0 ? null : (
            <button
              type="button"
              data-slot="derived-expression-add-wrapper"
              disabled={busy}
              onClick={() => onWrappersChange([...wrappers, wrapperCandidates[0]!.capabilityId])}
              className="flex items-center gap-1 text-xs text-(--status-info) disabled:opacity-40"
            >
              <Plus className="size-3" />
              {copy.wrapFunction}
            </button>
          )}
        </>
      ) : (
        <label
          data-slot="derived-expression-literal"
          className="block space-y-1 rounded border border-(--border-subtle) bg-(--surface-panel) p-2 text-xs"
        >
          <span className="text-(--text-muted)">{copy.literalValueLabel ?? 'Value'}</span>
          <input
            data-slot="derived-expression-literal-value"
            value={literalValue}
            disabled={busy}
            className="h-8 w-full rounded border border-(--border-subtle) bg-(--surface-panel) px-2"
            onChange={(event) => onLiteralValueChange(event.currentTarget.value)}
          />
        </label>
      )}
      <div className="rounded border border-(--border-subtle) p-2 text-xs">
        <span className="text-(--text-muted)">{copy.previewLabel}</span>
        <code data-slot="graph-node-column-function-expression" className="mt-1 block">
          {literalPreview}
        </code>
      </div>
    </fieldset>
  );
}
