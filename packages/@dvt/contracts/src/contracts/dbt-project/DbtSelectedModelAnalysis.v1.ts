/**
 * Owned concern: publish a deterministic, server-authoritative analysis for one
 * selected dbt model without creating a second dependency graph.
 *
 * @baseline ADR-0060: dbt Project Authoring Authority
 * @decision Native dbt analysis owns semantics; this contract exposes only
 * bounded identities, exact revisions and conservative source regions.
 * @consequence Unsupported syntax remains byte-addressable and code-only.
 * @version 1.0.0
 */
import { z } from 'zod';

import { isSha256HexString, SHA256_HEX_STRING_MESSAGE } from '../../utils/contractPrimitives.js';
import { CanvasAuthoringAuthorityBindingSchema } from '../planner/CanvasAuthoringAuthorityBinding.v1.js';
import { DbtProjectRevisionSchema } from '../planner/DbtProjectGraphProjection.v1.js';

const NonBlankStringSchema = z.string().trim().min(1);
const Sha256Schema = NonBlankStringSchema.refine(isSha256HexString, {
  message: SHA256_HEX_STRING_MESSAGE,
});
const NonNegativeIntegerSchema = z.number().int().nonnegative();

export const DbtSourceByteRangeSchema = z
  .object({
    startByte: NonNegativeIntegerSchema,
    endByte: NonNegativeIntegerSchema,
  })
  .strict()
  .refine((range) => range.endByte > range.startByte, {
    message: 'Source byte ranges must be non-empty and end-exclusive',
    path: ['endByte'],
  });

const DbtAnalyzedFileSchema = z
  .object({
    path: NonBlankStringSchema,
    revisionSha256: Sha256Schema,
    byteLength: NonNegativeIntegerSchema,
    kind: z.enum([
      'project_config',
      'model',
      'source',
      'test',
      'snapshot',
      'seed',
      'macro',
      'schema',
      'other',
    ]),
  })
  .strict();

const DbtSelectedIdentitySchema = z
  .object({
    uniqueId: NonBlankStringSchema,
    resourceType: z.enum(['model', 'source', 'test', 'snapshot', 'seed', 'macro']),
    name: NonBlankStringSchema,
    packageName: NonBlankStringSchema,
    originalFilePath: NonBlankStringSchema.optional(),
    relationToSelection: z.enum(['selected', 'upstream', 'downstream', 'test', 'macro']),
  })
  .strict();

const DbtSelectedDependencySchema = z
  .object({
    sourceUniqueId: NonBlankStringSchema,
    targetUniqueId: NonBlankStringSchema,
    relation: z.enum(['dependency', 'test_target', 'macro']),
    regionId: NonBlankStringSchema.optional(),
  })
  .strict();

const DbtSemanticRegionBaseSchema = z.object({
  regionId: NonBlankStringSchema,
  path: NonBlankStringSchema,
  kind: z.enum(['ref', 'source', 'jinja']),
  range: DbtSourceByteRangeSchema,
  sourceSha256: Sha256Schema,
});

const DbtSemanticRegionSchema = z.discriminatedUnion('classification', [
  DbtSemanticRegionBaseSchema.extend({
    classification: z.literal('supported'),
    targetUniqueId: NonBlankStringSchema,
  }).strict(),
  DbtSemanticRegionBaseSchema.extend({
    classification: z.literal('code_only'),
    reasonCode: NonBlankStringSchema,
  }).strict(),
]);

const DbtAnalysisDiagnosticSubjectSchema = z
  .object({
    kind: z.enum(['project', 'file', 'resource', 'region', 'adapter']),
    uniqueId: NonBlankStringSchema.optional(),
    path: NonBlankStringSchema.optional(),
    regionId: NonBlankStringSchema.optional(),
  })
  .strict();

