/**
 * Owned concern: project dependency-owned Input slots independently from model Output.
 * @baseline ADR-0064 / GH-3628: removed publication identities remain explicit unresolved slots.
 * @decision Retain implicit semantic references without matching labels or inventing replacements.
 * @consequence Existing exact Input gestures can address a stale slot; publication stays denied.
 * @version 1.1.0
 */
import {
  DvtInputBindingsV1Schema,
  readDvtInputBindings,
  type DvtInputBindingsV1,
  type DvtSubstraitAuthoringSidecarV1,
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
    retainedSidecar?: DvtSubstraitAuthoringSidecarV1;
  }>
): readonly CanvasInputBinding[] {
  return args.edges
    .filter((edge) => edge.targetId === args.targetNodeId)
    .flatMap((edge) => {
      const available = args.producers.get(edge.sourceId) ?? [];
      const fields = readCanvasInputBindings(edge)?.fields ?? [
        ...available.map((field) => ({
          inputId: canvasInputSlotId(edge.sourceId, field.columnId),
          producerFieldId: field.columnId,
        })),
        ...retainedMissingInputs(args.retainedSidecar, edge.sourceId, available),
      ];
      return fields.map((field): CanvasInputBinding => {
        const published = available.find(
          (candidate) => candidate.columnId === field.producerFieldId
        );
        return {
          inputId: field.inputId,
          source: { nodeId: edge.sourceId, columnId: field.producerFieldId },
          name:
            published?.name ??
            retainedInputName(args.retainedSidecar, edge.sourceId, field.producerFieldId) ??
            field.producerFieldId,
          type: published?.type ?? 'unknown',
          state: published == null ? 'unresolved' : 'available',
        };
      });
    });
}

function retainedInputName(
  sidecar: DvtSubstraitAuthoringSidecarV1 | undefined,
  producerNodeId: string,
  producerFieldId: string
): string | undefined {
  const mapping = sidecar?.relations
    .filter((relation) => relation.producerRef?.nodeId === producerNodeId)
    .flatMap((relation) => relation.producerRef!.fields)
    .find((field) => field.producerFieldId === producerFieldId);
  return sidecar?.fields.find((field) => field.fieldId === mapping?.fieldId)?.displayName;
}

function retainedMissingInputs(
  sidecar: DvtSubstraitAuthoringSidecarV1 | undefined,
  producerNodeId: string,
  available: readonly CanvasPublishedInputField[]
) {
  const published = new Set(available.map((field) => field.columnId));
  const roots = new Set(
    sidecar?.fields.filter((field) => field.parentFieldId == null).map((field) => field.fieldId)
  );
  const missing = new Set(
    sidecar?.relations
      .filter((relation) => relation.producerRef?.nodeId === producerNodeId)
      .flatMap((relation) => relation.producerRef!.fields)
      .filter((field) => roots.has(field.fieldId) && !published.has(field.producerFieldId))
      .map((field) => field.producerFieldId)
  );
  return [...missing].map((producerFieldId) => ({
    inputId: canvasInputSlotId(producerNodeId, producerFieldId),
    producerFieldId,
  }));
}
