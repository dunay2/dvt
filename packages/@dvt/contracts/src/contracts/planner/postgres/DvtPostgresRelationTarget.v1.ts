/**
 * @baseline ADR-0066: publication addresses one governed PostgreSQL relation.
 * @decision Share physical target validation across result and Sink publication.
 * @consequence Destination identity never grants access or embeds credentials.
 * @version 1.0.0
 */
import { z } from 'zod';

import { ConnectionRefSchema } from '../../source-import/ConnectedSourceRef.v1.js';
import { PostgresIdentifierV1Schema } from '../CanvasAuthoringFieldPolicy.v1.js';

export const DvtPostgresRelationTargetV1Schema = z
  .object({
    connectionRef: ConnectionRefSchema.extend({ provider: z.literal('postgres') }).strict(),
    schema: PostgresIdentifierV1Schema,
    relation: PostgresIdentifierV1Schema,
  })
  .strict();

export type DvtPostgresRelationTargetV1 = z.infer<typeof DvtPostgresRelationTargetV1Schema>;
