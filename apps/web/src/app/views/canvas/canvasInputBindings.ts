/** Project dependency-owned input slots, independently from model output fields. */
import {
  DvtInputBindingsV1Schema,
  readDvtInputBindings,
  type DvtInputBindingsV1,
} from '@dvt/contracts';

export type CanvasPublishedInputField = Readonly<{ columnId: string; name: string; type: string }>;
export type CanvasInputBindingEdge = Readonly<{
  sourceId: string;
  targetId: string;
  inputBindings?: DvtInputBindingsV1;
  metadata?: Record<string, unknown>;
}>;
export type CanvasInputBinding = Readonly<{
  inputId: string;
  source: Readonly<{ nodeId: string; columnId: string }>;
  name: string;
  type: string;
  state: 'available' | 'unresolved';
}>;

export function canvasInputSlotId(producerNodeId: string, producerFieldId: string): string {
  return `input:${encodeURIComponent(producerNodeId)}:${encodeURIComponent(producerFieldId)}`;
}

export function readCanvasInputBindings(
  edge: CanvasInputBindingEdge
): DvtInputBindingsV1 | undefined {
  return edge.inputBindings === undefined
    ? readDvtInputBindings(edge)
    : DvtInputBindingsV1Schema.parse(edge.inputBindings);
}

export function projectCanvasInputBindings(
  args: Readonly<{
    targetNodeId: string;
    edges: readonly CanvasInputBindingEdge[];
    producers: ReadonlyMap<string, readonly CanvasPublishedInputField[]>;
  }>
): readonly CanvasInputBinding[] {
  return args.edges
    .filter((edge) => edge.targetId === args.targetNodeId)
    .flatMap((edge) => {
      const available = args.producers.get(edge.sourceId) ?? [];
      const fields =
        readCanvasInputBindings(edge)?.fields ??
        available.map((field) => ({
          inputId: canvasInputSlotId(edge.sourceId, field.columnId),
          producerFieldId: field.columnId,
        }));
      return fields.map((field): CanvasInputBinding => {
        const published = available.find(
          (candidate) => candidate.columnId === field.producerFieldId
        );
        return {
          inputId: field.inputId,
          source: { nodeId: edge.sourceId, columnId: field.producerFieldId },
          name: published?.name ?? field.producerFieldId,
          type: published?.type ?? 'unknown',
          state: published == null ? 'unresolved' : 'available',
        };
      });
    });
}
