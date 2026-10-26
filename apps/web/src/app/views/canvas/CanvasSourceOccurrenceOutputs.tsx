/** Present controlled field inclusion without owning Input or Output commands. */
import { useId, useState } from 'react';
import { FieldInclusionToggle } from '../../components/inspector/FieldInclusionToggle';
import { Checkbox } from '../../components/ui/checkbox';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export type SourceOccurrenceOutputField = Readonly<{
  id: string;
  name: string;
  included: boolean;
  available: boolean;
  dataType?: string;
}>;

export function CanvasSourceOccurrenceOutputs({
  fields,
  disabled,
  editing = false,
  busy = false,
  onChange,
}: Readonly<{
  fields: readonly SourceOccurrenceOutputField[];
  disabled: boolean;
  editing?: boolean;
  busy?: boolean;
  onChange: (fieldId: string, included: boolean) => void;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const [hideExcluded, setHideExcluded] = useState(false);
  const filterId = useId();
  return (
    <section data-slot="source-occurrence-outputs" className="space-y-2">
      {editing ? (
        <label className="flex items-center gap-2 text-xs text-(--text-muted)" htmlFor={filterId}>
          <Checkbox
            id={filterId}
            checked={hideExcluded}
            onCheckedChange={(checked) => setHideExcluded(checked === true)}
          />
          {copy.hideExcludedFields}
        </label>
      ) : null}
      {fields
        .filter((field) => field.included || (editing && !hideExcluded))
        .map((field) => (
          <div
            key={field.id}
            data-field-id={field.id}
            data-slot="source-occurrence-output-field"
            className="flex min-h-9 items-center gap-2 rounded border border-(--border-subtle) bg-(--surface-subtle) px-2 text-xs"
          >
            <span className="min-w-0 flex-1 truncate font-medium text-(--text-primary)">
              {field.name}
            </span>
            {field.dataType == null ? null : (
              <span className="shrink-0 text-[11px] text-(--text-muted)">{field.dataType}</span>
            )}
            {editing ? (
              <FieldInclusionToggle
                fieldName={field.name}
                included={field.included}
                slot={
                  field.included ? 'source-occurrence-remove-field' : 'source-occurrence-add-field'
                }
                disabled={disabled || !field.available}
                busy={busy}
                label={`${field.included ? copy.removeOutputField : copy.addOutputField}: ${field.name}`}
                title={
                  !field.available
                    ? copy.sourceOutputUnavailable
                    : field.included
                      ? copy.removeOutputField
                      : copy.addOutputField
                }
                onChange={(included) => {
                  if (hideExcluded && !included) document.getElementById(filterId)?.focus();
                  onChange(field.id, included);
                }}
              />
            ) : null}
          </div>
        ))}
    </section>
  );
}
