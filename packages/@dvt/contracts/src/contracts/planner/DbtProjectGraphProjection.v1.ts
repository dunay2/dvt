/**
 * Owned concern: expose the deterministic server-analyzed dbt project graph
 * consumed by a read-only file-backed Canvas.
 *
 * @baseline ADR-0060: dbt Project Authoring Authority
 * @decision Keep dbt file analysis in a versioned projection separate from execution and draft persistence.
 * @consequence Invalid analysis remains explicit and cannot fall back to graph-draft authority.
 * @version 1.0.0
 */
import { z } from 'zod';

import {
  isIsoUtcString,
  isSha256HexString,
  SHA256_HEX_STRING_MESSAGE,
  STRICT_ISO_UTC_STRING_MESSAGE,
} from '../../utils/contractPrimitives.js';

import { CanvasAuthoringAuthorityBindingSchema } from './CanvasAuthoringAuthorityBinding.v1.js';

const NonBlankStringSchema = z.string().trim().min(1);
const Sha256HexStringSchema = NonBlankStringSchema.refine(isSha256HexString, {
  message: SHA256_HEX_STRING_MESSAGE,
});
const IsoUtcStringSchema = NonBlankStringSchema.refine(isIsoUtcString, {
  message: STRICT_ISO_UTC_STRING_MESSAGE,
});
const NonNegativeIntegerSchema = z.number().int().nonnegative();

function addDuplicateIssues(
  values: readonly string[],
  ctx: z.RefinementCtx,
  pathPrefix: string | number,
  message: string
): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      ctx.addIssue({ code: 'custom', message, path: [pathPrefix, index] });
    }
    seen.add(value);
  });
}

const UniqueNonBlankStringArraySchema = z.array(NonBlankStringSchema).superRefine((values, ctx) => {
  addDuplicateIssues(values, ctx, 'items', 'Values must be unique');
});

const DbtVisualEditabilitySchema = z.discriminatedUnion('status', [
  z
    .object({
      status: z.literal('editable'),
      operations: UniqueNonBlankStringArraySchema.min(1),
    })
    .strict(),
  z
    .object({
      status: z.literal('partially_editable'),
      operations: UniqueNonBlankStringArraySchema.min(1),
      reasons: UniqueNonBlankStringArraySchema.min(1),
    })
    .strict(),
  z
    .object({
      status: z.literal('code_only'),
      reasons: UniqueNonBlankStringArraySchema.min(1),
    })
    .strict(),
]);

const DbtProjectedColumnSchema = z
  .object({
    name: NonBlankStringSchema,
    dataType: NonBlankStringSchema.optional(),
    description: NonBlankStringSchema.optional(),
  })
  .strict();

const DbtProjectedTestMetadataSchema = z
  .object({
    name: NonBlankStringSchema.optional(),
    targetUniqueId: NonBlankStringSchema.optional(),
    columnName: NonBlankStringSchema.optional(),
    severity: NonBlankStringSchema.optional(),
  })
  .strict();

const DbtProjectedNodeSchema = z
  .object({
    uniqueId: NonBlankStringSchema,
    resourceType: z.enum(['source', 'model', 'seed', 'snapshot', 'test', 'exposure', 'metric']),
    name: NonBlankStringSchema,
    packageName: NonBlankStringSchema,
    originalFilePath: NonBlankStringSchema.optional(),
    sourceName: NonBlankStringSchema.optional(),
    materialized: NonBlankStringSchema.optional(),
    columns: z.array(DbtProjectedColumnSchema),
    tags: UniqueNonBlankStringArraySchema,
    testMetadata: DbtProjectedTestMetadataSchema.optional(),
    visualEditability: DbtVisualEditabilitySchema,
  })
  .strict()
  .superRefine((node, ctx) => {
    addDuplicateIssues(
      node.columns.map((column) => column.name),
      ctx,
      'columns',
      'Column names must be unique within a projected resource'
    );

    if (node.resourceType === 'source' && node.sourceName === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'sourceName is required for source resources',
        path: ['sourceName'],
      });
    }
  });

