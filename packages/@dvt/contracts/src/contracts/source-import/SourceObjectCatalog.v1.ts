import { z } from 'zod';

export const SOURCE_OBJECT_CATALOG_CONTRACT_VERSION = 1 as const;

export const SOURCE_OBJECT_LOCATOR_KIND = ['relation', 'file', 'endpoint', 'stream'] as const;
export const SOURCE_OBJECT_RELATION_TYPE = [
  'table',
  'partitioned-table',
  'view',
  'materialized-view',
  'foreign-table',
] as const;
export const SOURCE_OBJECT_FILE_FORMAT = [
  'parquet',
  'json',
  'csv',
  'avro',
  'orc',
  'other',
] as const;
export const SOURCE_OBJECT_ENDPOINT_PROTOCOL = ['http', 'https'] as const;
export const SOURCE_OBJECT_STREAM_PROTOCOL = ['kafka', 'pulsar', 'other'] as const;

export const SOURCE_OBJECT_METRIC_PROVENANCE = ['measured', 'estimated'] as const;
export const SOURCE_OBJECT_METRIC_CONFIDENCE = ['exact', 'high', 'medium', 'low'] as const;
export const SOURCE_OBJECT_METRIC_METHOD = [
  'provider-storage-metadata',
  'provider-statistics',
  'query-plan',
  'data-scan',
  'schema-width',
] as const;
export const SOURCE_OBJECT_BYTE_SIZE_BASIS = [
  'physical-allocation',
  'logical-payload',
  'provider-row-storage',
  'lower-bound',
] as const;
export const SOURCE_OBJECT_CONSTRAINT_KIND = ['primary-key', 'unique'] as const;

const NonBlankStringSchema = z.string().trim().min(1);
const OpaqueNonBlankStringSchema = z
  .string()
  .refine((value) => value.trim().length > 0, 'Expected a non-blank string.');
const NonNegativeSafeIntegerSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const CanonicalIsoTimestampSchema = z
  .string()
  .refine(
    (value) => Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value,
    'Expected a canonical ISO-8601 timestamp.'
  );

export const SourceObjectMetricObservationScopeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('snapshot') }).strict(),
  z
    .object({
      kind: z.literal('window'),
      startedAt: CanonicalIsoTimestampSchema,
      endedAt: CanonicalIsoTimestampSchema,
    })
    .strict()
    .refine((scope) => Date.parse(scope.startedAt) < Date.parse(scope.endedAt), {
      message: 'Metric observation window must end after it starts.',
      path: ['endedAt'],
    }),
]);

export const SourceObjectRowCountMetricSchema = z.discriminatedUnion('method', [
  z
    .object({
      value: NonNegativeSafeIntegerSchema,
      provenance: z.literal('estimated'),
      method: z.literal('provider-statistics'),
      confidence: z.enum(['high', 'medium', 'low']),
    })
    .strict(),
  z
    .object({
      value: NonNegativeSafeIntegerSchema,
      provenance: z.literal('estimated'),
      method: z.literal('query-plan'),
      confidence: z.enum(['medium', 'low']),
    })
    .strict(),
  z
    .object({
      value: NonNegativeSafeIntegerSchema,
      provenance: z.literal('measured'),
      method: z.literal('data-scan'),
      confidence: z.literal('exact'),
    })
    .strict(),
]);

export const SourceObjectByteSizeMetricSchema = z.discriminatedUnion('method', [
  z
    .object({
      value: NonNegativeSafeIntegerSchema,
      provenance: z.literal('measured'),
      method: z.literal('provider-storage-metadata'),
      confidence: z.literal('exact'),
      basis: z.literal('physical-allocation'),
    })
    .strict(),
  z
    .object({
      value: NonNegativeSafeIntegerSchema,
      provenance: z.literal('measured'),
      method: z.literal('data-scan'),
      confidence: z.literal('exact'),
      basis: z.literal('logical-payload'),
    })
    .strict(),
  z
    .object({
      value: NonNegativeSafeIntegerSchema,
      provenance: z.literal('estimated'),
      method: z.literal('schema-width'),
      confidence: z.literal('low'),
      basis: z.enum(['logical-payload', 'provider-row-storage', 'lower-bound']),
    })
    .strict(),
]);

