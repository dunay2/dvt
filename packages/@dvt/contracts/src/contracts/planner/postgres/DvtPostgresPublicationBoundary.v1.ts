/**
 * @baseline ADR-0064 / ADR-0066: publication identity is separate from semantic identity.
 * @decision Select the sole admitted publication from the validated Run workload.
 * @consequence Context admission and execution cannot disagree about the destination.
 * @version 1.0.0
 */
import { z } from 'zod';

import {
  DvtPostgresRelationTargetV1Schema,
  type DvtPostgresRelationTargetV1,
} from './DvtPostgresRelationTarget.v1.js';

export const DvtPostgresSinkPublicationV1Schema = z
  .object({
    kind: z.literal('sink'),
    nodeId: z.string().min(1),
    inputNodeId: z.string().min(1),
    target: DvtPostgresRelationTargetV1Schema,
    publicationPolicy: z.literal('postgres-stable-table-publication.v1'),
  })
  .strict();

type Publication = Readonly<{
  nodeId: string;
  target: DvtPostgresRelationTargetV1;
  publicationPolicy: 'postgres-stable-table-publication.v1';
}>;

export function resolveDvtPostgresPublication(workload: {
  readonly output:
    (Publication & { readonly disposition: 'table' }) | { readonly disposition: 'ephemeral' };
  readonly publicationBoundaries: readonly z.infer<typeof DvtPostgresSinkPublicationV1Schema>[];
}): Publication {
  if (workload.output.disposition === 'table' && workload.publicationBoundaries.length === 0) {
    return workload.output;
  }
  if (workload.output.disposition === 'ephemeral' && workload.publicationBoundaries.length === 1) {
    return workload.publicationBoundaries[0]!;
  }
  throw new Error('Run requires exactly one admitted result or Sink publication.');
}
