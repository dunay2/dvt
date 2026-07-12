/**
 * Owned concern: define versioned warehouse-connection discovery and
 * source-object import operation contracts.
 *
 * @baseline ADR-0058: Warehouse Source Import Rails
 * @decision Keep protected source discovery and import request/response DTOs in one canonical contract component.
 * @consequence API and web rails exchange validated operation payloads without local transport vocabularies.
 * @version 1.0.0
 */
import { z } from 'zod';

import { SourceObjectSelectionListSchema } from './SourceObjectCatalog.v1.js';

export const WAREHOUSE_CONNECTION_TYPE = ['postgres'] as const;
export const SOURCE_IMPORT_GROUPING = ['schema', 'database'] as const;
export const WAREHOUSE_CONNECTION_TEST_FAILURE_REASON = [
  'invalid_credentials',
  'unsupported_adapter',
  'connection_failed',
] as const;

const NonBlankStringSchema = z.string().trim().min(1);
const NonNegativeSafeIntegerSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const CanonicalIsoTimestampSchema = z
  .string()
  .refine(
    (value) => Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value,
    'Expected a canonical ISO-8601 timestamp.'
  );

export const WarehouseConnectionSchema = z
  .object({
    id: NonBlankStringSchema,
    name: NonBlankStringSchema,
    type: z.enum(WAREHOUSE_CONNECTION_TYPE),
    database: NonBlankStringSchema,
  })
  .strict();

export const WarehouseConnectionListSchema = z.array(WarehouseConnectionSchema);

export const CreateWarehouseConnectionRequestSchema = z
  .object({
    name: NonBlankStringSchema,
    type: z.enum(WAREHOUSE_CONNECTION_TYPE),
    database: NonBlankStringSchema,
    credentialRef: NonBlankStringSchema,
  })
  .strict();

export const TestWarehouseConnectionResultSchema = z.discriminatedUnion('status', [
  z
    .object({
      connectionId: NonBlankStringSchema,
      status: z.literal('passed'),
      checkedAt: CanonicalIsoTimestampSchema,
      objectCount: NonNegativeSafeIntegerSchema,
    })
    .strict(),
  z
    .object({
      connectionId: NonBlankStringSchema,
      status: z.literal('failed'),
      reason: z.enum(WAREHOUSE_CONNECTION_TEST_FAILURE_REASON),
      message: NonBlankStringSchema,
      checkedAt: CanonicalIsoTimestampSchema,
    })
    .strict(),
]);

export const SourceImportOptionsSchema = z
  .object({
    includeColumns: z.boolean(),
    addTests: z.boolean(),
    addFreshness: z.boolean(),
  })
  .strict();

export const ImportSourceObjectsRequestSchema = z
  .object({
    connectionId: NonBlankStringSchema,
    objects: SourceObjectSelectionListSchema,
    groupingStrategy: z.enum(SOURCE_IMPORT_GROUPING),
    includeColumns: z.boolean(),
    addTests: z.boolean(),
    addFreshness: z.boolean(),
  })
  .strict();

export const ImportSourceObjectsResultSchema = z
  .object({
    success: z.literal(true),
    draftRevision: NonBlankStringSchema,
    sourcesCreated: NonNegativeSafeIntegerSchema,
    objectsImported: NonNegativeSafeIntegerSchema,
    yamlFiles: z.array(NonBlankStringSchema),
    importedNodeIds: z.array(NonBlankStringSchema),
    grouping: z.enum(SOURCE_IMPORT_GROUPING),
    options: SourceImportOptionsSchema,
  })
  .strict();

export type WarehouseConnectionType = (typeof WAREHOUSE_CONNECTION_TYPE)[number];
export type WarehouseConnection = z.infer<typeof WarehouseConnectionSchema>;
export type CreateWarehouseConnectionRequest = z.infer<
  typeof CreateWarehouseConnectionRequestSchema
>;
export type WarehouseConnectionTestFailureReason =
  (typeof WAREHOUSE_CONNECTION_TEST_FAILURE_REASON)[number];
export type TestWarehouseConnectionResult = z.infer<typeof TestWarehouseConnectionResultSchema>;
export type SourceImportGrouping = (typeof SOURCE_IMPORT_GROUPING)[number];
export type SourceImportOptions = z.infer<typeof SourceImportOptionsSchema>;
export type ImportSourceObjectsRequest = z.infer<typeof ImportSourceObjectsRequestSchema>;
export type ImportSourceObjectsResult = z.infer<typeof ImportSourceObjectsResultSchema>;
