/**
 * Owned concern: bind persisted plan previews to their authoritative inputs.
 *
 * @baseline ADR-0060: dbt Project Authoring Authority
 * @decision Use one discriminated provenance contract for transformation Git artifacts and file-authoritative dbt projects.
 * @consequence Consumers cannot confuse generated-artifact authority with an analyzed dbt project revision.
 * @version 1.0.0
 */
import { z } from 'zod';

import {
  CREDENTIAL_REFERENCE_MESSAGE,
  isCredentialReference,
  isSha256HexString,
  SHA256_HEX_STRING_MESSAGE,
} from '../../utils/contractPrimitives.js';
import { ConnectionRefSchema } from '../source-import/ConnectedSourceRef.v1.js';

import { WorkspaceRelativeProjectRootSchema } from './CanvasAuthoringAuthorityBinding.v1.js';

const NonBlankStringSchema = z.string().trim().min(1);
const Sha256HexStringSchema = NonBlankStringSchema.refine(isSha256HexString, {
  message: SHA256_HEX_STRING_MESSAGE,
});
const CredentialReferenceSchema = z
  .string()
  .refine(isCredentialReference, CREDENTIAL_REFERENCE_MESSAGE);

export const PLAN_PREVIEW_PROVENANCE_KIND = {
  transformationGitArtifacts: 'transformation-git-artifacts',
  dbtProjectFiles: 'dbt-project-files',
} as const;

export const GitArtifactRefSchema = z
  .object({
    repo: NonBlankStringSchema,
    path: NonBlankStringSchema,
    ref: NonBlankStringSchema,
    commitSha: NonBlankStringSchema,
    contentSha256: Sha256HexStringSchema,
  })
  .strict();

export const DbtExecutionTargetIdentitySchema = z
  .object({
    provider: NonBlankStringSchema,
    adapter: NonBlankStringSchema,
    targetName: NonBlankStringSchema,
    connectionRef: ConnectionRefSchema,
    resolutionSource: z.literal('environment-default'),
    credentialRef: CredentialReferenceSchema,
  })
  .strict()
  .superRefine((target, ctx) => {
    if (target.connectionRef.provider !== target.adapter) {
      ctx.addIssue({
        code: 'custom',
        path: ['connectionRef', 'provider'],
        message: 'DBT execution connection provider must match the target adapter.',
      });
    }
  });

const TransformationGitArtifactsProvenanceSchema = z
  .object({
    kind: z.literal(PLAN_PREVIEW_PROVENANCE_KIND.transformationGitArtifacts),
    graphArtifact: GitArtifactRefSchema,
    sqlArtifact: GitArtifactRefSchema,
  })
  .strict();

const DbtProjectFilesProvenanceSchema = z
  .object({
    kind: z.literal(PLAN_PREVIEW_PROVENANCE_KIND.dbtProjectFiles),
    canvasId: NonBlankStringSchema,
    projectRoot: WorkspaceRelativeProjectRootSchema,
    contentSetSha256: Sha256HexStringSchema,
    analysisSha256: Sha256HexStringSchema,
    dbtVersion: NonBlankStringSchema,
    selectedUniqueIds: z.array(NonBlankStringSchema).min(1),
    executionTarget: DbtExecutionTargetIdentitySchema,
  })
  .strict()
  .superRefine((provenance, ctx) => {
    const uniqueIds = new Set(provenance.selectedUniqueIds);
    if (uniqueIds.size !== provenance.selectedUniqueIds.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['selectedUniqueIds'],
        message: 'selectedUniqueIds must be unique',
      });
    }

    const sortedIds = [...provenance.selectedUniqueIds].sort((left, right) =>
      left.localeCompare(right)
    );
    if (sortedIds.some((value, index) => value !== provenance.selectedUniqueIds[index])) {
      ctx.addIssue({
        code: 'custom',
        path: ['selectedUniqueIds'],
        message: 'selectedUniqueIds must be sorted',
      });
    }
  });

export const PlanPreviewProvenanceSchema = z.discriminatedUnion('kind', [
  TransformationGitArtifactsProvenanceSchema,
  DbtProjectFilesProvenanceSchema,
]);

export type GitArtifactRef = z.infer<typeof GitArtifactRefSchema>;
export type DbtExecutionTargetIdentity = z.infer<typeof DbtExecutionTargetIdentitySchema>;
export type TransformationGitArtifactsProvenance = z.infer<
  typeof TransformationGitArtifactsProvenanceSchema
>;
export type DbtProjectFilesProvenance = z.infer<typeof DbtProjectFilesProvenanceSchema>;
export type PlanPreviewProvenance = z.infer<typeof PlanPreviewProvenanceSchema>;
