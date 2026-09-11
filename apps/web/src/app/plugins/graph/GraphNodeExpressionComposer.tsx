/** Owned concern: compose one governed calculated output from ordered field operands. */
import { PostgresIdentifierV1Schema } from '@dvt/contracts';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { useId, useMemo, useState, type FormEvent, type ReactElement } from 'react';

import { Input } from '../../components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '../../components/ui/popover';
import type {
  GraphNodeColumn,
  GraphNodeColumnCompositionFunctionResolver,
  GraphNodeColumnFunction,
  GraphNodeColumnFunctionApplyIdentity,
  GraphNodeColumnFunctionApplyResult,
} from './graphNodeColumnContracts';
import type { GraphNodeColumnCopy } from './GraphNodeColumnPiece';
import { graphNodeColumnClasses } from './graphVisualTokens';

export type GraphNodeExpressionComposerFunction = GraphNodeColumnFunction;

type OperandOption = Readonly<{ fieldId: string; label: string }>;

function boundsFor(operation: GraphNodeExpressionComposerFunction) {
  const minimum = operation.minimumArgumentCount;
  const maximum = operation.maximumArgumentCount ?? Number.MAX_SAFE_INTEGER;
  return minimum > 0 && maximum >= minimum ? { minimum, maximum } : { minimum: 1, maximum: 1 };
}

function operandOptions(columns: readonly GraphNodeColumn[]): readonly OperandOption[] {
  return [
    ...new Map(
      columns.map((column) => {
        const fieldId = column.id ?? column.name;
        return [fieldId, { fieldId, label: column.name }] as const;
      })
    ).values(),
  ];
}

function compatibleOperandOptions(args: {
  columns: readonly GraphNodeColumn[];
  initialColumnId: string;
  capabilityId?: string;
  resolveCompositionFunctions?: GraphNodeColumnCompositionFunctionResolver;
}): readonly OperandOption[] {
  const initialColumn = args.columns.find(
    (column) => (column.id ?? column.name) === args.initialColumnId
  );
  if (
    initialColumn == null ||
    args.capabilityId == null ||
    args.resolveCompositionFunctions == null
  ) {
    return operandOptions(args.columns);
  }
  return operandOptions(
    args.columns.filter((candidate) => {
      const candidateId = candidate.id ?? candidate.name;
      return (
        candidateId === args.initialColumnId ||
        args
          .resolveCompositionFunctions?.({
            targetType: initialColumn.type,
            sourceType: candidate.type,
          })
          .some((operation) => operation.capabilityId === args.capabilityId) === true
      );
    })
  );
}

function normalizeOperands(
  fieldIds: readonly string[],
  options: readonly OperandOption[],
  bounds: Readonly<{ minimum: number; maximum: number }>
): string[] {
  const available = new Set(options.map((option) => option.fieldId));
  const normalized = [...new Set(fieldIds)].filter((fieldId) => available.has(fieldId));
  for (const option of options) {
    if (normalized.length >= bounds.minimum) break;
    if (!normalized.includes(option.fieldId)) normalized.push(option.fieldId);
  }
  return normalized.slice(0, bounds.maximum);
}

function expressionPreview(
  operation: GraphNodeExpressionComposerFunction,
  fieldIds: readonly string[],
  options: readonly OperandOption[]
): string {
  const labels = new Map(options.map((option) => [option.fieldId, option.label] as const));
  const operands = fieldIds.map((fieldId) => labels.get(fieldId) ?? fieldId);
  if (operation.expressionTemplate != null && operands.length === 1) {
    return operation.expressionTemplate.replace('{column}', operands[0]!);
  }
  return operation.name.toUpperCase() + '(' + operands.join(', ') + ')';
}

