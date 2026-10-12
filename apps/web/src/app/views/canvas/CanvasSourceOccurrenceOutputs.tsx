/** Present this Model's bindings from one producer's published fields. */
import { Plus, X } from 'lucide-react';

import type { GraphNodeInputMapping } from '../../plugins/graph/graphNodeColumnContracts';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { canvasInputSlotId } from './canvasInputBindings';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export function CanvasSourceOccurrenceOutputs({
  input,
  publishedFieldNames,
  consumerNodeId,
  onMapInput,
  onRemoveInput,
}: Readonly<{
  input: CanvasDvtCompositionInput;
  publishedFieldNames: readonly string[];
  consumerNodeId: string;
  onMapInput?: (mapping: GraphNodeInputMapping) => void;
  onRemoveInput?: (mapping: GraphNodeInputMapping) => void;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const bindings = input.inputBindings?.fields;
  const bindingByFieldId = new Map(bindings?.map((binding) => [binding.producerFieldId, binding]));

  const fieldsByName = new Map(input.fields.map((field) => [field.name, field]));
  return (
    <section data-slot="source-occurrence-outputs" className="space-y-1">
      {publishedFieldNames.flatMap((name) => {
        const field = fieldsByName.get(name);
        if (field == null) return [];
        const fieldId = field.id ?? field.name;
        const binding = bindingByFieldId.get(fieldId);
        const included = bindings == null || binding != null;
        const source = { nodeId: input.nodeId, columnId: fieldId };
        return [
          <div
            key={fieldId}
            data-field-id={fieldId}
            className="flex min-h-9 items-center gap-2 rounded border border-(--border-subtle) bg-(--surface-subtle) px-2 text-xs"
          >
            <span className="min-w-0 flex-1 truncate font-medium text-(--text-primary)">
              {field.name}
            </span>
            <span className="shrink-0 text-[11px] text-(--text-muted)">{field.dataType}</span>
            {included ? (
              <button
                type="button"
                data-slot="source-occurrence-remove-field"
                disabled={onRemoveInput == null}
                aria-label={`${copy.removeOutputField}: ${field.name}`}
                title={copy.removeOutputField}
                onClick={() =>
                  onRemoveInput?.({
                    source,
                    target: {
                      nodeId: consumerNodeId,
                      inputId: binding?.inputId ?? canvasInputSlotId(input.nodeId, fieldId),
                    },
                  })
                }
                className="grid size-6 shrink-0 place-items-center rounded text-(--text-muted) hover:bg-(--surface-selected) hover:text-(--text-primary) disabled:opacity-40"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            ) : (
              <button
                type="button"
                data-slot="source-occurrence-add-field"
                disabled={onMapInput == null}
                aria-label={`${copy.addOutputField}: ${field.name}`}
                title={copy.addOutputField}
                onClick={() => onMapInput?.({ source, target: { nodeId: consumerNodeId } })}
                className="grid size-6 shrink-0 place-items-center rounded text-(--status-info) hover:bg-(--surface-selected) disabled:opacity-40"
              >
                <Plus aria-hidden="true" className="size-3.5" />
              </button>
            )}
          </div>,
        ];
      })}
    </section>
  );
}
