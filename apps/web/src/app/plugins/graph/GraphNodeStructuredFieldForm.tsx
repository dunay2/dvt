/** Owned concern: confirm one explicit structured-field proposal. */
import { PostgresIdentifierV1Schema } from '@dvt/contracts';
import { useId, useState, type ReactElement } from 'react';

import { Input } from '../../components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '../../components/ui/popover';
import { resolveGraphNodeStructuredFieldCopy } from './graphNodeStructuredFieldCopy';

const classes = {
  anchor: 'absolute left-1/2 top-1/2 size-px',
  form: 'nodrag nopan w-72 border-slate-700 bg-slate-950 p-3 text-slate-100',
  label: 'grid gap-1 text-xs font-medium text-slate-300',
  preview: 'mt-3 rounded border border-slate-800 bg-slate-900 p-2 text-xs text-slate-300',
  previewLabel: 'mb-1 text-[10px] uppercase tracking-wide text-slate-500',
  error: 'mt-2 text-xs text-red-300',
  actions: 'mt-3 flex justify-end gap-2',
  cancel: 'rounded px-2 py-1 text-xs text-slate-300 hover:bg-slate-800',
  apply: 'rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50',
} as const;

export function GraphNodeStructuredFieldForm(props: {
  language: string;
  childNames: readonly string[];
  unavailableNames: readonly string[];
  initialName?: string;
  allowedExistingName?: string;
  onApply: (name: string) => void;
  onCancel: () => void;
}): ReactElement {
  const copy = resolveGraphNodeStructuredFieldCopy(props.language);
  const [name, setName] = useState(props.initialName ?? '');
  const inputId = useId();
  const errorId = useId();

  const conflict = name !== props.allowedExistingName && props.unavailableNames.includes(name);
  const invalid =
    name.length > 0 &&
    (name !== name.trim() || !PostgresIdentifierV1Schema.safeParse(name).success);
  return (
    <Popover open onOpenChange={(open) => !open && props.onCancel()}>
      <PopoverAnchor asChild>
        <span className={classes.anchor} />
      </PopoverAnchor>
      <PopoverContent
        data-slot="graph-node-structured-field-form"
        side="right"
        align="center"
        className={classes.form}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim().length > 0 && !conflict && !invalid) props.onApply(name);
          }}
        >
          <label htmlFor={inputId} className={classes.label}>
            {copy.name}
            <Input
              id={inputId}
              data-slot="graph-node-structured-field-name"
              value={name}
              autoFocus
              required
              aria-invalid={conflict || invalid ? 'true' : undefined}
              aria-describedby={conflict || invalid ? errorId : undefined}
              onChange={(event) => setName(event.currentTarget.value)}
            />
          </label>
          <div className={classes.preview}>
            <div className={classes.previewLabel}>{copy.preview}</div>
            {name || '…'} → {props.childNames.join(', ')}
          </div>
          {conflict || invalid ? (
            <p id={errorId} role="alert" className={classes.error}>
              {conflict ? copy.conflict : copy.invalid}
            </p>
          ) : null}
          <div className={classes.actions}>
            <button type="button" className={classes.cancel} onClick={props.onCancel}>
              {copy.cancel}
            </button>
            <button
              type="submit"
              data-slot="graph-node-structured-field-apply"
              disabled={name.trim().length === 0 || conflict || invalid}
              className={classes.apply}
            >
              {copy.apply}
            </button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
