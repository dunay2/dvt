/**
 * Owned concern: qualify an external source object through the non-secret
 * connection identity by which DVT addresses it.
 *
 * @baseline ADR-0058: Warehouse Source Import Rails
 * @decision Persist one strict, versioned ConnectedSourceRef instead of parallel loose connection and object identifiers.
 * @consequence Import replay, Canvas presentation, and later execution bindings can share one unambiguous non-secret identity.
 * @version 1.0.0
 */
import { z } from 'zod';

export const CONNECTION_REF_SCHEMA_VERSION = 'connection-ref.v1' as const;
export const CONNECTED_SOURCE_REF_SCHEMA_VERSION = 'connected-source-ref.v1' as const;

export const ConnectionRefSchema = z
  .object({
    schemaVersion: z.literal(CONNECTION_REF_SCHEMA_VERSION),
    connectionId: z
      .string()
      .refine(
        (value) => value.length > 0 && value === value.trim(),
        'Expected a non-blank string without exterior whitespace.'
      ),
    provider: z
      .string()
      .refine(
        (value) => value.length > 0 && value === value.trim(),
        'Expected a non-blank string without exterior whitespace.'
      ),
  })
  .strict();

export const ConnectedSourceRefSchema = z
  .object({
    schemaVersion: z.literal(CONNECTED_SOURCE_REF_SCHEMA_VERSION),
    connectionRef: ConnectionRefSchema,
    sourceObjectId: z
      .string()
      .refine(
        (value) => value.length > 0 && value === value.trim(),
        'Expected a non-blank string without exterior whitespace.'
      ),
  })
  .strict();

export type ConnectionRef = z.infer<typeof ConnectionRefSchema>;
export type ConnectedSourceRef = z.infer<typeof ConnectedSourceRefSchema>;
