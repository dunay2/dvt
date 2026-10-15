/**
 * Owns the explicit, non-secret destination of a durable DVT Transform result.
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @decision Reuse governed connection and identifier value objects for an explicit destination.
 * @consequence Authoring records intent without granting connection access or executing SQL.
 * @version 1.0.0
 */
import { z } from 'zod';

import { DvtPostgresRelationTargetV1Schema } from './postgres/DvtPostgresRelationTarget.v1.js';

export const DvtTransformResultTargetV1Schema = DvtPostgresRelationTargetV1Schema.extend({
  schemaVersion: z.literal('dvt-transform-result-target.v1'),
}).strict();

export type DvtTransformResultTargetV1 = z.infer<typeof DvtTransformResultTargetV1Schema>;
