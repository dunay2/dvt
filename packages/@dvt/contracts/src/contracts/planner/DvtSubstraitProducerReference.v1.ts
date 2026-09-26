/** Stable producer/consumer identities; no copied producer operations or executable SQL. */
import { z } from 'zod';

const Identity = z
  .string()
  .min(1)
  .refine((value) => value === value.trim());

export const DvtSubstraitProducerReferenceV1Schema = z
  .object({
    nodeId: Identity,
    fields: z.array(
      z
        .object({
          fieldId: Identity,
          producerFieldId: Identity,
        })
        .strict()
    ),
  })
  .strict()
  .superRefine((reference, context) => {
    for (const property of ['fieldId', 'producerFieldId'] as const) {
      if (
        new Set(reference.fields.map((field) => field[property])).size !== reference.fields.length
      )
        context.addIssue({
          code: 'custom',
          path: ['fields'],
          message: `Duplicate ${property} in producer input.`,
        });
    }
  });

export function validateDvtProducerInputFields(
  relations: readonly {
    relationId: string;
    sourceRef?: unknown;
    producerRef?: z.infer<typeof DvtSubstraitProducerReferenceV1Schema> | undefined;
  }[],
  fields: readonly { fieldId: string; relationId: string }[],
  context: z.RefinementCtx
): void {
  relations.forEach((relation, index) => {
    if (relation.producerRef == null) return;
    const local = new Set(
      fields
        .filter((field) => field.relationId === relation.relationId)
        .map((field) => field.fieldId)
    );
    if (
      relation.sourceRef != null ||
      local.size !== relation.producerRef.fields.length ||
      relation.producerRef.fields.some((field) => !local.has(field.fieldId))
    )
      context.addIssue({
        code: 'custom',
        path: ['relations', index, 'producerRef'],
        message:
          'A producer input must bind exactly its local fields and cannot own a physical source.',
      });
  });
}
