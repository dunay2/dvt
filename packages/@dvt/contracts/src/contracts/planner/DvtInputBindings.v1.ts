/** Input-port provenance on a producer dependency; never transformation semantics. */
import { z } from 'zod';

const Identity = z
  .string()
  .min(1)
  .refine((value) => value.trim() === value);
export const DVT_INPUT_BINDINGS_METADATA_KEY = 'inputBindings';
export const DvtInputBindingsV1Schema = z
  .object({
    version: z.literal('v1'),
    fields: z.array(z.object({ inputId: Identity, producerFieldId: Identity }).strict()),
  })
  .strict()
  .superRefine((binding, context) => {
    for (const key of ['inputId', 'producerFieldId'] as const) {
      if (new Set(binding.fields.map((field) => field[key])).size !== binding.fields.length)
        context.addIssue({
          code: 'custom',
          path: ['fields'],
          message: `Duplicate ${key} in input binding.`,
        });
    }
  });
export type DvtInputBindingsV1 = z.infer<typeof DvtInputBindingsV1Schema>;

type Edge = { sourceId: string; targetId: string; metadata?: Record<string, unknown> | undefined };
export function readDvtInputBindings(edge: Pick<Edge, 'metadata'>): DvtInputBindingsV1 | undefined {
  if (edge.metadata == null || !Object.hasOwn(edge.metadata, DVT_INPUT_BINDINGS_METADATA_KEY))
    return undefined;
  return DvtInputBindingsV1Schema.parse(edge.metadata[DVT_INPUT_BINDINGS_METADATA_KEY]);
}

export function validateDvtInputBindingMetadata(
  edge: Pick<Edge, 'metadata'>,
  context: z.RefinementCtx
): void {
  if (edge.metadata == null || !Object.hasOwn(edge.metadata, DVT_INPUT_BINDINGS_METADATA_KEY))
    return;
  const result = DvtInputBindingsV1Schema.safeParse(edge.metadata[DVT_INPUT_BINDINGS_METADATA_KEY]);
  if (!result.success)
    context.addIssue({
      code: 'custom',
      path: ['metadata', DVT_INPUT_BINDINGS_METADATA_KEY],
      message: 'Invalid DVT input bindings.',
    });
}

export function validateDvtGraphInputBindings(
  graph: {
    edges: readonly Edge[];
    nodes: readonly { id: string; pluginId: string; kind: string }[];
  },
  context: z.RefinementCtx,
  prefix: readonly (string | number)[] = []
): void {
  const assigned = new Set<string>();
  graph.edges.forEach((edge, index) => {
    const parsed = DvtInputBindingsV1Schema.safeParse(
      edge.metadata?.[DVT_INPUT_BINDINGS_METADATA_KEY]
    );
    if (!parsed.success) return;
    const target = graph.nodes.find((node) => node.id === edge.targetId);
    const path = [...prefix, 'edges', index, 'metadata', DVT_INPUT_BINDINGS_METADATA_KEY];
    if (target?.pluginId !== 'dvt' || !['transform', 'dvt:transform'].includes(target.kind))
      context.addIssue({ code: 'custom', path, message: 'Input bindings require a DVT consumer.' });
    for (const field of parsed.data.fields) {
      const key = JSON.stringify([edge.targetId, field.inputId]);
      if (assigned.has(key))
        context.addIssue({
          code: 'custom',
          path,
          message: 'A consumer input slot has more than one producer.',
        });
      assigned.add(key);
    }
  });
}
