/** Owned concern: confirm one explicit structured-field proposal. */
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
  const normalizedName = name.trim();
  const conflict =
    normalizedName !== props.allowedExistingName && props.unavailableNames.includes(normalizedName);
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
            if (normalizedName.length > 0 && !conflict) props.onApply(normalizedName);
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
              onChange={(event) => setName(event.currentTarget.value)}
            />
          </label>
          <div className={classes.preview}>
            <div className={classes.previewLabel}>{copy.preview}</div>
            {normalizedName || '…'} → {props.childNames.join(', ')}
          </div>
          {conflict ? (
            <p role="alert" className={classes.error}>
              {copy.conflict}
            </p>
          ) : null}
          <div className={classes.actions}>
            <button type="button" className={classes.cancel} onClick={props.onCancel}>
              {copy.cancel}
            </button>
            <button
              type="submit"
              data-slot="graph-node-structured-field-apply"
              disabled={normalizedName.length === 0 || conflict}
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
