/**
 * Owned concern: define the bounded, content-addressed object-file to
 * PostgreSQL staging-load step contract.
 *
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @decision Admit one UTF-8 CSV or JSON Lines object and one scoped staging relation.
 * @consequence Planner and stored-plan admission reject unbounded locators, secrets, and scope drift.
 * @version 1.0.0
 */
import { z } from 'zod';

import { CommonStepTypeConfigSchema } from '../../step-registry/CommonStepTypeConfig.js';
import {
  CREDENTIAL_REFERENCE_MESSAGE,
  isCredentialReference,
  isSha256HexString,
  SHA256_HEX_STRING_MESSAGE,
} from '../../utils/contractPrimitives.js';

import type { PlanOwnership } from './ExecutionPlan.v1.js';

export const LOAD_OBJECT_FILE_TO_POSTGRES_MAX_BYTES = 50_000_000 as const;
export const LOAD_OBJECT_FILE_TO_POSTGRES_REQUIRED_CAPABILITY =
  'executor.object-file-postgres-load' as const;

export const OBJECT_FILE_POSTGRES_COLUMN_TYPE = [
  'text',
  'integer',
  'bigint',
  'numeric',
  'boolean',
  'date',
  'timestamp',
  'timestamp-with-time-zone',
] as const;

const ScopeIdentifierSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u);
const PostgresIdentifierSchema = z.string().regex(/^[a-z_][a-z0-9_]{0,62}$/u);
const SourceFieldSchema = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,127}$/u);
const Sha256Schema = z.string().refine(isSha256HexString, SHA256_HEX_STRING_MESSAGE);
const CredentialReferenceSchema = z
  .string()
  .refine(isCredentialReference, CREDENTIAL_REFERENCE_MESSAGE);
const ObjectStoreCredentialReferenceSchema = CredentialReferenceSchema.refine(
  (value) => value.startsWith('object-store:'),
  'Object source credentialRef must use the object-store namespace'
);
const PostgresCredentialReferenceSchema = CredentialReferenceSchema.refine(
  (value) => value.startsWith('postgres:'),
  'PostgreSQL target credentialRef must use the postgres namespace'
);
const ObjectSizeSchema = z.number().int().positive().max(LOAD_OBJECT_FILE_TO_POSTGRES_MAX_BYTES);

const ObjectFileExecutionScopeSchema = z
  .object({
    tenantId: ScopeIdentifierSchema,
    projectId: ScopeIdentifierSchema,
    environmentId: ScopeIdentifierSchema,
  })
  .strict();

const ObjectFileSourceCommonSchema = z.object({
  storageUri: z.string().min(1),
  sha256: Sha256Schema,
  sizeBytes: ObjectSizeSchema,
  maxBytes: ObjectSizeSchema,
  encoding: z.literal('utf-8'),
  credentialRef: ObjectStoreCredentialReferenceSchema,
});

const CsvObjectFileSourceSchema = ObjectFileSourceCommonSchema.extend({
  format: z.literal('csv'),
  mediaType: z.literal('text/csv'),
  header: z.literal(true),
  delimiter: z.literal(','),
}).strict();

const JsonLinesObjectFileSourceSchema = ObjectFileSourceCommonSchema.extend({
  format: z.literal('jsonl'),
  mediaType: z.literal('application/x-ndjson'),
}).strict();

const ObjectFileSourceSchema = z.discriminatedUnion('format', [
  CsvObjectFileSourceSchema,
  JsonLinesObjectFileSourceSchema,
]);

const PostgresStagingTargetSchema = z
  .object({
    dialect: z.literal('postgres'),
    schema: z.literal('staging'),
    relation: PostgresIdentifierSchema,
    loadMode: z.literal('replace'),
    credentialRef: PostgresCredentialReferenceSchema,
  })
  .strict();

const ObjectFileColumnMappingSchema = z
  .object({
    sourceField: SourceFieldSchema,
    targetColumn: PostgresIdentifierSchema,
    dataType: z.enum(OBJECT_FILE_POSTGRES_COLUMN_TYPE),
    nullable: z.boolean(),
  })
  .strict();

export const LoadObjectFileToPostgresStepTypeConfigSchema = CommonStepTypeConfigSchema.pick({
  stepTimeoutMs: true,
  concurrency: true,
})
  .extend({
    scope: ObjectFileExecutionScopeSchema,
    source: ObjectFileSourceSchema,
    target: PostgresStagingTargetSchema,
    columns: z.array(ObjectFileColumnMappingSchema).min(1).max(256),
  })
  .strict()
  .superRefine((config, context) => {
    if (config.source.sizeBytes > config.source.maxBytes) {
      context.addIssue({
        code: 'custom',
        path: ['source', 'sizeBytes'],
        message: 'source.sizeBytes must not exceed source.maxBytes',
      });
    }

    const locatorError = validateContentAddressedObjectUri(
      config.source.storageUri,
      config.scope.tenantId,
      config.source.sha256
    );
    if (locatorError !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['source', 'storageUri'],
        message: locatorError,
      });
    }

    addDuplicateMappingIssues(config.columns, context);
  });

export type LoadObjectFileToPostgresStepTypeConfig = z.infer<
  typeof LoadObjectFileToPostgresStepTypeConfigSchema
>;

export function validateLoadObjectFileToPostgresPlanOwnership(
  config: unknown,
  planOwnership: PlanOwnership | undefined
): string | undefined {
  const parsedConfig = LoadObjectFileToPostgresStepTypeConfigSchema.safeParse(config);
  if (!parsedConfig.success) {
    return 'LOAD_OBJECT_FILE_TO_POSTGRES config must satisfy its canonical schema';
  }
  if (planOwnership === undefined) {
    return 'LOAD_OBJECT_FILE_TO_POSTGRES requires plan ownership';
  }

  for (const key of ['tenantId', 'projectId', 'environmentId'] as const) {
    if (parsedConfig.data.scope[key] !== planOwnership[key]) {
      return `LOAD_OBJECT_FILE_TO_POSTGRES scope.${key} must match plan ownership`;
    }
  }

  return undefined;
}

function validateContentAddressedObjectUri(
  storageUri: string,
  tenantId: string,
  sha256: string
): string | undefined {
  const expectedPath = `tenants/${tenantId}/${sha256}`;
  const match = /^s3:\/\/([a-z0-9][a-z0-9.-]{1,61}[a-z0-9])\/(.+)$/u.exec(storageUri);
  if (match?.[2] !== expectedPath) {
    return `source.storageUri must match s3://<bucket>/${expectedPath}`;
  }

  return undefined;
}

function addDuplicateMappingIssues(
  columns: readonly z.infer<typeof ObjectFileColumnMappingSchema>[],
  context: z.RefinementCtx
): void {
  const sourceFields = new Set<string>();
  const targetColumns = new Set<string>();
  columns.forEach((column, index) => {
    if (sourceFields.has(column.sourceField)) {
      context.addIssue({
        code: 'custom',
        path: ['columns', index, 'sourceField'],
        message: `Duplicate source field mapping: ${column.sourceField}`,
      });
    }
    if (targetColumns.has(column.targetColumn)) {
      context.addIssue({
        code: 'custom',
        path: ['columns', index, 'targetColumn'],
        message: `Duplicate target column mapping: ${column.targetColumn}`,
      });
    }
    sourceFields.add(column.sourceField);
    targetColumns.add(column.targetColumn);
  });
}
