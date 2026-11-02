/** Owned concern: version the lossless, revision-bound dbt root-relocation protocol. */
import { sha256HexUtf8 } from '@dvt/crypto';
import { z } from 'zod';

import { isSha256HexString, SHA256_HEX_STRING_MESSAGE } from '../../utils/contractPrimitives.js';
import { WorkspaceRelativeProjectRootSchema } from '../planner/CanvasAuthoringAuthorityBinding.v1.js';
import { WorkspaceGraphDraftScopeSchema } from '../planner/WorkspaceGraphDraft.v1.js';

const Text = z.string().trim().min(1).max(4096);
const Digest = z.string().refine(isSha256HexString, { message: SHA256_HEX_STRING_MESSAGE });
export const DBT_PROJECT_ROOT_RELOCATION_MAX_FILES = 250;
const FilePath = z
  .string()
  .min(1)
  .max(4096)
  .refine((value) => {
    const parsed = WorkspaceRelativeProjectRootSchema.safeParse(value);
    return (
      parsed.success &&
      parsed.data === value &&
      value !== '.' &&
      Array.from(value).every(
        (character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127
      )
    );
  }, 'A canonical workspace-relative path is required.');

const PlanData = z
  .object({
    schemaVersion: z.literal('dbt-project-root-relocation-plan.v1'),
    scope: WorkspaceGraphDraftScopeSchema,
    canvasId: Text,
    sourceRoot: FilePath,
    targetRoot: z.literal('.'),
    authorityRevision: Text,
    files: z
      .array(
        z
          .object({
            sourcePath: FilePath,
            targetPath: FilePath,
            contentSha256: Digest,
            targetContentSha256: Digest.nullable(),
          })
          .strict()
      )
      .min(1)
      .max(DBT_PROJECT_ROOT_RELOCATION_MAX_FILES),
  })
  .strict();

export type DbtProjectRootRelocationPlanInput = z.input<typeof PlanData>;

function orderedPlan(data: z.infer<typeof PlanData>): z.infer<typeof PlanData> {
  return {
    schemaVersion: data.schemaVersion,
    scope: data.scope,
    canvasId: data.canvasId,
    sourceRoot: data.sourceRoot,
    targetRoot: data.targetRoot,
    authorityRevision: data.authorityRevision,
    files: [...data.files].sort((a, b) =>
      a.sourcePath < b.sourcePath ? -1 : a.sourcePath > b.sourcePath ? 1 : 0
    ),
  };
}

export const DbtProjectRootRelocationPlanSchema = PlanData.extend({
  planSha256: Digest,
}).superRefine((plan, context) => {
  const sources = new Set<string>();
  const targets = new Set<string>();
  plan.files.forEach((file, index) => {
    if (
      !file.sourcePath.startsWith(`${plan.sourceRoot}/`) ||
      file.targetPath !== file.sourcePath.slice(plan.sourceRoot.length + 1) ||
      sources.has(file.sourcePath) ||
      targets.has(file.targetPath) ||
      (file.targetContentSha256 !== null && file.targetContentSha256 !== file.contentSha256)
    )
      context.addIssue({
        code: 'custom',
        path: ['files', index],
        message: 'Moves must be unique, byte-preserving and relative to the original project root.',
      });
    sources.add(file.sourcePath);
    targets.add(file.targetPath);
  });
  if (plan.files.some((file) => sources.has(file.targetPath))) {
    context.addIssue({
      code: 'custom',
      path: ['files'],
      message: 'Source and destination file sets must not overlap.',
    });
  }
  if (!targets.has('dbt_project.yml'))
    context.addIssue({
      code: 'custom',
      path: ['files'],
      message: 'The project configuration must be included.',
    });
  if (sha256HexUtf8(JSON.stringify(orderedPlan(plan))) !== plan.planSha256) {
    context.addIssue({
      code: 'custom',
      path: ['planSha256'],
      message: 'The plan digest does not match its scope and revisions.',
    });
  }
});

export type DbtProjectRootRelocationPlan = z.infer<typeof DbtProjectRootRelocationPlanSchema>;

export function createDbtProjectRootRelocationPlan(
  input: DbtProjectRootRelocationPlanInput
): DbtProjectRootRelocationPlan {
  const data = orderedPlan(PlanData.parse(input));
  return DbtProjectRootRelocationPlanSchema.parse({
    ...data,
    planSha256: sha256HexUtf8(JSON.stringify(data)),
  });
}

export const DbtProjectRootRelocationRefusalReasonSchema = z.enum([
  'authority_unavailable',
  'mixed_authority',
  'multiple_projects',
  'unsafe_project',
  'private_file',
  'inventory_changed',
  'destination_conflict',
  'stale_authority',
  'stale_files',
  'scope_mismatch',
  'recovery_conflict',
  'limit_exceeded',
]);
export type DbtProjectRootRelocationRefusalReason = z.infer<
  typeof DbtProjectRootRelocationRefusalReasonSchema
>;

const Refusal = z
  .object({
    kind: z.literal('refused'),
    reason: DbtProjectRootRelocationRefusalReasonSchema,
    paths: z.array(WorkspaceRelativeProjectRootSchema).max(500).optional(),
  })
  .strict();

export const PreviewDbtProjectRootRelocationRequestSchema = z.object({ canvasId: Text }).strict();
export const DbtProjectRootRelocationPreviewSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('ready'), plan: DbtProjectRootRelocationPlanSchema }).strict(),
  z
    .object({
      kind: z.literal('already_normalized'),
      canvasId: Text,
      authorityRevision: Text,
      projectRoot: z.literal('.'),
    })
    .strict(),
  Refusal,
]);
export type DbtProjectRootRelocationPreview = z.infer<typeof DbtProjectRootRelocationPreviewSchema>;

export const RelocateDbtProjectRootRequestSchema = z
  .object({ plan: DbtProjectRootRelocationPlanSchema })
  .strict();
export const DbtProjectRootRelocationReceiptSchema = z
  .object({
    kind: z.literal('relocated'),
    planSha256: Digest,
    canvasId: Text,
    projectRoot: z.literal('.'),
    authorityRevision: Text,
    deduplicated: z.boolean(),
    sourceDirectoryRetained: z.boolean(),
  })
  .strict();
export const DbtProjectRootRelocationResultSchema = z.discriminatedUnion('kind', [
  DbtProjectRootRelocationReceiptSchema,
  Refusal,
]);
export type DbtProjectRootRelocationResult = z.infer<typeof DbtProjectRootRelocationResultSchema>;
