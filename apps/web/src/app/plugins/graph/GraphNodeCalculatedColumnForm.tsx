/** Owned concern: collect one bounded calculated-column request from the card gap. */
import {
  DvtStringLiteralV1Schema,
  DvtTimestampLiteralV1Schema,
  PostgresIdentifierV1Schema,
} from '@dvt/contracts';
import { Plus } from 'lucide-react';
import { useId, useMemo, useRef, useState, type FormEvent, type ReactElement } from 'react';

import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type {
  GraphNodeCalculatedColumnIdentity,
  GraphNodeColumn,
  GraphNodeColumnFunctionApplyResult,
} from './graphNodeColumnContracts';
import { resolveGraphNodeCardCopy } from './graphNodeCardCopyTokens';
import { graphNodeColumnClasses } from './graphVisualTokens';

type CalculationKind = GraphNodeCalculatedColumnIdentity['kind'];
const KINDS: readonly CalculationKind[] = [
  'field-ref',
  'string-literal',
  'timestamp-literal',
  'scalar-function',
  'row-number',
];

type CalculatedColumnCommandError = Readonly<{
  field: 'alias' | 'value' | 'input';
  message: string;
}>;

function resolveCalculatedColumnCommandError(
  copy: ReturnType<typeof resolveGraphNodeCardCopy>,
  reason: Extract<GraphNodeColumnFunctionApplyResult, { outcome: 'rejected' }>['reason'],
  kind: CalculationKind
): CalculatedColumnCommandError {
  if (reason === 'duplicate_alias') {
    return { field: 'alias', message: copy.columnFunctionAliasConflictLabel };
  }
  if (reason === 'invalid_alias') {
    return { field: 'alias', message: copy.calculatedColumnIdentifierPolicyError };
  }
  if (reason === 'invalid_literal') {
    return {
      field: 'value',
      message:
        kind === 'timestamp-literal'
          ? copy.calculatedColumnTimestampPolicyError
          : copy.calculatedColumnLiteralPolicyError,
    };
  }
  if (reason === 'invalid_reference') {
    return { field: 'input', message: copy.columnAuthoringInvalidReferenceLabel };
  }
  return { field: 'alias', message: copy.expressionComposerRejectedLabel };
}

