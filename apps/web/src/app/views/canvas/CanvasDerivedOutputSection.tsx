/**
 * Owned concern: retain a calculated SELECT draft and submit it through the existing projection command.
 * @baseline ADR-0064: canonical ProjectRel owns calculated fields, independently of JOIN predicates.
 * @decision Reuse one editor for insertion and editing; notify selection only after accepted writes.
 * @consequence Analysis refreshes cannot erase typed input; cancelled or rejected edits do not move focus.
 * @version 1.1.0
 */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { Pencil, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { DerivedOutputFormulaForm } from './DerivedOutputFormulaForm';
import {
  formatCanvasTransformDependencyError,
  resolveCanvasSemanticEditorCopy,
} from './canvasSemanticEditorCopy';
import { useCanvasDerivedOutputAuthoring } from './useCanvasDerivedOutputAuthoring';
import { useRelationCommand } from './useRelationCommand';

export function CanvasDerivedOutputSection({
  relationId,
  onChange,
  onPendingChange,
  onSaved,
}: Readonly<{
  relationId: string;
  onChange: (document: SubstraitDocument) => void | boolean;
  onPendingChange?: (pending: boolean) => void;
  onSaved?: (relationId: string) => void;
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
            let savedRelationId = relationId;
            const result = await command.executeDetailed(async (session, identity) => {
              const document = await applySelectedRelationDerivedOutput(session, {
                ...identity,
                ...request,
                expectedRevision: model.dragScope.revision,
                outputFieldId: editing.outputFieldId,
                intent: model.intent,
              });
              if (model.intent === 'insert') {
                const consumerId = session.locate(relationId, session.revision).consumers[0]!;
                const { binding } = session.locate(consumerId, session.revision);
                savedRelationId = binding.authoringOwnerRelationId ?? binding.relationId;
              }
              return document;
            });
            if (result.ok) onSaved?.(savedRelationId);
            return result.ok
              ? null
              : (formatCanvasTransformDependencyError(result.error, copy) ??
                  copy.derivedOutput.failed);
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
