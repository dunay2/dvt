/**
 * Owned concern: qualify the current physical binding of an external source
 * object through the non-secret connection coordinates by which DVT addresses it.
 *
 * @baseline ADR-0058: Warehouse Source Import Rails
 * @baseline ADR-0064: Substrait Semantic Reference And Bounded Logical Profile
 * @decision Persist one strict, versioned ConnectedSourceRef instead of parallel loose connection and object binding coordinates.
 * @consequence Import replay, Canvas presentation, and later execution binding verification can share one unambiguous physical reference without treating connection/provider/object coordinates as DVT logical Source, RelationId, or FieldId identity.
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
