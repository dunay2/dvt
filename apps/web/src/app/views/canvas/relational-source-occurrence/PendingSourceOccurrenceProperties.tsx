/** Inspect a detached canonical Read without borrowing the selected JOIN's analysis session. */
import { deriveRelationSchema } from '@dvt/substrait-analysis';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { resolveCanvasViewCopy } from '../canvasCopyCatalog';
import { CanvasRelationFieldsTemplate } from '../CanvasRelationFields.templates';
import type { PendingSourceOccurrence } from './pendingSourceOccurrence';
import { SourceOccurrencePropertiesForm } from './SourceOccurrencePropertiesForm';

export function PendingSourceOccurrenceProperties({
  occurrence,
  occupied,
  actions,
  onPendingChange,
}: Readonly<{
  occurrence: PendingSourceOccurrence;
  occupied: ReadonlySet<string>;
  actions: Readonly<{ rename: (alias: string) => boolean; close: () => void }>;
  onPendingChange: (pending: boolean) => void;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const { read } = occurrence;
  const schema = deriveRelationSchema({ ...read, inputs: [], consumers: [] }, []);
  const fields = [...read.fields]
    .filter((field) => field.parentFieldId == null)
    .sort((a, b) => a.outputOrdinal - b.outputOrdinal)
    .map((field) => ({
      id: field.fieldId,
      name: field.displayName ?? field.fieldId,
      type: schema[field.outputOrdinal]?.type.kind.case,
    }));
  return (
    <SourceOccurrencePropertiesForm
      data={{
        relationId: read.binding.relationId,
        alias: read.binding.displayName,
        occupied,
        supported: true,
      }}
      actions={{ save: actions.rename, close: actions.close }}
      onPendingChange={onPendingChange}
      output={
        <CanvasRelationFieldsTemplate
          fields={fields}
          loading={false}
          error={null}
          label={resolveCanvasViewCopy(language).relationalTreeOutputLabel}
        />
      }
    />
  );
}
