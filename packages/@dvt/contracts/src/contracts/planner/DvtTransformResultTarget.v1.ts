/** Owns the explicit, non-secret destination of a durable DVT Transform result. */
import { z } from 'zod';

import { ConnectionRefSchema } from '../source-import/ConnectedSourceRef.v1.js';

import { PostgresIdentifierV1Schema } from './CanvasAuthoringFieldPolicy.v1.js';

export const DvtTransformResultTargetV1Schema = z
  .object({
    schemaVersion: z.literal('dvt-transform-result-target.v1'),
    connectionRef: ConnectionRefSchema.extend({ provider: z.literal('postgres') }),
    schema: PostgresIdentifierV1Schema,
    relation: PostgresIdentifierV1Schema,
  })
  .strict();

export type DvtTransformResultTargetV1 = z.infer<typeof DvtTransformResultTargetV1Schema>;
