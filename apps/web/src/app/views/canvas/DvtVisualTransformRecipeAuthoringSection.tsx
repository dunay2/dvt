/** Owned concern: edit the bounded visual transform recipe in contextual Node Properties. */
import type {
  VisualTransformFilterV1,
  VisualTransformOperationV1,
  VisualTransformOutputColumnV1,
  VisualTransformRecipeV1,
} from '@dvt/contracts';
import type { Dispatch, SetStateAction } from 'react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { DvtVisualTransformAuthoringMetadata } from './canvasDvtAuthoringModel';
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';
import type { CanvasInspectorNodeDraftErrorCode } from './canvasInspectorAuthoringErrorCodes';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { canvasViewCopy } from './copy';

type InputColumn = Readonly<{
  nodeId: string;
  nodeName: string;
  name: string;
  type: string;
}>;

type OperationKind =
  | Exclude<VisualTransformOperationV1['kind'], 'function'>
  | 'trim'
  | 'upper'
  | 'lower'
  | 'coalesce'
  | 'concat';

const CAST_TYPES = [
  'text',
  'integer',
  'bigint',
  'numeric',
  'boolean',
  'date',
  'timestamp',
  'timestamptz',
  'jsonb',
] as const;
const FILTER_OPERATORS = [
  ['equals', '='],
  ['not_equals', '≠'],
  ['greater_than', '>'],
  ['greater_than_or_equal', '≥'],
  ['less_than', '<'],
  ['less_than_or_equal', '≤'],
  ['is_null', 'IS NULL'],
  ['is_not_null', 'IS NOT NULL'],
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readColumns(node: CanonicalNode): readonly InputColumn[] {
  const rawColumns = node.metadata?.columns;
  if (Array.isArray(rawColumns)) {
    return rawColumns.flatMap((candidate): readonly InputColumn[] => {
      if (!isRecord(candidate)) return [];
      const name = readString(candidate.name);
      if (name == null) return [];
      return [
        {
          nodeId: node.id,
          nodeName: node.name,
          name,
          type: readString(candidate.type ?? candidate.dataType) ?? 'unknown',
        },
      ];
    });
  }
  if (!isRecord(rawColumns)) return [];
  return Object.entries(rawColumns).flatMap(([fallbackName, candidate]): readonly InputColumn[] => {
    if (!isRecord(candidate)) return [];
    const name = readString(candidate.name) ?? fallbackName.trim();
    if (name.length === 0) return [];
    return [
      {
        nodeId: node.id,
        nodeName: node.name,
        name,
        type: readString(candidate.type ?? candidate.dataType) ?? 'unknown',
      },
    ];
  });
}

function resolveInputColumns(
  node: CanonicalNode,
  nodes: readonly CanonicalNode[],
  edges: readonly CanonicalEdge[]
): readonly InputColumn[] {
  const incomingNodeIds = new Set(
    edges.filter((edge) => edge.targetId === node.id).map((edge) => edge.sourceId)
  );
  return nodes.filter((candidate) => incomingNodeIds.has(candidate.id)).flatMap(readColumns);
}

function operationKind(operation: VisualTransformOperationV1): OperationKind {
  return operation.kind === 'function' ? operation.functionId : operation.kind;
}

function createOperation(kind: OperationKind): VisualTransformOperationV1 {
  switch (kind) {
    case 'passthrough':
      return { kind };
    case 'cast':
      return { kind, targetType: 'text' };
    case 'constant':
      return { kind, value: '' };
    case 'coalesce':
      return { kind: 'function', functionId: kind, args: [''] };
    case 'concat':
      return { kind: 'function', functionId: kind, args: [' '] };
    case 'trim':
    case 'upper':
    case 'lower':
      return { kind: 'function', functionId: kind, args: [] };
  }
}

function normalizeExpression(
  inputs: VisualTransformOutputColumnV1['expression']['inputs'],
  operations: readonly VisualTransformOperationV1[]
): VisualTransformOutputColumnV1['expression'] {
  if (inputs.length === 0) {
    const constant = operations.find((operation) => operation.kind === 'constant');
    return { inputs: [], operations: [constant ?? { kind: 'constant', value: '' }] };
  }

  const withoutConstants = operations.filter((operation) => operation.kind !== 'constant');
  const nextOperations =
    withoutConstants.length === 0 ? [{ kind: 'passthrough' } as const] : [...withoutConstants];
  if (inputs.length > 1) {
    const first = nextOperations[0];
    if (first?.kind !== 'function' || first.functionId !== 'concat') {
      nextOperations[0] = { kind: 'function', functionId: 'concat', args: [' '] };
    }
  } else {
    const first = nextOperations[0];
    if (first?.kind === 'function' && first.functionId === 'concat') {
      nextOperations[0] = { kind: 'passthrough' };
    }
  }
  return { inputs, operations: nextOperations };
}

function nextStableId(prefix: 'output' | 'filter', currentIds: readonly string[]): string {
  let index = currentIds.length + 1;
  while (currentIds.includes(`${prefix}:visual_${index}`)) index += 1;
  return `${prefix}:visual_${index}`;
}

function updateOutput(
  recipe: VisualTransformRecipeV1,
  outputId: string,
  update: (output: VisualTransformOutputColumnV1) => VisualTransformOutputColumnV1
): VisualTransformRecipeV1 {
  return {
    ...recipe,
    outputs: recipe.outputs.map((output) => (output.id === outputId ? update(output) : output)),
  };
}

function updateFilter(
  recipe: VisualTransformRecipeV1,
  filterId: string,
  update: (filter: VisualTransformFilterV1) => VisualTransformFilterV1
): VisualTransformRecipeV1 {
  return {
    ...recipe,
    filters: recipe.filters.map((filter) => (filter.id === filterId ? update(filter) : filter)),
  };
}

export function DvtVisualTransformRecipeAuthoringSection({
  node,
  nodes,
  edges,
  disabled,
  draft,
  error,
  onChange,
}: Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  disabled: boolean;
  draft: DvtVisualTransformAuthoringMetadata;
  error: CanvasInspectorNodeDraftErrorCode | undefined;
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
}>): JSX.Element {
  const inputColumns = resolveInputColumns(node, nodes, edges);
  const mutateRecipe = (update: (recipe: VisualTransformRecipeV1) => VisualTransformRecipeV1) => {
    onChange((currentDraft) =>
      currentDraft.dvt?.kind === 'transform' && currentDraft.dvt.mode === 'visual'
        ? {
            ...currentDraft,
            dvt: { ...currentDraft.dvt, recipe: update(currentDraft.dvt.recipe) },
          }
        : currentDraft
    );
  };

  const addOutput = (): void => {
    const input =
      inputColumns.find((column) =>
        draft.recipe.outputs.every((output) =>
          output.expression.inputs.every(
            (candidate) =>
              candidate.nodeId !== column.nodeId || candidate.columnName !== column.name
          )
        )
      ) ?? inputColumns[0];
    const id = nextStableId(
      'output',
      draft.recipe.outputs.map((output) => output.id)
    );
    const output: VisualTransformOutputColumnV1 = input
      ? {
          id,
          name: input.name,
          dataType: input.type,
          expression: {
            inputs: [{ nodeId: input.nodeId, columnName: input.name }],
            operations: [{ kind: 'passthrough' }],
          },
        }
      : {
          id,
          name: `column_${draft.recipe.outputs.length + 1}`,
          expression: { inputs: [], operations: [{ kind: 'constant', value: '' }] },
        };
    mutateRecipe((recipe) => ({ ...recipe, outputs: [...recipe.outputs, output] }));
  };

  const addFilter = (): void => {
    const input = inputColumns[0];
    if (input == null) return;
    const filter: VisualTransformFilterV1 = {
      id: nextStableId(
        'filter',
        draft.recipe.filters.map((candidate) => candidate.id)
      ),
      input: { nodeId: input.nodeId, columnName: input.name },
      operator: 'is_not_null',
    };
    mutateRecipe((recipe) => ({ ...recipe, filters: [...recipe.filters, filter] }));
  };

  return (
    <div data-slot="dvt-visual-recipe-authoring" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
          {canvasViewCopy.inspectorDvtVisualRecipeTitle}
        </h3>
        <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={addOutput}>
          {canvasViewCopy.inspectorDvtVisualAddOutputLabel}
        </Button>
      </div>

      {draft.recipe.outputs.map((output, outputIndex) => (
        <fieldset
          key={output.id}
          data-slot="dvt-visual-output"
          className="space-y-3 rounded-md border border-[color:var(--border-default)] p-3"
        >
          <legend className="px-1 text-xs font-semibold text-(--text-default)">
            {canvasViewCopy.inspectorDvtVisualOutputLabel} {outputIndex + 1}
          </legend>
          <div className="space-y-2">
            <Label htmlFor={`dvt-visual-output-${output.id}`}>
              {canvasViewCopy.inspectorDvtVisualOutputNameLabel}
            </Label>
            <Input
              id={`dvt-visual-output-${output.id}`}
              data-slot="dvt-visual-output-name"
              disabled={disabled}
              value={output.name}
              onChange={(event) =>
                mutateRecipe((recipe) =>
                  updateOutput(recipe, output.id, (candidate) => ({
                    ...candidate,
                    name: event.target.value,
                  }))
                )
              }
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-(--text-default)">
              {canvasViewCopy.inspectorDvtVisualInputsLabel}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {inputColumns.map((column) => {
                const checked = output.expression.inputs.some(
                  (input) => input.nodeId === column.nodeId && input.columnName === column.name
                );
                return (
                  <label
                    key={`${column.nodeId}:${column.name}`}
                    className="flex min-w-0 items-center gap-2 rounded border border-[color:var(--border-default)] px-2 py-1.5 text-xs"
                  >
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={checked}
                      onChange={(event) =>
                        mutateRecipe((recipe) =>
                          updateOutput(recipe, output.id, (candidate) => {
                            const input = { nodeId: column.nodeId, columnName: column.name };
                            const inputs = event.target.checked
                              ? [...candidate.expression.inputs, input]
                              : candidate.expression.inputs.filter(
                                  (current) =>
                                    current.nodeId !== input.nodeId ||
                                    current.columnName !== input.columnName
                                );
                            return {
                              ...candidate,
                              expression: normalizeExpression(
                                inputs,
                                candidate.expression.operations
                              ),
                            };
                          })
                        )
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {column.nodeName} · {column.name}
                    </span>
                    <span className="shrink-0 text-(--text-muted)">{column.type}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-(--text-default)">
              {canvasViewCopy.inspectorDvtVisualOperationsLabel}
            </p>
            {output.expression.operations.map((operation, operationIndex) => {
              const kind = operationKind(operation);
              const locksConcat =
                output.expression.inputs.length > 1 && operationIndex === 0 && kind === 'concat';
              return (
                <div
                  key={`${output.id}:operation:${operationIndex}`}
                  data-slot="dvt-visual-operation"
                  className="grid grid-cols-1 gap-2 rounded bg-[var(--surface-elevated)] p-2"
                >
                  <Label htmlFor={`dvt-visual-operation-${output.id}-${operationIndex}`}>
                    {canvasViewCopy.inspectorDvtVisualOperationLabel} {operationIndex + 1}
                  </Label>
                  <select
                    id={`dvt-visual-operation-${output.id}-${operationIndex}`}
                    data-slot="dvt-visual-operation-kind"
                    className={inspectorVisualClasses.inspectorSelectInput}
                    disabled={disabled || locksConcat}
                    value={kind}
                    onChange={(event) => {
                      const nextKind = event.target.value as OperationKind;
                      mutateRecipe((recipe) =>
                        updateOutput(recipe, output.id, (candidate) => {
                          if (nextKind === 'constant') {
                            return {
                              ...candidate,
                              expression: { inputs: [], operations: [createOperation(nextKind)] },
                            };
                          }
                          const inputs =
                            candidate.expression.inputs.length > 0
                              ? candidate.expression.inputs
                              : inputColumns[0]
                                ? [
                                    {
                                      nodeId: inputColumns[0].nodeId,
                                      columnName: inputColumns[0].name,
                                    },
                                  ]
                                : [];
                          const operations = candidate.expression.operations.map(
                            (current, index) =>
                              index === operationIndex ? createOperation(nextKind) : current
                          );
                          return {
                            ...candidate,
                            expression: normalizeExpression(inputs, operations),
                          };
                        })
                      );
                    }}
                  >
                    <option value="passthrough">
                      {canvasViewCopy.inspectorDvtVisualPassthroughLabel}
                    </option>
                    <option value="cast">CAST</option>
                    <option value="trim">TRIM</option>
                    <option value="upper">UPPER</option>
                    <option value="lower">LOWER</option>
                    <option value="coalesce">COALESCE</option>
                    <option value="concat">CONCAT</option>
                    <option value="constant">
                      {canvasViewCopy.inspectorDvtVisualConstantLabel}
                    </option>
                  </select>

                  {operation.kind === 'cast' ? (
                    <select
                      aria-label={canvasViewCopy.inspectorDvtVisualCastTypeLabel}
                      className={inspectorVisualClasses.inspectorSelectInput}
                      disabled={disabled}
                      value={operation.targetType}
                      onChange={(event) =>
                        mutateRecipe((recipe) =>
                          updateOutput(recipe, output.id, (candidate) => ({
                            ...candidate,
                            expression: {
                              ...candidate.expression,
                              operations: candidate.expression.operations.map((current, index) =>
                                index === operationIndex && current.kind === 'cast'
                                  ? { ...current, targetType: event.target.value }
                                  : current
                              ),
                            },
                          }))
                        )
                      }
                    >
                      {CAST_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  {operation.kind === 'constant' ||
                  (operation.kind === 'function' &&
                    (operation.functionId === 'coalesce' || operation.functionId === 'concat')) ? (
                    <Input
                      aria-label={canvasViewCopy.inspectorDvtVisualArgumentLabel}
                      disabled={disabled}
                      value={
                        operation.kind === 'constant'
                          ? String(operation.value ?? '')
                          : String(operation.args[0] ?? '')
                      }
                      onChange={(event) =>
                        mutateRecipe((recipe) =>
                          updateOutput(recipe, output.id, (candidate) => ({
                            ...candidate,
                            expression: {
                              ...candidate.expression,
                              operations: candidate.expression.operations.map((current, index) => {
                                if (index !== operationIndex) return current;
                                return current.kind === 'constant'
                                  ? { ...current, value: event.target.value }
                                  : current.kind === 'function'
                                    ? { ...current, args: [event.target.value] }
                                    : current;
                              }),
                            },
                          }))
                        )
                      }
                    />
                  ) : null}

                  <div className="flex flex-wrap justify-end gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={canvasViewCopy.inspectorDvtVisualMoveOperationUpLabel}
                      disabled={disabled || operationIndex === 0 || locksConcat}
                      onClick={() =>
                        mutateRecipe((recipe) =>
                          updateOutput(recipe, output.id, (candidate) => {
                            const operations = [...candidate.expression.operations];
                            [operations[operationIndex - 1], operations[operationIndex]] = [
                              operations[operationIndex]!,
                              operations[operationIndex - 1]!,
                            ];
                            return {
                              ...candidate,
                              expression: { ...candidate.expression, operations },
                            };
                          })
                        )
                      }
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={canvasViewCopy.inspectorDvtVisualMoveOperationDownLabel}
                      disabled={
                        disabled ||
                        operationIndex === output.expression.operations.length - 1 ||
                        locksConcat
                      }
                      onClick={() =>
                        mutateRecipe((recipe) =>
                          updateOutput(recipe, output.id, (candidate) => {
                            const operations = [...candidate.expression.operations];
                            [operations[operationIndex], operations[operationIndex + 1]] = [
                              operations[operationIndex + 1]!,
                              operations[operationIndex]!,
                            ];
                            return {
                              ...candidate,
                              expression: { ...candidate.expression, operations },
                            };
                          })
                        )
                      }
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={canvasViewCopy.inspectorDvtVisualRemoveOperationLabel}
                      disabled={
                        disabled || output.expression.operations.length === 1 || locksConcat
                      }
                      onClick={() =>
                        mutateRecipe((recipe) =>
                          updateOutput(recipe, output.id, (candidate) => ({
                            ...candidate,
                            expression: normalizeExpression(
                              candidate.expression.inputs,
                              candidate.expression.operations.filter(
                                (_, index) => index !== operationIndex
                              )
                            ),
                          }))
                        )
                      }
                    >
                      {canvasViewCopy.inspectorDvtVisualRemoveOperationLabel}
                    </Button>
                  </div>
                </div>
              );
            })}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              data-action="add-visual-operation"
              disabled={disabled || output.expression.inputs.length === 0}
              onClick={() =>
                mutateRecipe((recipe) =>
                  updateOutput(recipe, output.id, (candidate) => ({
                    ...candidate,
                    expression: {
                      ...candidate.expression,
                      operations: [...candidate.expression.operations, createOperation('trim')],
                    },
                  }))
                )
              }
            >
              {canvasViewCopy.inspectorDvtVisualAddOperationLabel}
            </Button>
          </div>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() =>
              mutateRecipe((recipe) => ({
                ...recipe,
                outputs: recipe.outputs.filter((candidate) => candidate.id !== output.id),
              }))
            }
          >
            {canvasViewCopy.inspectorDvtVisualExcludeOutputLabel}
          </Button>
        </fieldset>
      ))}

      <section className="space-y-3 border-t border-[color:var(--border-default)] pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className={inspectorVisualClasses.contextPanelSectionTitle}>
            {canvasViewCopy.inspectorDvtVisualFiltersLabel}
          </h4>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            data-action="add-visual-filter"
            disabled={disabled || inputColumns.length === 0}
            onClick={addFilter}
          >
            {canvasViewCopy.inspectorDvtVisualAddFilterLabel}
          </Button>
        </div>
        {draft.recipe.filters.map((filter) => {
          const inputValue = `${filter.input.nodeId}\u0000${filter.input.columnName}`;
          return (
            <div
              key={filter.id}
              data-slot="dvt-visual-filter"
              className="grid grid-cols-1 gap-2 rounded-md border border-[color:var(--border-default)] p-3"
            >
              <select
                aria-label={canvasViewCopy.inspectorDvtVisualFilterColumnLabel}
                className={inspectorVisualClasses.inspectorSelectInput}
                disabled={disabled}
                value={inputValue}
                onChange={(event) => {
                  const [nodeId, columnName] = event.target.value.split('\u0000');
                  if (nodeId == null || columnName == null) return;
                  mutateRecipe((recipe) =>
                    updateFilter(recipe, filter.id, (candidate) => ({
                      ...candidate,
                      input: { nodeId, columnName },
                    }))
                  );
                }}
              >
                {inputColumns.map((column) => (
                  <option
                    key={`${column.nodeId}:${column.name}`}
                    value={`${column.nodeId}\u0000${column.name}`}
                  >
                    {column.nodeName} · {column.name}
                  </option>
                ))}
              </select>
              <select
                aria-label={canvasViewCopy.inspectorDvtVisualFilterOperatorLabel}
                className={inspectorVisualClasses.inspectorSelectInput}
                disabled={disabled}
                value={filter.operator}
                onChange={(event) => {
                  const operator = event.target.value as VisualTransformFilterV1['operator'];
                  mutateRecipe((recipe) =>
                    updateFilter(recipe, filter.id, (candidate) =>
                      operator === 'is_null' || operator === 'is_not_null'
                        ? { id: candidate.id, input: candidate.input, operator }
                        : {
                            id: candidate.id,
                            input: candidate.input,
                            operator,
                            value: 'value' in candidate ? candidate.value : '',
                          }
                    )
                  );
                }}
              >
                {FILTER_OPERATORS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {'value' in filter ? (
                <Input
                  aria-label={canvasViewCopy.inspectorDvtVisualFilterValueLabel}
                  disabled={disabled}
                  value={String(filter.value ?? '')}
                  onChange={(event) =>
                    mutateRecipe((recipe) =>
                      updateFilter(recipe, filter.id, (candidate) =>
                        'value' in candidate
                          ? { ...candidate, value: event.target.value }
                          : candidate
                      )
                    )
                  }
                />
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={() =>
                  mutateRecipe((recipe) => ({
                    ...recipe,
                    filters: recipe.filters.filter((candidate) => candidate.id !== filter.id),
                  }))
                }
              >
                {canvasViewCopy.inspectorDvtVisualRemoveFilterLabel}
              </Button>
            </div>
          );
        })}
      </section>
      {error ? (
        <p className={inspectorVisualClasses.inspectorErrorText} role="alert">
          {formatCanvasInspectorNodeDraftError(error, canvasViewCopy)}
        </p>
      ) : null}
    </div>
  );
}