const DbtAnalysisDiagnosticSchema = z
  .object({
    code: NonBlankStringSchema,
    severity: z.enum(['info', 'warning', 'error']),
    message: NonBlankStringSchema,
    subject: DbtAnalysisDiagnosticSubjectSchema,
    evidence: z
      .object({
        path: NonBlankStringSchema,
        range: DbtSourceByteRangeSchema.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const DbtAnalysisCapabilitySetSchema = z
  .object({
    adapterType: NonBlankStringSchema.optional(),
    analyzerVersion: NonBlankStringSchema,
    dbtVersion: NonBlankStringSchema.optional(),
    supportedRegionKinds: z.array(z.enum(['ref', 'source'])),
    capabilitySetSha256: Sha256Schema,
  })
  .strict();

export const DbtSelectedModelAnalysisSchema = z
  .object({
    schemaVersion: z.literal('dbt-selected-model-analysis.v1'),
    status: z.enum(['ready', 'refused', 'unavailable']),
    authorityBinding: CanvasAuthoringAuthorityBindingSchema,
    projectRevision: DbtProjectRevisionSchema,
    analysisSha256: Sha256Schema,
    selectedAnalysisSha256: Sha256Schema,
    capabilitySet: DbtAnalysisCapabilitySetSchema,
    selectedUniqueId: NonBlankStringSchema,
    files: z.array(DbtAnalyzedFileSchema),
    identities: z.array(DbtSelectedIdentitySchema),
    dependencies: z.array(DbtSelectedDependencySchema),
    regions: z.array(DbtSemanticRegionSchema),
    diagnostics: z.array(DbtAnalysisDiagnosticSchema),
  })
  .strict()
  .superRefine((analysis, ctx) => {
    if (analysis.authorityBinding.authority.kind !== 'dbt-project-files') {
      addIssue(
        ctx,
        ['authorityBinding', 'authority'],
        'Selected dbt analysis requires file authority'
      );
      return;
    }
    if (analysis.authorityBinding.authority.projectRoot !== analysis.projectRevision.projectRoot) {
      addIssue(ctx, ['projectRevision', 'projectRoot'], 'Authority and project roots must match');
    }

    requireSortedUnique(analysis.files, (file) => file.path, ctx, 'files');
    requireSortedUnique(analysis.identities, (identity) => identity.uniqueId, ctx, 'identities');
    requireSortedUnique(
      analysis.dependencies,
      (dependency) =>
        `${dependency.sourceUniqueId}->${dependency.targetUniqueId}:${dependency.relation}:${dependency.regionId ?? ''}`,
      ctx,
      'dependencies'
    );
    requireSortedUnique(
      analysis.regions,
      (region) =>
        `${region.path}:${pad(region.range.startByte)}:${pad(region.range.endByte)}:${region.kind}`,
      ctx,
      'regions'
    );

    const fileByPath = new Map(analysis.files.map((file) => [file.path, file]));
    const identityIds = new Set(analysis.identities.map((identity) => identity.uniqueId));
    const regionById = new Map(analysis.regions.map((region) => [region.regionId, region]));

    const selected = analysis.identities.filter(
      (identity) => identity.relationToSelection === 'selected'
    );
    if (
      analysis.status === 'ready' &&
      (selected.length !== 1 ||
        selected[0]?.uniqueId !== analysis.selectedUniqueId ||
        selected[0]?.resourceType !== 'model')
    ) {
      addIssue(ctx, ['identities'], 'Ready analysis requires exactly one matching selected model');
    }
    if (analysis.status !== 'ready' && analysis.diagnostics.length === 0) {
      addIssue(ctx, ['diagnostics'], 'Refused and unavailable analyses require a diagnostic');
    }

    analysis.regions.forEach((region, index) => {
      const file = fileByPath.get(region.path);
      if (!file || region.range.endByte > file.byteLength) {
        addIssue(ctx, ['regions', index, 'range'], 'Region must be contained in an analyzed file');
      }
      if (region.classification === 'supported' && !identityIds.has(region.targetUniqueId)) {
        addIssue(
          ctx,
          ['regions', index, 'targetUniqueId'],
          'Supported region target must be projected'
        );
      }
      const previous = analysis.regions[index - 1];
      if (
        previous &&
        previous.path === region.path &&
        previous.range.endByte > region.range.startByte
      ) {
        addIssue(ctx, ['regions', index, 'range'], 'Semantic regions must not overlap');
      }
    });

    analysis.dependencies.forEach((dependency, index) => {
      if (
        !identityIds.has(dependency.sourceUniqueId) ||
        !identityIds.has(dependency.targetUniqueId)
      ) {
        addIssue(ctx, ['dependencies', index], 'Dependency endpoints must be projected identities');
      }
      if (dependency.regionId !== undefined && !regionById.has(dependency.regionId)) {
        addIssue(ctx, ['dependencies', index, 'regionId'], 'Dependency region must be projected');
      }
    });

    analysis.diagnostics.forEach((diagnostic, index) => {
      const regionId = diagnostic.subject.regionId;
      if (regionId !== undefined && !regionById.has(regionId)) {
        addIssue(
          ctx,
          ['diagnostics', index, 'subject', 'regionId'],
          'Diagnostic region must be projected'
        );
      }
      const evidence = diagnostic.evidence;
      if (evidence !== undefined && !fileByPath.has(evidence.path)) {
        addIssue(
          ctx,
          ['diagnostics', index, 'evidence', 'path'],
          'Diagnostic evidence file must be projected'
        );
      }
    });
  });

export type DbtSelectedModelAnalysis = z.infer<typeof DbtSelectedModelAnalysisSchema>;
export type DbtSelectedModelSemanticRegion = z.infer<typeof DbtSemanticRegionSchema>;
export type DbtSelectedModelIdentity = z.infer<typeof DbtSelectedIdentitySchema>;

function requireSortedUnique<T>(
  values: readonly T[],
  keyOf: (value: T) => string,
  ctx: z.RefinementCtx,
  path: string
): void {
  let previous: string | undefined;
  values.forEach((value, index) => {
    const key = keyOf(value);
    if (previous !== undefined && key <= previous) {
      addIssue(ctx, [path, index], `${path} must be unique and sorted`);
    }
    previous = key;
  });
}

function addIssue(ctx: z.RefinementCtx, path: (string | number)[], message: string): void {
  ctx.addIssue({ code: 'custom', path, message });
}

function pad(value: number): string {
  return value.toString().padStart(16, '0');
}
