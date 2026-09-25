/** Compact derived schema for the selected instance; inspecting it never runs a provider query. */
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { sourceOccurrenceCopy } from './relational-source-occurrence/sourceOccurrenceCopy';
import { useCanvasRelationFields } from './useCanvasRelationFields';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';

export function CanvasRelationFields({
  relationId,
}: Readonly<{ relationId: string }>): JSX.Element | null {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = sourceOccurrenceCopy(language);
  const outputLabel = resolveCanvasViewCopy(language).relationalTreeOutputLabel;
  const model = useCanvasRelationFields(relationId);
  if (!model.available) return null;
  return (
    <section
      data-slot="canvas-relation-fields"
      className="space-y-2"
      aria-busy={model.loading}
      aria-label={outputLabel}
    >
      {model.error == null ? (
        <dl className="text-xs">
          {model.result?.bindings
            .filter((field) => field.parentFieldId == null)
            .sort((left, right) => left.outputOrdinal - right.outputOrdinal)
            .map((field) => (
              <div
                key={field.fieldId}
                data-field-id={field.fieldId}
                className="flex justify-between gap-3 border-b border-(--border-subtle) py-2"
              >
                <dt className="truncate">{field.displayName}</dt>
                <dd className="text-(--text-muted)">
                  {model.result!.fields[field.outputOrdinal]?.type.kind.case}
                </dd>
              </div>
            ))}
        </dl>
      ) : (
        <p role="alert" className="text-xs text-amber-300">
          {copy.fieldsUnavailable}
        </p>
      )}
    </section>
  );
}