export const SourceObjectMetricEvidenceSchema = z
  .object({
    observedAt: CanonicalIsoTimestampSchema,
    observationScope: SourceObjectMetricObservationScopeSchema,
    rowCount: SourceObjectRowCountMetricSchema,
    byteSize: SourceObjectByteSizeMetricSchema,
  })
  .strict();

export const RelationalSourceObjectLocatorSchema = z
  .object({
    kind: z.literal('relation'),
    catalog: OpaqueNonBlankStringSchema,
    schema: OpaqueNonBlankStringSchema,
    name: OpaqueNonBlankStringSchema,
    relationType: z.enum(SOURCE_OBJECT_RELATION_TYPE),
  })
  .strict();

export const FileSourceObjectLocatorSchema = z
  .object({
    kind: z.literal('file'),
    path: OpaqueNonBlankStringSchema,
    format: z.enum(SOURCE_OBJECT_FILE_FORMAT),
  })
  .strict();

export const EndpointSourceObjectLocatorSchema = z
  .object({
    kind: z.literal('endpoint'),
    resource: OpaqueNonBlankStringSchema,
    protocol: z.enum(SOURCE_OBJECT_ENDPOINT_PROTOCOL),
  })
  .strict();

export const StreamSourceObjectLocatorSchema = z
  .object({
    kind: z.literal('stream'),
    resource: OpaqueNonBlankStringSchema,
    protocol: z.enum(SOURCE_OBJECT_STREAM_PROTOCOL),
  })
  .strict();

export const SourceObjectLocatorSchema = z.discriminatedUnion('kind', [
  RelationalSourceObjectLocatorSchema,
  FileSourceObjectLocatorSchema,
  EndpointSourceObjectLocatorSchema,
  StreamSourceObjectLocatorSchema,
]);

export const SourceObjectColumnSchema = z
  .object({
    name: OpaqueNonBlankStringSchema,
    type: OpaqueNonBlankStringSchema,
    nullable: z.boolean(),
  })
  .strict();

export const SourceObjectConstraintSchema = z
  .object({
    name: OpaqueNonBlankStringSchema.optional(),
    kind: z.enum(SOURCE_OBJECT_CONSTRAINT_KIND),
    columns: z
      .array(OpaqueNonBlankStringSchema)
      .min(1)
      .superRefine((columns, context) => {
        const seenColumns = new Set<string>();
        columns.forEach((column, index) => {
          if (seenColumns.has(column)) {
            context.addIssue({
              code: 'custom',
              message: `Duplicate constraint column: ${column}`,
              path: [index],
            });
          }
          seenColumns.add(column);
        });
      }),
  })
  .strict();

export const SourceObjectSelectionSchema = z
  .object({
    objectId: OpaqueNonBlankStringSchema,
  })
  .strict();

export const SourceObjectSelectionListSchema = z
  .array(SourceObjectSelectionSchema)
  .min(1)
  .superRefine((selections, context) => {
    const seenObjectIds = new Set<string>();
    selections.forEach((selection, index) => {
      if (seenObjectIds.has(selection.objectId)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate source object selection: ${selection.objectId}`,
          path: [index, 'objectId'],
        });
      }
      seenObjectIds.add(selection.objectId);
    });
  });

export const SourceObjectSchema = z
  .object({
    objectId: OpaqueNonBlankStringSchema,
    displayName: NonBlankStringSchema,
    locator: SourceObjectLocatorSchema,
    metricEvidence: SourceObjectMetricEvidenceSchema,
    columns: z.array(SourceObjectColumnSchema).optional(),
    constraints: z.array(SourceObjectConstraintSchema).optional(),
  })
  .strict()
  .superRefine((sourceObject, context) => {
    if (
      sourceObject.locator.kind === 'relation' &&
      sourceObject.objectId !== buildRelationalSourceObjectId(sourceObject.locator)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Relational source object ID does not match its locator.',
        path: ['objectId'],
      });
    }

    const expectedScope = sourceObject.locator.kind === 'stream' ? 'window' : 'snapshot';
    if (sourceObject.metricEvidence.observationScope.kind !== expectedScope) {
      context.addIssue({
        code: 'custom',
        message: `${sourceObject.locator.kind} source metrics require a ${expectedScope} observation scope.`,
        path: ['metricEvidence', 'observationScope'],
      });
    }

    const columnNames = new Set(sourceObject.columns?.map((column) => column.name) ?? []);
    sourceObject.constraints?.forEach((constraint, constraintIndex) => {
      constraint.columns.forEach((column, columnIndex) => {
        if (!columnNames.has(column)) {
          context.addIssue({
            code: 'custom',
            message: `Constraint references unknown column: ${column}`,
            path: ['constraints', constraintIndex, 'columns', columnIndex],
          });
        }
      });
    });
  });

export const SourceObjectListSchema = z
  .array(SourceObjectSchema)
  .superRefine((sourceObjects, context) => {
    const seenObjectIds = new Set<string>();
    sourceObjects.forEach((sourceObject, index) => {
      if (seenObjectIds.has(sourceObject.objectId)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate source object ID: ${sourceObject.objectId}`,
          path: [index, 'objectId'],
        });
      }
      seenObjectIds.add(sourceObject.objectId);
    });
  });