export function GraphNodeExpressionComposer(props: {
  nodeId: string;
  columnId: string;
  functions: readonly GraphNodeExpressionComposerFunction[];
  initialCapabilityId: string;
  initialOperandFieldIds: readonly [string, ...string[]];
  operandCandidates: readonly GraphNodeColumn[];
  resolveCompositionFunctions?: GraphNodeColumnCompositionFunctionResolver;
  unavailableAliases: readonly string[];
  copy: GraphNodeColumnCopy;
  onApply: (identity: GraphNodeColumnFunctionApplyIdentity) => GraphNodeColumnFunctionApplyResult;
  onApplied?: (createdFieldId: string) => void;
  onCancel: () => void;
}): ReactElement | null {
  const functions = useMemo(
    () => [...new Map(props.functions.map((item) => [item.capabilityId, item])).values()],
    [props.functions]
  );
  const initialFunction =
    functions.find((item) => item.capabilityId === props.initialCapabilityId) ?? functions[0];
  const initialOptions = useMemo(
    () =>
      compatibleOperandOptions({
        columns: props.operandCandidates,
        initialColumnId: props.columnId,
        capabilityId: initialFunction?.capabilityId,
        resolveCompositionFunctions: props.resolveCompositionFunctions,
      }),
    [
      initialFunction?.capabilityId,
      props.columnId,
      props.operandCandidates,
      props.resolveCompositionFunctions,
    ]
  );
  const [capabilityId, setCapabilityId] = useState(initialFunction?.capabilityId ?? '');
  const operation = functions.find((item) => item.capabilityId === capabilityId) ?? initialFunction;
  const initialBounds =
    initialFunction == null ? { minimum: 1, maximum: 1 } : boundsFor(initialFunction);
  const [fieldIds, setFieldIds] = useState(() =>
    normalizeOperands(props.initialOperandFieldIds, initialOptions, initialBounds)
  );
  const [alias, setAlias] = useState('');
  const [commandRejected, setCommandRejected] = useState(false);
  const aliasId = useId();
  const errorId = useId();

  if (operation == null) return null;
  const bounds = boundsFor(operation);
  const options = compatibleOperandOptions({
    columns: props.operandCandidates,
    initialColumnId: props.columnId,
    capabilityId: operation.capabilityId,
    resolveCompositionFunctions: props.resolveCompositionFunctions,
  });
  const aliasViolatesPolicy =
    alias.length > 0 &&
    (alias !== alias.trim() || !PostgresIdentifierV1Schema.safeParse(alias).success);
  const aliasConflict = props.unavailableAliases.includes(alias);
  const operandsValid =
    fieldIds.length >= bounds.minimum &&
    fieldIds.length <= bounds.maximum &&
    new Set(fieldIds).size === fieldIds.length &&
    fieldIds.every((fieldId) => options.some((option) => option.fieldId === fieldId));
  const canAdd =
    fieldIds.length < bounds.maximum &&
    options.some((option) => !fieldIds.includes(option.fieldId));
  const canApply =
    alias.trim().length > 0 && !aliasViolatesPolicy && !aliasConflict && operandsValid;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canApply) return;
    const result = props.onApply({
      nodeId: props.nodeId,
      columnId: props.columnId,
      capabilityId: operation.capabilityId,
      alias,
      operandFieldIds: fieldIds as [string, ...string[]],
    });
    if (result?.outcome !== 'applied') {
      setCommandRejected(true);
      return;
    }
    props.onApplied?.(result.createdFieldId);
    props.onCancel();
  };

  return (
    <Popover open onOpenChange={(open) => !open && props.onCancel()}>
      <PopoverAnchor asChild>
        <span className={graphNodeColumnClasses.expressionComposerAnchor} />
      </PopoverAnchor>
      <PopoverContent
        data-slot="graph-node-expression-composer"
        side="right"
        align="center"
        className={graphNodeColumnClasses.expressionComposer}
      >
        <form onSubmit={submit} className={graphNodeColumnClasses.expressionComposerFields}>
          <h3 className={graphNodeColumnClasses.expressionComposerTitle}>
            {props.copy.expressionComposerTitle}
          </h3>
          <label className={graphNodeColumnClasses.expressionComposerLabel}>
            {props.copy.expressionComposerFunctionLabel}
            <select
              name="capabilityId"
              value={operation.capabilityId}
              className={graphNodeColumnClasses.expressionComposerControl}
              onChange={(event) => {
                const next = functions.find(
                  (item) => item.capabilityId === event.currentTarget.value
                );
                if (next == null) return;
                const nextOptions = compatibleOperandOptions({
                  columns: props.operandCandidates,
                  initialColumnId: props.columnId,
                  capabilityId: next.capabilityId,
                  resolveCompositionFunctions: props.resolveCompositionFunctions,
                });
                setCapabilityId(next.capabilityId);
                setFieldIds((current) => normalizeOperands(current, nextOptions, boundsFor(next)));
                setCommandRejected(false);
              }}
            >
              {functions.map((item) => (
                <option key={item.capabilityId} value={item.capabilityId}>
                  {item.name.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <fieldset className={graphNodeColumnClasses.expressionComposerOperands}>
            <legend className={graphNodeColumnClasses.expressionComposerLegend}>
              {props.copy.expressionComposerOperandsLabel}
            </legend>
            {fieldIds.map((fieldId, index) => (
              <div
                key={fieldId + ':' + String(index)}
                data-slot="graph-node-expression-operand"
                className={graphNodeColumnClasses.expressionComposerOperand}
              >
                <select
                  value={fieldId}
                  aria-label={props.copy.expressionComposerOperandLabelTemplate.replace(
                    '{index}',
                    String(index + 1)
                  )}
                  className={graphNodeColumnClasses.expressionComposerControl}
                  onChange={(event) => {
                    const nextFieldId = event.currentTarget.value;
                    setFieldIds((current) =>
                      current.map((item, itemIndex) => (itemIndex === index ? nextFieldId : item))
                    );
                    setCommandRejected(false);
                  }}
                >
                  {options.map((option) => (
                    <option
                      key={option.fieldId}
                      value={option.fieldId}
                      disabled={option.fieldId !== fieldId && fieldIds.includes(option.fieldId)}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  data-slot="graph-node-expression-move-up"
                  aria-label={props.copy.expressionComposerMoveOperandUpLabelTemplate.replace(
                    '{index}',
                    String(index + 1)
                  )}
                  disabled={index === 0}
                  className={graphNodeColumnClasses.expressionComposerIconButton}
                  onClick={() =>
                    setFieldIds((current) => {
                      const next = [...current];
                      [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
                      return next;
                    })
                  }
                >
                  <ChevronUp aria-hidden="true" className="size-3" />
                </button>
                <button
                  type="button"
                  data-slot="graph-node-expression-move-down"
                  aria-label={props.copy.expressionComposerMoveOperandDownLabelTemplate.replace(
                    '{index}',
                    String(index + 1)
                  )}
                  disabled={index === fieldIds.length - 1}
                  className={graphNodeColumnClasses.expressionComposerIconButton}
                  onClick={() =>
                    setFieldIds((current) => {
                      const next = [...current];
                      [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
                      return next;
                    })
                  }
                >
                  <ChevronDown aria-hidden="true" className="size-3" />
                </button>
                <button
                  type="button"
                  data-slot="graph-node-expression-remove"
                  aria-label={props.copy.expressionComposerRemoveOperandLabelTemplate.replace(
                    '{index}',
                    String(index + 1)
                  )}
                  disabled={fieldIds.length <= bounds.minimum}
                  className={graphNodeColumnClasses.expressionComposerIconButton}
                  onClick={() =>
                    setFieldIds((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  }
                >
                  <X aria-hidden="true" className="size-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              data-slot="graph-node-expression-add-operand"
              disabled={!canAdd}
              className={graphNodeColumnClasses.expressionComposerAddOperand}
              onClick={() => {
                const next = options.find((option) => !fieldIds.includes(option.fieldId));
                if (next != null) setFieldIds((current) => [...current, next.fieldId]);
              }}
            >
              <Plus aria-hidden="true" className="size-3" />
              {props.copy.expressionComposerAddOperandLabel}
            </button>
          </fieldset>
          <div className={graphNodeColumnClasses.expressionComposerPreview}>
            <span>{props.copy.expressionComposerPreviewLabel}</span>
            <code data-slot="graph-node-column-function-expression">
              {expressionPreview(operation, fieldIds, options)}
            </code>
          </div>
          <label htmlFor={aliasId} className={graphNodeColumnClasses.expressionComposerLabel}>
            {props.copy.columnFunctionAliasLabelTemplate.replace(
              '{function}',
              operation.name.toUpperCase()
            )}
          </label>
          <Input
            id={aliasId}
            data-slot="graph-node-column-function-alias-input"
            value={alias}
            autoFocus
            required
            aria-invalid={aliasConflict || aliasViolatesPolicy || commandRejected}
            aria-describedby={
              aliasConflict || aliasViolatesPolicy || commandRejected ? errorId : undefined
            }
            onChange={(event) => {
              setAlias(event.currentTarget.value);
              setCommandRejected(false);
            }}
          />
          {aliasConflict || aliasViolatesPolicy || commandRejected ? (
            <p id={errorId} role="alert" className={graphNodeColumnClasses.expressionComposerError}>
              {aliasConflict
                ? props.copy.columnFunctionAliasConflictLabel
                : aliasViolatesPolicy
                  ? props.copy.columnFunctionAliasPolicyErrorLabel
                  : props.copy.expressionComposerRejectedLabel}
            </p>
          ) : null}
          <div className={graphNodeColumnClasses.expressionComposerActions}>
            <button
              type="button"
              className={graphNodeColumnClasses.expressionComposerCancel}
              onClick={props.onCancel}
            >
              {props.copy.columnFunctionAliasCancelLabel}
            </button>
            <button
              type="submit"
              data-slot="graph-node-column-function-alias-submit"
              disabled={!canApply}
              className={graphNodeColumnClasses.expressionComposerSubmit}
            >
              {props.copy.columnFunctionAliasSubmitLabel}
            </button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
