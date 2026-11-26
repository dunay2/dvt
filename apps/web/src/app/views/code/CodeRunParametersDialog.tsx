/** Owned concern: edit and validate the parameters of one explicit Code command. */
import type { RunParameterDefinition, RunParameterOverride } from '@dvt/contracts';
import { useId, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import {
  initialParameterDrafts,
  readParameterInput,
  type ParameterDraft,
} from './codeRunParameterInputs';
import type { resolveCodeModelCommandCopy } from './codeViewCopy';
import styles from './CodeModelCommandBar.module.css';

type Copy = ReturnType<typeof resolveCodeModelCommandCopy>;
type Props = Readonly<{
  command: 'compile' | 'execute' | 'parameters';
  definitions: RunParameterDefinition[];
  overrides: RunParameterOverride[];
  environmentId: string;
  busy: boolean;
  modelName: string;
  copy: Copy;
  onCancel: () => void;
  onConfirm: (values: RunParameterOverride[]) => Promise<void>;
  returnFocus: () => void;
}>;

export function CodeRunParametersDialog(props: Props) {
  const [drafts, setDrafts] = useState(() => initialParameterDrafts(props.overrides));
  const rows = props.definitions.map((definition) => ({
    definition,
    input: readParameterInput(definition, props.environmentId, drafts[definition.name]),
  }));
  const valid = rows.every(({ input }) => input.valid);
  const { copy } = props;
  function edit(name: string, patch: ParameterDraft) {
    setDrafts((previous) => ({ ...previous, [name]: { ...previous[name], ...patch } }));
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) props.onCancel();
      }}
    >
      <DialogContent
        className={styles.dialog}
        closeLabel={copy.close}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          props.returnFocus();
        }}
      >
        <DialogTitle className={styles.title}>
          {copy.parameters} · {props.modelName}
        </DialogTitle>
        <DialogDescription className={styles.description}>
          {copy.parameterDescription}
        </DialogDescription>
        <form
          className={styles.parameterForm}
          onSubmit={(event) => {
            event.preventDefault();
            if (valid && !props.busy)
              void props.onConfirm(rows.flatMap(({ input }) => input.overrides));
          }}
        >
          <div className={styles.fields}>
            {rows.map(({ definition, input }) => (
              <ParameterField
                key={definition.name}
                definition={definition}
                input={input}
                copy={copy}
                busy={props.busy}
                edit={(patch) => edit(definition.name, patch)}
              />
            ))}
          </div>
          <div className={styles.footer}>
            <Button type="button" variant="ghost" size="sm" onClick={props.onCancel}>
              {copy.cancel}
            </Button>
            <Button type="submit" size="sm" disabled={!valid || props.busy}>
              {props.busy
                ? copy.compiling
                : {
                    compile: copy.confirmCompile,
                    execute: copy.confirmExecute,
                    parameters: copy.saveParameters,
                  }[props.command]}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ParameterField({
  definition,
  input,
  copy,
  busy,
  edit,
}: Readonly<{
  definition: RunParameterDefinition;
  input: ReturnType<typeof readParameterInput>;
  copy: Copy;
  busy: boolean;
  edit: (patch: ParameterDraft) => void;
}>) {
  const id = useId();
  const description = id + '-description';
  const options =
    definition.type === 'boolean'
      ? [
          { value: 'true', label: copy.yes },
          { value: 'false', label: copy.no },
        ]
      : definition.choices?.map((value) => ({ value, label: value }));
  const field = {
    id,
    name: definition.name,
    disabled: busy || !input.enabled,
    value: input.text,
    'aria-describedby': description,
    'aria-invalid': !input.valid,
    'aria-required': input.enabled,
  };
  return (
    <div className={styles.parameter}>
      <div className={styles.fieldHeading}>
        <Label htmlFor={id}>{definition.name}</Label>
        {definition.enabledBy && (
          <Switch
            type="button"
            checked={input.enabled}
            disabled={busy}
            aria-label={copy.enable + ' ' + definition.name}
            onCheckedChange={(enabled) => edit({ enabled })}
          />
        )}
      </div>
      {options ? (
        <select
          {...field}
          className={styles.select}
          onChange={(event) => edit({ text: event.target.value })}
        >
          <option value="">{copy.choose}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <Input
          {...field}
          type={
            definition.type === 'date' ? 'date' : definition.type === 'integer' ? 'number' : 'text'
          }
          onChange={(event) => edit({ text: event.target.value })}
        />
      )}
      <span id={description} className={input.valid ? styles.description : styles.error}>
        {input.valid ? copy[input.source] : input.text.length ? copy.invalid : copy.required}
      </span>
    </div>
  );
}
