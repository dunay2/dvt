/** Present controlled field inclusion without owning Input or Output commands. */
import { FieldInclusionToggle } from '../../components/inspector/FieldInclusionToggle';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { useCanvasOutputPresentation } from './CanvasRelationalTreeEditorFrame';

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
  showExcluded,
  busy = false,
  onChange,
}: Readonly<{
  fields: readonly SourceOccurrenceOutputField[];
  disabled: boolean;
  editing?: boolean;
  showExcluded?: boolean;
  busy?: boolean;
  onChange: (fieldId: string, included: boolean) => void;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const presentation = useCanvasOutputPresentation();
  const revealExcluded = editing && (showExcluded ?? presentation.showExcluded);
  return (
    <section data-slot="source-occurrence-outputs" className="space-y-2">
      {fields
        .filter((field) => field.included || revealExcluded)
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
                disabled={disabled || (!field.available && !busy)}
                busy={busy}
                label={`${field.included ? copy.removeOutputField : copy.addOutputField}: ${field.name}`}
                title={
                  !field.available && !busy
                    ? copy.sourceOutputUnavailable
                    : field.included
                      ? copy.removeOutputField
                      : copy.addOutputField
                }
                onChange={(included) => onChange(field.id, included)}
              />
            ) : null}
          </div>
        ))}
    </section>
  );
}
