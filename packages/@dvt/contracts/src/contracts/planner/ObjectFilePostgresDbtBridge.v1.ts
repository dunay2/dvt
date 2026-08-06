/**
 * Owned concern: mark DBT steps whose project reads the scoped PostgreSQL
 * staging relation produced by an object-file load.
 *
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @decision Mark the object-file staging dependency explicitly in admitted DBT step configuration.
 * @consequence Artifact projection binds source() to the scoped staging relation without making DBT own ingestion.
 * @version 1.0.0
 */
import { z } from 'zod';

export const OBJECT_FILE_POSTGRES_DBT_BRIDGE_CUSTOM_KEY =
  'objectFilePostgresStagingBridge' as const;
export const OBJECT_FILE_POSTGRES_DBT_STAGING_SCHEMA_ENV =
  'DVT_OBJECT_FILE_POSTGRES_STAGING_SCHEMA' as const;

export const ObjectFilePostgresDbtBridgeSchema = z
  .object({
    version: z.literal('v1'),
  })
  .strict();

export type ObjectFilePostgresDbtBridge = z.infer<typeof ObjectFilePostgresDbtBridgeSchema>;

export type ObjectFilePostgresDbtBridgeResolution =
  | Readonly<{ status: 'absent' }>
  | Readonly<{ status: 'valid'; bridge: ObjectFilePostgresDbtBridge }>
  | Readonly<{ status: 'invalid' }>;

export function resolveObjectFilePostgresDbtBridge(
  stepTypeConfig: unknown
): ObjectFilePostgresDbtBridgeResolution {
  if (!isRecord(stepTypeConfig)) return { status: 'absent' };
  const custom = stepTypeConfig['custom'];
  if (!isRecord(custom) || !(OBJECT_FILE_POSTGRES_DBT_BRIDGE_CUSTOM_KEY in custom)) {
    return { status: 'absent' };
  }

  const parsed = ObjectFilePostgresDbtBridgeSchema.safeParse(
    custom[OBJECT_FILE_POSTGRES_DBT_BRIDGE_CUSTOM_KEY]
  );
  return parsed.success ? { status: 'valid', bridge: parsed.data } : { status: 'invalid' };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
