/** Read-first entry point for adding a scalar-derived output to the selected relation. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { resolveDvtSubstraitColumnFunctions } from '@dvt/postgres-projection';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { DerivedOutputForm } from './DerivedOutputForm';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { useCanvasDerivedOutputAuthoring } from './useCanvasDerivedOutputAuthoring';
import { useRelationCommand } from './useRelationCommand';

export function CanvasDerivedOutputSection({
  relationId,
  onChange,
}: Readonly<{
  relationId: string;
  onChange: (document: SubstraitDocument) => void | boolean;
}>): JSX.Element | null {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const model = useCanvasDerivedOutputAuthoring(relationId);
  const command = useRelationCommand(relationId, onChange);
  const [open, setOpen] = useState(false);
  if (model == null || model.fields.length === 0) return null;
  const initialField = model.fields.find(
    (field) =>
      resolveDvtSubstraitColumnFunctions({
        dataTypes: [field.dataType],
        provider: model.provider,
        resolution: 'proposal',
      }).length > 0
  );
  return (
    <section className="mt-4 border-t border-(--border-subtle) pt-3">
      {open && initialField != null ? (
        <DerivedOutputForm
          fields={model.fields}
          initialOperandFieldIds={[initialField.fieldId]}
          dataSlot="canvas-derived-output-form"
          copy={copy.derivedOutput}
          unavailableAliases={model.fields.map((field) => field.name)}
          resolveFunctions={(fieldIds, resolution) => {
            const dataTypes = fieldIds.flatMap((fieldId) => {
              const field = model.fields.find((candidate) => candidate.fieldId === fieldId);
              return field == null ? [] : [field.dataType];
            });
            return dataTypes.length !== fieldIds.length
              ? []
              : resolveDvtSubstraitColumnFunctions({
                  dataTypes,
                  provider: model.provider,
                  resolution,
                });
          }}
          onCancel={() => setOpen(false)}
          onSubmit={async ({ capabilityId, ...request }) => {
            const applied = await command.execute((session, identity) =>
              applySelectedRelationDerivedOutput(session, {
                ...identity,
                ...request,
                capabilityIds: [capabilityId],
                intent: model.intent,
              })
            );
            return applied ? null : copy.derivedOutput.failed;
          }}
          onApplied={() => setOpen(false)}
        />
      ) : (
        <button
          type="button"
          data-slot="canvas-derived-output-trigger"
          disabled={initialField == null}
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 rounded px-2 py-1.5 text-xs text-(--status-info) hover:bg-(--surface-selected)"
        >
          <Plus className="size-3" />
          {copy.derivedOutput.add}
        </button>
      )}
      {command.state === 'error' ? (
        <p role="alert" className="mt-2 text-xs text-red-400">
          {copy.derivedOutput.failed}
        </p>
      ) : null}
    </section>
  );
}
