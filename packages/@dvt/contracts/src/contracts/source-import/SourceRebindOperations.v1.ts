/**
 * Owned concern: define the explicit physical rebind command for an existing
 * logical warehouse Source.
 *
 * @baseline ADR-0058: Warehouse Source Import Rails
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Rebind a persisted logical Source to one discovered physical object without changing logical identity.
 * @consequence Callers select a destination binding; the server owns compatibility checks and persisted identity preservation.
 * @version 1.0.0
 */
import { z } from 'zod';

import { ConnectedSourceRefSchema } from './ConnectedSourceRef.v1.js';

const NonBlankStringSchema = z.string().trim().min(1);

export const RebindWarehouseSourceRequestSchema = z
  .object({
    schemaVersion: z.literal('source-rebind-request.v1'),
    connectionId: NonBlankStringSchema,
    sourceObjectId: NonBlankStringSchema,
    idempotencyKey: NonBlankStringSchema,
  })
  .strict();

export const RebindWarehouseSourceResultSchema = z
  .object({
    schemaVersion: z.literal('source-rebind-result.v1'),
    nodeId: NonBlankStringSchema,
    draftRevision: NonBlankStringSchema,
    connectedSourceRef: ConnectedSourceRefSchema,
  })
  .strict();

export type RebindWarehouseSourceRequest = z.infer<typeof RebindWarehouseSourceRequestSchema>;
export type RebindWarehouseSourceResult = z.infer<typeof RebindWarehouseSourceResultSchema>;
