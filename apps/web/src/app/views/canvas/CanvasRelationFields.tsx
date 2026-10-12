/** Compact derived schema for the selected instance; inspecting it never runs a provider query. */
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { sourceOccurrenceCopy } from './relational-source-occurrence/sourceOccurrenceCopy';
import { useCanvasRelationFields } from './useCanvasRelationFields';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { CanvasRelationFieldsTemplate } from './CanvasRelationFields.templates';

export function CanvasRelationFields({
  relationId,
}: Readonly<{ relationId: string }>): JSX.Element | null {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = sourceOccurrenceCopy(language);
  const model = useCanvasRelationFields(relationId);
  if (!model.available) return null;
  return (
    <CanvasRelationFieldsTemplate
      label={resolveCanvasViewCopy(language).relationalTreeOutputLabel}
      loading={model.loading}
      error={model.error == null ? null : copy.fieldsUnavailable}
      fields={
        model.result?.bindings
          .filter((field) => field.parentFieldId == null)
          .sort((left, right) => left.outputOrdinal - right.outputOrdinal)
          .map((field) => ({
            id: field.fieldId,
            name: field.displayName ?? '',
            type: model.result!.fields[field.outputOrdinal]?.type.kind.case,
          })) ?? []
      }
    />
  );
}
