/** Read-first entry point for adding a scalar-derived output to the selected relation. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { CanvasDerivedOutputForm } from './CanvasDerivedOutputForm';
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
  return (
    <section className="mt-4 border-t border-(--border-subtle) pt-3">
      {open ? (
        <CanvasDerivedOutputForm
          fields={model.fields}
          provider={model.provider}
          busy={command.state === 'busy'}
          copy={copy.derivedOutput}
          onCancel={() => setOpen(false)}
          onSubmit={async (request) => {
            const applied = await command.execute((session, identity) =>
              applySelectedRelationDerivedOutput(session, {
                ...identity,
                ...request,
                intent: model.intent,
              })
            );
            if (applied) setOpen(false);
            return applied;
          }}
        />
      ) : (
        <button
          type="button"
          data-slot="canvas-derived-output-trigger"
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
