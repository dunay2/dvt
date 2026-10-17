/** Passive destination fields shared by Transform results and explicit Sinks. */
import { useId } from 'react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { CanvasViewCopy } from './canvasCopy.types';
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';
import type { DvtDestinationBinding, DvtDestinationChoiceBinding } from './dvtDestinationBinding';
import styles from './dvtDestinationFields.module.css';

export function DvtDestinationChoiceField({
  binding,
  name,
  label,
  copy,
}: Readonly<{
  binding: DvtDestinationChoiceBinding;
  name: string;
  label: string;
  copy: CanvasViewCopy;
}>): JSX.Element {
  const id = useId();
  return (
    <div className={styles.field}>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={name}
        value={binding.value}
        disabled={binding.disabled}
        className={inspectorVisualClasses.inspectorSelectInput}
        aria-invalid={binding.error ? 'true' : undefined}
        aria-describedby={binding.error ? `${id}-error` : undefined}
        onChange={(event) => binding.setValue(event.target.value)}
      >
        {binding.options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {binding.error ? (
        <p id={`${id}-error`} role="alert" className={inspectorVisualClasses.inspectorErrorText}>
          {formatCanvasInspectorNodeDraftError(binding.error, copy)}
        </p>
      ) : null}
    </div>
  );
}

export function DvtPostgresDestinationFields({
  binding,
  namespace,
  copy,
}: Readonly<{
  binding: DvtDestinationBinding;
  namespace: 'dvt-transform-result' | 'dvt-sink';
  copy: CanvasViewCopy;
}>): JSX.Element {
  const id = useId();
  const { model } = binding;
  return (
    <fieldset className={styles.fields} data-slot={`${namespace}-target`}>
      <legend className={inspectorVisualClasses.contextPanelSectionTitle}>
        {copy.inspectorDvtDestinationTargetLabel}
      </legend>
      <DvtDestinationChoiceField
        name={`${namespace}-connection`}
        label={copy.inspectorDvtConnectionLabel}
        copy={copy}
        binding={{
          value: model.connectionId,
          disabled: model.disabled || model.connections.length === 0,
          error: model.errors?.connectionRef,
          options: [
            { value: '', label: copy.inspectorDvtConnectionPlaceholder },
            ...model.connections.map((item) => ({
              value: item.connectionId,
              label: item.connectionId,
            })),
          ],
          setValue: binding.setConnection,
        }}
      />
      {model.showNames ? (
        <div className={styles.names}>
          {(['schema', 'relation'] as const).map((field) => {
            const error = field === 'schema' ? model.errors?.schema : model.errors?.table;
            return (
              <div key={field} className={styles.field}>
                <Label htmlFor={`${id}-${field}`}>
                  {field === 'schema' ? copy.inspectorDvtSchemaLabel : copy.inspectorDvtTableLabel}
                </Label>
                <Input
                  id={`${id}-${field}`}
                  name={`${namespace}-${namespace === 'dvt-sink' && field === 'relation' ? 'table' : field}`}
                  value={model[field]}
                  disabled={model.disabled}
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={error ? `${id}-${field}-error` : undefined}
                  onChange={(event) =>
                    (field === 'schema' ? binding.setSchema : binding.setRelation)(
                      event.target.value
                    )
                  }
                />
                {error ? (
                  <p
                    id={`${id}-${field}-error`}
                    role="alert"
                    className={inspectorVisualClasses.inspectorErrorText}
                  >
                    {formatCanvasInspectorNodeDraftError(error, copy)}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </fieldset>
  );
}
