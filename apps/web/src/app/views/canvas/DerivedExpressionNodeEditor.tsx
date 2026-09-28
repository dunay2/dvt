/** Ephemeral visual-expression draft editor; persisted meaning remains Substrait. */
import { ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react';

import type { DerivedOutputField } from './DerivedOutputOperands';

export type DerivedExpressionFunction = Readonly<{
  capabilityId: string;
  name: string;
  category?: 'text' | 'date-time' | 'arithmetic';
  minimumArgumentCount: number;
  maximumArgumentCount?: number;
  expressionTemplate?: string;
}>;

export type DerivedExpressionDraft =
  | Readonly<{ kind: 'field'; fieldId: string }>
  | Readonly<{ kind: 'string-literal'; value: string }>
  | Readonly<{ kind: 'timestamp-literal'; value: string }>
  | Readonly<{ kind: 'i64-literal'; value: string }>
  | Readonly<{
      kind: 'function';
      capabilityId: string;
      arguments: readonly [DerivedExpressionDraft, ...DerivedExpressionDraft[]];
    }>;

export type DerivedExpressionFunctionResolver = (
  fieldIds: readonly string[],
  resolution: 'proposal' | 'complete'
) => readonly DerivedExpressionFunction[];

export type DerivedExpressionTypeResolver = (
  dataTypes: readonly string[],
  resolution: 'proposal' | 'complete'
) => readonly DerivedExpressionFunction[];

export type DerivedExpressionCopy = Readonly<{
  functionLabel: string;
  operandsLabel: string;
  addOperand: string;
  removeOperand: string;
  moveOperandUp: string;
  moveOperandDown: string;
  nodeTypeLabel?: string;
  functionNodeLabel?: string;
  fieldNodeLabel?: string;
  stringLiteralNodeLabel?: string;
  timestampLiteralNodeLabel?: string;
  i64LiteralNodeLabel?: string;
  literalValueLabel?: string;
}>;

function firstFieldId(expression: DerivedExpressionDraft): string | null {
  if (expression.kind === 'field') return expression.fieldId;
  if (expression.kind !== 'function') return null;
  for (const argument of expression.arguments) {
    const fieldId = firstFieldId(argument);
    if (fieldId != null) return fieldId;
  }
  return null;
}

export function collectDerivedExpressionFieldIds(
  expression: DerivedExpressionDraft
): readonly string[] {
  if (expression.kind === 'field') return [expression.fieldId];
  if (expression.kind !== 'function') return [];
  return [...new Set(expression.arguments.flatMap(collectDerivedExpressionFieldIds))];
}

function defaultField(
  fields: readonly DerivedOutputField[],
  preferred?: string | null
): DerivedExpressionDraft {
  const field = fields.find((candidate) => candidate.fieldId === preferred) ?? fields[0];
  return { kind: 'field', fieldId: field?.fieldId ?? '' };
}

function bounds(operation: DerivedExpressionFunction, fieldCount: number) {
  const minimum = Math.max(1, operation.minimumArgumentCount);
  return {
    minimum,
    maximum: Math.max(minimum, operation.maximumArgumentCount ?? Math.max(fieldCount, minimum)),
  };
}

function normalizeArguments(
  operation: DerivedExpressionFunction,
  current: readonly DerivedExpressionDraft[],
  fields: readonly DerivedOutputField[]
): [DerivedExpressionDraft, ...DerivedExpressionDraft[]] {
  const range = bounds(operation, fields.length);
  const next = current.slice(0, range.maximum);
  const preferred = current.length > 0 ? firstFieldId(current[0]!) : null;
  while (next.length < range.minimum) next.push(defaultField(fields, preferred));
  if (next.length === 0) next.push(defaultField(fields));
  return next as [DerivedExpressionDraft, ...DerivedExpressionDraft[]];
}

export function inferDerivedExpressionDataType(
  expression: DerivedExpressionDraft,
  fields: readonly DerivedOutputField[],
  resolveFunctionsForTypes?: DerivedExpressionTypeResolver
): string | null {
  if (expression.kind === 'field')
    return fields.find((field) => field.fieldId === expression.fieldId)?.dataType ?? null;
  if (expression.kind === 'string-literal') return 'string';
  if (expression.kind === 'timestamp-literal') return 'timestamp with time zone';
  if (expression.kind === 'i64-literal') return 'bigint';

  const argumentTypes = expression.arguments.map((argument) =>
    inferDerivedExpressionDataType(argument, fields, resolveFunctionsForTypes)
  );
  if (argumentTypes.some((dataType) => dataType == null)) return null;
  const resolved =
    resolveFunctionsForTypes?.(
      argumentTypes.filter((dataType): dataType is string => dataType != null),
      'complete'
    ).find((candidate) => candidate.capabilityId === expression.capabilityId) ?? null;
  const category = resolved?.category;
  if (category === 'text') return 'string';
  if (category === 'date-time' || category === 'arithmetic') return 'bigint';
  return null;
}

function proposalFunctions(
  expression: DerivedExpressionDraft,
  fields: readonly DerivedOutputField[],
  resolveFunctions: DerivedExpressionFunctionResolver,
  resolveFunctionsForTypes?: DerivedExpressionTypeResolver
): readonly DerivedExpressionFunction[] {
  const dataTypes =
    expression.kind === 'function'
      ? expression.arguments
          .map((argument) => inferDerivedExpressionDataType(argument, fields, resolveFunctionsForTypes))
          .filter((dataType): dataType is string => dataType != null)
      : [inferDerivedExpressionDataType(expression, fields, resolveFunctionsForTypes)].filter(
          (dataType): dataType is string => dataType != null
        );
  if (resolveFunctionsForTypes != null && dataTypes.length > 0) {
    return resolveFunctionsForTypes(dataTypes, 'proposal');
  }

  const fieldId = firstFieldId(expression);
  const candidates =
    fieldId == null
      ? fields.flatMap((field) => resolveFunctions([field.fieldId], 'proposal'))
      : resolveFunctions([fieldId], 'proposal');
  return [
    ...new Map(candidates.map((candidate) => [candidate.capabilityId, candidate] as const)).values(),
  ];
}

export function formatDerivedExpression(
  expression: DerivedExpressionDraft,
  fields: readonly DerivedOutputField[],
  resolveFunctions: DerivedExpressionFunctionResolver,
  resolveFunctionsForTypes?: DerivedExpressionTypeResolver
): string {
  if (expression.kind === 'field')
    return fields.find((field) => field.fieldId === expression.fieldId)?.name ?? expression.fieldId;
  if (expression.kind === 'string-literal') return JSON.stringify(expression.value);
  if (expression.kind === 'timestamp-literal')
    return `TIMESTAMP_TZ(${JSON.stringify(expression.value)})`;
  if (expression.kind === 'i64-literal') return expression.value;
  const functions = proposalFunctions(
    expression,
    fields,
    resolveFunctions,
    resolveFunctionsForTypes
  );
  const operation =
    functions.find((candidate) => candidate.capabilityId === expression.capabilityId) ??
    functions[0];
  const argumentsText = expression.arguments.map((argument) =>
    formatDerivedExpression(argument, fields, resolveFunctions, resolveFunctionsForTypes)
  );
  if (operation == null) return `?(${argumentsText.join(', ')})`;
  if (operation.expressionTemplate != null) {
    return argumentsText.reduce(
      (template, value, index) =>
        template.replaceAll(`{${index}}`, value).replace('{column}', argumentsText[0] ?? ''),
      operation.expressionTemplate
    );
  }
  return `${operation.name.toUpperCase()}(${argumentsText.join(', ')})`;
}

export function DerivedExpressionNodeEditor({
  expression,
  fields,
  resolveFunctions,
  resolveFunctionsForTypes,
  allowLiterals,
  allowNested,
  legacySlots = false,
  busy,
  copy,
  depth = 0,
  onChange,
}: Readonly<{
  expression: DerivedExpressionDraft;
  fields: readonly DerivedOutputField[];
  resolveFunctions: DerivedExpressionFunctionResolver;
  resolveFunctionsForTypes?: DerivedExpressionTypeResolver;
  allowLiterals: boolean;
  allowNested: boolean;
  legacySlots?: boolean;
  busy: boolean;
  copy: DerivedExpressionCopy;
  depth?: number;
  onChange: (expression: DerivedExpressionDraft) => void;
}>): JSX.Element {
  const probeFieldId = firstFieldId(expression) ?? fields[0]?.fieldId ?? null;
  const functions = proposalFunctions(
    expression,
    fields,
    resolveFunctions,
    resolveFunctionsForTypes
  );
  const selectedFunction =
    expression.kind === 'function'
      ? functions.find((candidate) => candidate.capabilityId === expression.capabilityId) ??
        functions[0]
      : undefined;

  const changeKind = (kind: DerivedExpressionDraft['kind']) => {
    if (kind === 'field') return onChange(defaultField(fields, probeFieldId));
    if (kind === 'string-literal') return onChange({ kind, value: '' });
    if (kind === 'timestamp-literal') return onChange({ kind, value: '' });
    if (kind === 'i64-literal') return onChange({ kind, value: '' });
    const operation =
      functions.find(
        (candidate) =>
          candidate.minimumArgumentCount === 1 && candidate.maximumArgumentCount === 1
      ) ?? functions[0];
    if (operation == null) return;
    onChange({
      kind: 'function',
      capabilityId: operation.capabilityId,
      arguments: normalizeArguments(operation, [defaultField(fields, probeFieldId)], fields),
    });
  };

  const kindSelector =
    allowLiterals || (allowNested && depth > 0) ? (
      <label className="block space-y-1 text-xs">
        <span className="text-(--text-muted)">{copy.nodeTypeLabel ?? 'Node type'}</span>
        <select
          data-slot="derived-expression-node-kind"
          data-depth={depth}
          value={expression.kind}
          disabled={busy}
          className="h-8 w-full rounded border border-(--border-subtle) bg-(--surface-panel) px-2"
          onChange={(event) => changeKind(event.currentTarget.value as DerivedExpressionDraft['kind'])}
        >
          {allowNested && functions.length > 0 ? (
            <option value="function">{copy.functionNodeLabel ?? 'Function'}</option>
          ) : null}
          <option value="field">{copy.fieldNodeLabel ?? 'Field'}</option>
          {allowLiterals ? (
            <>
              <option value="string-literal">{copy.stringLiteralNodeLabel ?? 'Text constant'}</option>
              <option value="timestamp-literal">
                {copy.timestampLiteralNodeLabel ?? 'Timestamp constant'}
              </option>
              <option value="i64-literal">{copy.i64LiteralNodeLabel ?? 'Integer constant'}</option>
            </>
          ) : null}
        </select>
      </label>
    ) : null;

  if (expression.kind === 'field') {
    return (
      <div data-slot="derived-expression-field" className="space-y-2">
        {kindSelector}
        <select
          data-slot="derived-expression-field-select"
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
      </div>
    );
  }

  if (
    expression.kind === 'string-literal' ||
    expression.kind === 'timestamp-literal' ||
    expression.kind === 'i64-literal'
  ) {
    return (
      <div data-slot="derived-expression-literal" className="space-y-2">
        {kindSelector}
        <label className="block space-y-1 text-xs">
          <span className="text-(--text-muted)">{copy.literalValueLabel ?? 'Value'}</span>
          <input
            data-slot="derived-expression-literal-value"
            value={expression.value}
            disabled={busy}
            className="h-8 w-full rounded border border-(--border-subtle) bg-(--surface-panel) px-2"
            onChange={(event) => onChange({ ...expression, value: event.currentTarget.value })}
          />
        </label>
      </div>
    );
  }

  if (selectedFunction == null) {
    return (
      <div className="text-xs text-red-400">
        {copy.functionLabel}: unavailable
      </div>
    );
  }

  const range = bounds(selectedFunction, fields.length);
  const argumentsValue = normalizeArguments(selectedFunction, expression.arguments, fields);
  const updateArguments = (next: readonly DerivedExpressionDraft[]) =>
    onChange({
      kind: 'function',
      capabilityId: selectedFunction.capabilityId,
      arguments: normalizeArguments(selectedFunction, next, fields),
    });

  return (
    <div
      data-slot="derived-expression-function"
      data-depth={depth}
      className="space-y-2 rounded border border-(--border-subtle) bg-(--surface-panel) p-2"
    >
      {kindSelector}
      <label className="block space-y-1 text-xs">
        <span className="text-(--text-muted)">{copy.functionLabel}</span>
        <select
          name={depth === 0 ? 'capabilityId' : undefined}
          data-slot="derived-expression-function-select"
          data-depth={depth}
          value={selectedFunction.capabilityId}
          disabled={busy}
          className="h-8 w-full rounded border border-(--border-subtle) bg-(--surface-panel) px-2"
          onChange={(event) => {
            const operation = functions.find(
              (candidate) => candidate.capabilityId === event.currentTarget.value
            );
            if (operation == null) return;
            onChange({
              kind: 'function',
              capabilityId: operation.capabilityId,
              arguments: normalizeArguments(operation, expression.arguments, fields),
            });
          }}
        >
          {functions.map((operation) => (
            <option key={operation.capabilityId} value={operation.capabilityId}>
              {operation.name.toUpperCase()}
            </option>
          ))}
        </select>
      </label>
      <div className="space-y-2">
        <span className="text-xs text-(--text-muted)">{copy.operandsLabel}</span>
        {argumentsValue.map((argument, index) => {
          const compatibleFields =
            allowNested || expression.arguments.some((candidate) => candidate.kind !== 'field')
              ? fields
              : fields.filter((field) => {
                  const next = argumentsValue.map((candidate, slot) =>
                    slot === index ? ({ kind: 'field', fieldId: field.fieldId } as const) : candidate
                  );
                  if (next.some((candidate) => candidate.kind !== 'field')) return true;
                  return resolveFunctions(
                    next.map((candidate) => candidate.fieldId),
                    'complete'
                  ).some((candidate) => candidate.capabilityId === selectedFunction.capabilityId);
                });
          return (
            <div
              key={index}
              data-slot={
                legacySlots ? 'graph-node-expression-operand' : 'derived-expression-argument'
              }
              data-argument-index={index}
              data-depth={depth}
              className="flex items-start gap-1"
            >
              <div className="min-w-0 flex-1 rounded border border-(--border-subtle) bg-(--surface-elevated) p-2">
                <DerivedExpressionNodeEditor
                  expression={argument}
                  fields={compatibleFields}
                  resolveFunctions={resolveFunctions}
                  resolveFunctionsForTypes={resolveFunctionsForTypes}
                  allowLiterals={allowLiterals}
                  allowNested={allowNested}
                  legacySlots={legacySlots}
                  busy={busy}
                  copy={copy}
                  depth={depth + 1}
                  onChange={(next) =>
                    updateArguments(
                      argumentsValue.map((candidate, slot) => (slot === index ? next : candidate))
                    )
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  data-slot={legacySlots ? 'graph-node-expression-move-up' : undefined}
                  aria-label={copy.moveOperandUp.replace('{index}', String(index + 1))}
                  disabled={busy || index === 0}
                  onClick={() => {
                    const next = [...argumentsValue];
                    [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
                    updateArguments(next);
                  }}
                  className="grid size-7 place-items-center rounded border border-(--border-subtle) disabled:opacity-40"
                >
                  <ChevronUp className="size-3" />
                </button>
                <button
                  type="button"
                  data-slot={legacySlots ? 'graph-node-expression-move-down' : undefined}
                  aria-label={copy.moveOperandDown.replace('{index}', String(index + 1))}
                  disabled={busy || index === argumentsValue.length - 1}
                  onClick={() => {
                    const next = [...argumentsValue];
                    [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
                    updateArguments(next);
                  }}
                  className="grid size-7 place-items-center rounded border border-(--border-subtle) disabled:opacity-40"
                >
                  <ChevronDown className="size-3" />
                </button>
                <button
                  type="button"
                  data-slot={legacySlots ? 'graph-node-expression-remove' : undefined}
                  aria-label={copy.removeOperand.replace('{index}', String(index + 1))}
                  disabled={busy || argumentsValue.length <= range.minimum}
                  onClick={() => updateArguments(argumentsValue.filter((_, slot) => slot !== index))}
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
          data-slot={
            legacySlots ? 'graph-node-expression-add-operand' : 'derived-expression-add-argument'
          }
          disabled={busy || argumentsValue.length >= range.maximum}
          onClick={() => updateArguments([...argumentsValue, defaultField(fields, probeFieldId)])}
          className="flex items-center gap-1 text-xs text-(--status-info) disabled:opacity-40"
        >
          <Plus className="size-3" />
          {copy.addOperand}
        </button>
      </div>
    </div>
  );
}