export const SourceObjectCatalogResponseSchema = z
  .object({
    contractVersion: z.literal(SOURCE_OBJECT_CATALOG_CONTRACT_VERSION),
    objects: SourceObjectListSchema,
  })
  .strict();

export type SourceObjectLocatorKind = (typeof SOURCE_OBJECT_LOCATOR_KIND)[number];
export type SourceObjectMetricProvenance = (typeof SOURCE_OBJECT_METRIC_PROVENANCE)[number];
export type SourceObjectMetricConfidence = (typeof SOURCE_OBJECT_METRIC_CONFIDENCE)[number];
export type SourceObjectMetricMethod = (typeof SOURCE_OBJECT_METRIC_METHOD)[number];
export type SourceObjectByteSizeBasis = (typeof SOURCE_OBJECT_BYTE_SIZE_BASIS)[number];
export type SourceObjectMetricObservationScope = z.infer<
  typeof SourceObjectMetricObservationScopeSchema
>;
export type SourceObjectRowCountMetric = z.infer<typeof SourceObjectRowCountMetricSchema>;
export type SourceObjectByteSizeMetricValue = z.infer<typeof SourceObjectByteSizeMetricSchema>;
export type SourceObjectMetricEvidence = z.infer<typeof SourceObjectMetricEvidenceSchema>;
export type RelationalSourceObjectLocator = z.infer<typeof RelationalSourceObjectLocatorSchema>;
export type SourceObjectLocator = z.infer<typeof SourceObjectLocatorSchema>;
export type SourceObjectColumn = z.infer<typeof SourceObjectColumnSchema>;
export type SourceObjectConstraint = z.infer<typeof SourceObjectConstraintSchema>;
export type SourceObjectColumnConstraintSemantics = Readonly<{
  primaryKey: boolean;
  independentlyUnique: boolean;
}>;
export type SourceObjectSelection = z.infer<typeof SourceObjectSelectionSchema>;
export type SourceObjectCatalogResponse = z.infer<typeof SourceObjectCatalogResponseSchema>;
export type SourceObject = z.infer<typeof SourceObjectSchema>;
export type RelationalSourceObject = SourceObject & {
  locator: RelationalSourceObjectLocator;
};

export function createSourceObjectMetricEvidence(
  evidence: SourceObjectMetricEvidence
): SourceObjectMetricEvidence {
  return SourceObjectMetricEvidenceSchema.parse(evidence);
}

export function buildRelationalSourceObjectId(locator: RelationalSourceObjectLocator): string {
  return ['relation', locator.catalog, locator.schema, locator.name]
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function isRelationalSourceObject(
  sourceObject: SourceObject
): sourceObject is RelationalSourceObject {
  return sourceObject.locator.kind === 'relation';
}

export function resolveSourceObjectColumnConstraintSemantics(
  sourceObject: Pick<SourceObject, 'constraints'>,
  columnName: string
): SourceObjectColumnConstraintSemantics {
  const constraints = sourceObject.constraints ?? [];
  return {
    primaryKey: constraints.some(
      (constraint) => constraint.kind === 'primary-key' && constraint.columns.includes(columnName)
    ),
    independentlyUnique: constraints.some(
      (constraint) =>
        constraint.columns.length === 1 &&
        constraint.columns[0] === columnName &&
        (constraint.kind === 'primary-key' || constraint.kind === 'unique')
    ),
  };
}
