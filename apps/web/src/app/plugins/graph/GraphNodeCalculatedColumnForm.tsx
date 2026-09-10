/** Owned concern: collect one bounded calculated-column request from the card gap. */
import {
  DvtStringLiteralV1Schema,
  DvtTimestampLiteralV1Schema,
  PostgresIdentifierV1Schema,
} from '@dvt/contracts';
import { Plus } from 'lucide-react';
import { useId, useMemo, useState, type FormEvent, type ReactElement } from 'react';

import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type {
  GraphNodeCalculatedColumnIdentity,
  GraphNodeColumn,
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

export function GraphNodeCalculatedColumnForm(props: {
  nodeId: string;
  columns: readonly GraphNodeColumn[];
  onSubmit: (identity: GraphNodeCalculatedColumnIdentity) => void;
}): ReactElement {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveGraphNodeCardCopy(language);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CalculationKind>('field-ref');
  const [alias, setAlias] = useState('');
  const [value, setValue] = useState('');
  const [inputFieldId, setInputFieldId] = useState(
    props.columns[0]?.id ?? props.columns[0]?.name ?? ''
  );
  const functions = useMemo(
    () =>
      props.columns.flatMap((column) =>
        (column.functionMenu?.items ?? []).map((item) => ({
          ...item,
          inputFieldId: column.id ?? column.name,
          inputName: column.name,
        }))
      ),
    [props.columns]
  );
  const compatibleFunctions = functions.filter((item) => item.inputFieldId === inputFieldId);
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
    props.onSubmit(identity);
    setOpen(false);
    setAlias('');
    setValue('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
              name="alias"
              required
              value={alias}
              aria-invalid={policyError?.field === 'alias' ? 'true' : undefined}
              aria-describedby={policyError?.field === 'alias' ? policyErrorId : undefined}
              onChange={(event) => setAlias(event.target.value)}
              className={graphNodeColumnClasses.addControl}
            />
          </label>
          {kind === 'string-literal' || kind === 'timestamp-literal' ? (
            <label className={graphNodeColumnClasses.addLabel}>
              {copy.calculatedColumnValueLabel}
              <input
                name="value"
                required={kind === 'timestamp-literal'}
                value={value}
                aria-invalid={policyError?.field === 'value' ? 'true' : undefined}
                aria-describedby={policyError?.field === 'value' ? policyErrorId : undefined}
                onChange={(event) => setValue(event.target.value)}
                className={graphNodeColumnClasses.addControl}
              />
            </label>
          ) : (
            <label className={graphNodeColumnClasses.addLabel}>
              {kind === 'row-number'
                ? copy.calculatedColumnOrderLabel
                : copy.calculatedColumnInputLabel}
              <select
                name="inputFieldId"
                value={inputFieldId}
                onChange={(event) => setInputFieldId(event.target.value)}
                className={graphNodeColumnClasses.addControl}
              >
                {props.columns.map((column) => (
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
                onChange={(event) => setCapabilityId(event.target.value)}
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
          {policyError ? (
            <p id={policyErrorId} role="alert" className="text-xs text-red-300">
              {policyError.message}
            </p>
          ) : null}
          <div className={graphNodeColumnClasses.addActions}>
            <button
              type="button"
              onClick={() => setOpen(false)}
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