export function GraphNodeCalculatedColumnForm(props: {
  nodeId: string;
  inputColumns: readonly GraphNodeColumn[];
  initialInputFieldId?: string;
  onClose?: () => void;
  onSubmit: (identity: GraphNodeCalculatedColumnIdentity) => GraphNodeColumnFunctionApplyResult;
  onApplied?: (createdFieldId: string) => void;
}): ReactElement {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveGraphNodeCardCopy(language);
  const [open, setOpen] = useState(props.initialInputFieldId != null);
  const [kind, setKind] = useState<CalculationKind>('field-ref');
  const [alias, setAlias] = useState('');
  const [value, setValue] = useState('');
  const [commandError, setCommandError] = useState<CalculatedColumnCommandError | null>(null);
  const aliasInputRef = useRef<HTMLInputElement>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);
  const inputFieldRef = useRef<HTMLSelectElement>(null);
  const [inputFieldId, setInputFieldId] = useState(
    props.initialInputFieldId ?? props.inputColumns[0]?.id ?? props.inputColumns[0]?.name ?? ''
  );
  const functions = useMemo(
    () =>
      props.inputColumns.flatMap((column) =>
        (column.functionMenu?.items ?? []).map((item) => ({
          ...item,
          inputFieldId: column.id ?? column.name,
          inputName: column.name,
        }))
      ),
    [props.inputColumns]
  );
  const compatibleFunctions = functions.filter(
    (item) =>
      item.inputFieldId === inputFieldId &&
      item.minimumArgumentCount === 1 &&
      item.maximumArgumentCount === 1
  );
  const [capabilityId, setCapabilityId] = useState('');
  const policyErrorId = useId();
  const selectedCapabilityId = compatibleFunctions.some(
    (item) => item.capabilityId === capabilityId
  )
    ? capabilityId
    : (compatibleFunctions[0]?.capabilityId ?? '');

  const aliasValid = alias === alias.trim() && PostgresIdentifierV1Schema.safeParse(alias).success;
  const valueValid =
    kind === 'string-literal'
      ? DvtStringLiteralV1Schema.safeParse(value).success
      : kind === 'timestamp-literal'
        ? DvtTimestampLiteralV1Schema.safeParse(value).success
        : true;
  const policyError =
    alias.length > 0 && !aliasValid
      ? { field: 'alias' as const, message: copy.calculatedColumnIdentifierPolicyError }
      : kind === 'string-literal' && !valueValid
        ? { field: 'value' as const, message: copy.calculatedColumnLiteralPolicyError }
        : kind === 'timestamp-literal' && value.length > 0 && !valueValid
          ? { field: 'value' as const, message: copy.calculatedColumnTimestampPolicyError }
          : null;
  const requiredSelectionPresent =
    kind === 'field-ref' || kind === 'row-number'
      ? inputFieldId.length > 0
      : kind === 'scalar-function'
        ? inputFieldId.length > 0 && selectedCapabilityId.length > 0
        : true;
  const canSubmit = alias.trim().length > 0 && aliasValid && valueValid && requiredSelectionPresent;
  const visibleError = policyError ?? commandError;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (alias.trim().length === 0 || !PostgresIdentifierV1Schema.safeParse(alias).success) {
      return;
    }
    if (kind === 'string-literal' && !DvtStringLiteralV1Schema.safeParse(value).success) {
      return;
    }
    if (kind === 'timestamp-literal' && !DvtTimestampLiteralV1Schema.safeParse(value).success) {
      return;
    }
    let identity: GraphNodeCalculatedColumnIdentity | null = null;
    if (kind === 'field-ref' && inputFieldId) {
      identity = { nodeId: props.nodeId, kind, alias, inputFieldId };
    } else if (kind === 'string-literal' || kind === 'timestamp-literal') {
      identity = { nodeId: props.nodeId, kind, alias, value };
    } else if (kind === 'scalar-function' && inputFieldId && selectedCapabilityId) {
      identity = {
        nodeId: props.nodeId,
        kind,
        alias,
        inputFieldId,
        capabilityId: selectedCapabilityId,
      };
    } else if (kind === 'row-number' && inputFieldId) {
      identity = {
        nodeId: props.nodeId,
        kind,
        alias,
        orderFieldId: inputFieldId,
      };
    }
    if (identity == null) return;
    const result = props.onSubmit(identity);
    if (result.outcome === 'rejected') {
      const rejection = resolveCalculatedColumnCommandError(copy, result.reason, kind);
      setCommandError(rejection);
      if (rejection.field === 'alias') aliasInputRef.current?.focus();
      if (rejection.field === 'value') valueInputRef.current?.focus();
      if (rejection.field === 'input') inputFieldRef.current?.focus();
      return;
    }
    props.onApplied?.(result.createdFieldId);
    setOpen(false);
    setAlias('');
    setValue('');
    setCommandError(null);
    props.onClose?.();
  };

  return (
    <Popover
      modal
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setCommandError(null);
          props.onClose?.();
        }
      }}
    >
      <div data-slot="graph-node-calculated-column-gap" className={graphNodeColumnClasses.addGap}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-slot="graph-node-calculated-column-trigger"
            {...canvasNodeEmbeddedControlProps}
            aria-haspopup="dialog"
            aria-label={copy.addCalculatedColumnLabel}
            className={graphNodeColumnClasses.addTrigger}
          >
            <Plus aria-hidden="true" className={graphNodeColumnClasses.addIcon} />
          </button>
        </PopoverTrigger>
      </div>
      <PopoverContent
        data-slot="graph-node-calculated-column-form"
        {...canvasNodeEmbeddedControlProps}
        side="right"
        align="end"
        className={graphNodeColumnClasses.addForm}
      >
        <form onSubmit={submit} className={graphNodeColumnClasses.addFormFields}>
          <label className={graphNodeColumnClasses.addLabel}>
            {copy.calculatedColumnKindLabel}
            <select
              name="kind"
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as CalculationKind);
                setCommandError(null);
              }}
              className={graphNodeColumnClasses.addControl}
            >
              {KINDS.map((option) => (
                <option key={option} value={option}>
                  {copy.calculatedColumnKindLabels[option]}
                </option>
              ))}
            </select>
          </label>
          <label className={graphNodeColumnClasses.addLabel}>
            {copy.calculatedColumnAliasLabel}
            <input
              ref={aliasInputRef}
              name="alias"
              required
              value={alias}
              aria-invalid={visibleError?.field === 'alias' ? 'true' : undefined}
              aria-describedby={visibleError?.field === 'alias' ? policyErrorId : undefined}
              onChange={(event) => {
                setAlias(event.target.value);
                setCommandError(null);
              }}
              className={graphNodeColumnClasses.addControl}
            />
          </label>
          {kind === 'string-literal' || kind === 'timestamp-literal' ? (
            <label className={graphNodeColumnClasses.addLabel}>
              {copy.calculatedColumnValueLabel}
              <input
                ref={valueInputRef}
                name="value"
                required={kind === 'timestamp-literal'}
                value={value}
                aria-invalid={visibleError?.field === 'value' ? 'true' : undefined}
                aria-describedby={visibleError?.field === 'value' ? policyErrorId : undefined}
                onChange={(event) => {
                  setValue(event.target.value);
                  setCommandError(null);
                }}
                className={graphNodeColumnClasses.addControl}
              />
            </label>
          ) : (
            <label className={graphNodeColumnClasses.addLabel}>
              {kind === 'row-number'
                ? copy.calculatedColumnOrderLabel
                : copy.calculatedColumnInputLabel}
              <select
                ref={inputFieldRef}
                name="inputFieldId"
                value={inputFieldId}
                aria-invalid={visibleError?.field === 'input' ? 'true' : undefined}
                aria-describedby={visibleError?.field === 'input' ? policyErrorId : undefined}
                onChange={(event) => {
                  setInputFieldId(event.target.value);
                  setCommandError(null);
                }}
                className={graphNodeColumnClasses.addControl}
              >
                {props.inputColumns.map((column) => (
                  <option key={column.id ?? column.name} value={column.id ?? column.name}>
                    {column.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {kind === 'scalar-function' ? (
            <label className={graphNodeColumnClasses.addLabel}>
              {copy.calculatedColumnFunctionLabel}
              <select
                name="capabilityId"
                value={selectedCapabilityId}
                onChange={(event) => {
                  setCapabilityId(event.target.value);
                  setCommandError(null);
                }}
                className={graphNodeColumnClasses.addControl}
              >
                {compatibleFunctions.map((item) => (
                  <option key={item.capabilityId} value={item.capabilityId}>
                    {item.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {visibleError ? (
            <p id={policyErrorId} role="alert" className="text-xs text-red-300">
              {visibleError.message}
            </p>
          ) : null}
          <div className={graphNodeColumnClasses.addActions}>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                props.onClose?.();
              }}
              className={graphNodeColumnClasses.addCancel}
            >
              {copy.calculatedColumnCancelLabel}
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={graphNodeColumnClasses.addSubmit}
            >
              {copy.calculatedColumnSubmitLabel}
            </button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