const DbtProjectedEdgeSchema = z
  .object({
    id: NonBlankStringSchema,
    sourceUniqueId: NonBlankStringSchema,
    targetUniqueId: NonBlankStringSchema,
    relation: z.enum(['dependency', 'test_target', 'exposure', 'metric']),
  })
  .strict();

const DbtDiagnosticSchema = z
  .object({
    code: NonBlankStringSchema,
    severity: z.enum(['info', 'warning', 'error']),
    message: NonBlankStringSchema,
    path: NonBlankStringSchema.optional(),
    line: z.number().int().positive().optional(),
    column: z.number().int().positive().optional(),
  })
  .strict();

export const DbtProjectRevisionSchema = z
  .object({
    projectRoot: NonBlankStringSchema,
    contentSetSha256: Sha256HexStringSchema,
    analyzedAt: IsoUtcStringSchema,
    analyzerVersion: NonBlankStringSchema,
    dbtVersion: NonBlankStringSchema.optional(),
  })
  .strict();

export const DbtProjectGraphProjectionSchema = z
  .object({
    schemaVersion: z.literal('dbt-project-graph-projection.v1'),
    authorityBinding: CanvasAuthoringAuthorityBindingSchema,
    freshness: z.enum(['fresh', 'stale-last-valid', 'invalid', 'unavailable']),
    projectRevision: DbtProjectRevisionSchema,
    analysisSha256: Sha256HexStringSchema,
    nodes: z.array(DbtProjectedNodeSchema),
    edges: z.array(DbtProjectedEdgeSchema),
    diagnostics: z.array(DbtDiagnosticSchema),
    capabilities: z
      .object({
        canPreview: z.boolean(),
        canRun: z.boolean(),
        codeOnlyResourceCount: NonNegativeIntegerSchema,
      })
      .strict(),
  })
  .strict()
  .superRefine((projection, ctx) => {
    if (projection.authorityBinding.authority.kind !== 'dbt-project-files') {
      ctx.addIssue({
        code: 'custom',
        message: 'A dbt project projection requires dbt-project-files authority',
        path: ['authorityBinding', 'authority'],
      });
      return;
    }

    if (
      projection.authorityBinding.authority.projectRoot !== projection.projectRevision.projectRoot
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Authority and analyzed project roots must match',
        path: ['projectRevision', 'projectRoot'],
      });
    }

    const nodeIds = projection.nodes.map((node) => node.uniqueId);
    addDuplicateIssues(nodeIds, ctx, 'nodes', 'Projected dbt unique IDs must be unique');
    addDuplicateIssues(
      projection.edges.map((edge) => edge.id),
      ctx,
      'edges',
      'Projected edge IDs must be unique'
    );

    const nodeIdSet = new Set(nodeIds);
    projection.edges.forEach((edge, index) => {
      if (!nodeIdSet.has(edge.sourceUniqueId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Edge source must exist in projected nodes',
          path: ['edges', index, 'sourceUniqueId'],
        });
      }
      if (!nodeIdSet.has(edge.targetUniqueId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Edge target must exist in projected nodes',
          path: ['edges', index, 'targetUniqueId'],
        });
      }
    });

    const codeOnlyResourceCount = projection.nodes.filter(
      (node) => node.visualEditability.status === 'code_only'
    ).length;
    if (projection.capabilities.codeOnlyResourceCount !== codeOnlyResourceCount) {
      ctx.addIssue({
        code: 'custom',
        message: 'codeOnlyResourceCount must match projected code-only resources',
        path: ['capabilities', 'codeOnlyResourceCount'],
      });
    }

    if (
      projection.freshness !== 'fresh' &&
      (projection.capabilities.canPreview || projection.capabilities.canRun)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Only a fresh dbt analysis may advertise preview or run capabilities',
        path: ['capabilities'],
      });
    }
  });

export type DbtProjectGraphProjection = z.infer<typeof DbtProjectGraphProjectionSchema>;
export type DbtProjectRevision = z.infer<typeof DbtProjectRevisionSchema>;
