/**
 * Owns the explicit, non-secret destination of a durable DVT Transform result.
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @decision Reuse governed connection and identifier value objects for an explicit destination.
 * @consequence Authoring records intent without granting connection access or executing SQL.
 * @version 1.0.0
 */
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
