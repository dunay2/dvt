/** File authority and assigned publication identities; never executable SQL or credentials. */
import { z } from 'zod';

import { CompileGraphDbtModelsRequestSchema } from '../dbt-project/GraphDbtModelCompilation.v1.js';
import { ConnectionRefSchema } from '../source-import/ConnectedSourceRef.v1.js';

const Identity = z
  .string()
  .min(1)
  .refine((value) => value === value.trim());
export const WorkspaceDbtModelReferenceSchema = z
  .object({
    schemaVersion: z.literal('workspace-dbt-model-reference.v1'),
    canvasId: Identity,
    uniqueId: CompileGraphDbtModelsRequestSchema.shape.selectors.element.refine(
      (value) => value.startsWith('model.') && value.split('.').length >= 3
    ),
    relationId: Identity,
    connectionRef: ConnectionRefSchema,
    fields: z
      .array(
        z
          .object({
            fieldId: Identity,
            name: Identity,
            dataType: Identity,
            nullable: z.literal(true),
          })
          .strict()
      )
      .min(1),
  })
  .strict()
  .superRefine((reference, context) => {
    for (const key of ['fieldId', 'name'] as const) {
      if (new Set(reference.fields.map((field) => field[key])).size !== reference.fields.length)
        context.addIssue({
          code: 'custom',
          path: ['fields'],
          message: `Duplicate model output ${key}.`,
        });
    }
  });

export type WorkspaceDbtModelReference = z.infer<typeof WorkspaceDbtModelReferenceSchema>;

export function readWorkspaceDbtModelReference(
  node: Readonly<{ metadata?: Readonly<Record<string, unknown>> | undefined }>
): WorkspaceDbtModelReference | undefined {
  const value = node.metadata?.['dbtModelReference'];
  return value === undefined ? undefined : WorkspaceDbtModelReferenceSchema.parse(value);
}
