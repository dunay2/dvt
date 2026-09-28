/** Transform owns a stable edit draft; analysis refreshes cannot erase typed input. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { Pencil, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { DerivedOutputFormulaForm } from './DerivedOutputFormulaForm';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { useCanvasDerivedOutputAuthoring } from './useCanvasDerivedOutputAuthoring';
import { useRelationCommand } from './useRelationCommand';

export function CanvasDerivedOutputSection({
  relationId,
  onChange,
  onPendingChange,
}: Readonly<{
  relationId: string;
  onChange: (document: SubstraitDocument) => void | boolean;
  onPendingChange?: (pending: boolean) => void;
}>): JSX.Element | null {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const current = useCanvasDerivedOutputAuthoring(relationId);
  const command = useRelationCommand(relationId, onChange);
  const [editing, setEditing] = useState<Readonly<{
    model: NonNullable<typeof current>;
    outputFieldId?: string;
    initial?: Readonly<{ alias: string; formula: string }>;
  }> | null>(null);
  const model = editing?.model ?? current;
  const pendingCallback = useRef(onPendingChange);
  pendingCallback.current = onPendingChange;
  const pending = editing != null;
  useEffect(() => {
    pendingCallback.current?.(pending);
    return () => pendingCallback.current?.(false);
  }, [pending]);
  if (model == null) return null;
  return (
    <section className="space-y-3">
      {editing != null ? (
        <DerivedOutputFormulaForm
          initial={editing.initial}
          fields={model.fields.filter((field) => field.fieldId !== editing.outputFieldId)}
          provider={model.provider}
          dragScope={{
            ...model.dragScope,
            references: model.dragScope.references.filter(
              (field) => field.fieldId !== editing.outputFieldId
            ),
          }}
          copy={copy.derivedOutput}
          unavailableAliases={model.fields
            .filter((field) => field.fieldId !== editing.outputFieldId)
            .map((field) => field.name)}
          onCancel={() => setEditing(null)}
          onSubmit={async (request) => {
            const applied = await command.execute((session, identity) =>
              applySelectedRelationDerivedOutput(session, {
                ...identity,
                ...request,
                expectedRevision: model.dragScope.revision,
                outputFieldId: editing.outputFieldId,
                intent: model.intent,
              })
            );
            return applied ? null : copy.derivedOutput.failed;
          }}
        />
      ) : (
        <>
          {model.outputs.map((output) => (
            <div
              key={output.fieldId}
              data-slot="canvas-derived-output"
              data-field-id={output.fieldId}
              className="rounded border border-(--border-subtle) p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">{output.name}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={`${copy.edit} ${output.name}`}
                  disabled={output.formula == null}
                  onClick={() => {
                    if (output.formula != null)
                      setEditing({
                        model,
                        outputFieldId: output.fieldId,
                        initial: { alias: output.name, formula: output.formula },
                      });
                  }}
                >
                  <Pencil aria-hidden="true" />
                  {copy.edit}
                </Button>
              </div>
              <code className="block break-words text-xs">
                {output.formula ?? copy.inspectionOnly}
              </code>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            data-slot="canvas-derived-output-trigger"
            onClick={() => setEditing({ model })}
          >
            <Plus aria-hidden="true" />
            {copy.derivedOutput.add}
          </Button>
        </>
      )}
    </section>
  );
}
