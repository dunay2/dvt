/** Inspect a detached Source through the same published Input controls as an applied Source. */
import type { GraphNodeInputMapping } from '../../../plugins/graph/graphNodeColumnContracts';
import { CanvasSourceOccurrenceOutputs } from '../CanvasSourceOccurrenceOutputs';
import { canvasInputSlotId } from '../canvasInputBindings';
import type { CanvasDvtCompositionInput } from '../canvasDvtCompositionInputCatalog';
import type { PendingSourceOccurrence } from './pendingSourceOccurrence';
import { SourceOccurrencePropertiesForm } from './SourceOccurrencePropertiesForm';

export function PendingSourceOccurrenceProperties({
  occurrence,
  input,
  publishedFieldNames,
  consumerNodeId,
  onMapInput,
  onRemoveInput,
  occupied,
  actions,
  onPendingChange,
}: Readonly<{
  occurrence: PendingSourceOccurrence;
  input?: CanvasDvtCompositionInput;
  publishedFieldNames: readonly string[];
  consumerNodeId: string;
  onMapInput?: (mapping: GraphNodeInputMapping) => void;
  onRemoveInput?: (mapping: GraphNodeInputMapping) => void;
  occupied: ReadonlySet<string>;
  actions: Readonly<{ rename: (alias: string) => boolean; close: () => void }>;
  onPendingChange: (pending: boolean) => void;
}>): JSX.Element {
  const { read } = occurrence;
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
        input == null ? null : (
          <CanvasSourceOccurrenceOutputs
            editing
            fields={input.fields
              .filter((field) => publishedFieldNames.includes(field.name))
              .map((field) => ({
                id: field.id ?? field.name,
                name: field.name,
                dataType: field.dataType,
                included:
                  input.inputBindings?.fields == null ||
                  input.inputBindings.fields.some(
                    (binding) => binding.producerFieldId === (field.id ?? field.name)
                  ),
                available: true,
              }))}
            disabled={onMapInput == null || onRemoveInput == null}
            onChange={(fieldId, included) => {
              const source = { nodeId: input.nodeId, columnId: fieldId };
              if (included) onMapInput?.({ source, target: { nodeId: consumerNodeId } });
              else
                onRemoveInput?.({
                  source,
                  target: {
                    nodeId: consumerNodeId,
                    inputId:
                      input.inputBindings?.fields.find(
                        (binding) => binding.producerFieldId === fieldId
                      )?.inputId ?? canvasInputSlotId(input.nodeId, fieldId),
                  },
                });
            }}
          />
        )
      }
    />
  );
}
