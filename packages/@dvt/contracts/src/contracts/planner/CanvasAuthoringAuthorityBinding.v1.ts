/**
 * Owned concern: define the mutually exclusive semantic authority for one
 * Canvas authoring document.
 *
 * @baseline ADR-0060: dbt Project Authoring Authority
 * @decision Version graph-draft and dbt-project-files authority outside WorkspaceGraphAuthoringDraft.v1.
 * @consequence A Canvas cannot silently merge file-backed resources with graph-draft semantics.
 * @version 1.0.0
 */
import { z } from 'zod';

const NonBlankStringSchema = z.string().trim().min(1);

const WorkspaceRelativeProjectRootSchema = NonBlankStringSchema.superRefine((value, ctx) => {
  if (value === '.') {
    return;
  }

  if (value.startsWith('/') || value.endsWith('/') || value.includes('\\') || value.includes(':')) {
    ctx.addIssue({
      code: 'custom',
      message: 'projectRoot must be a normalized workspace-relative path',
    });
    return;
  }

  const segments = value.split('/');
  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    ctx.addIssue({
      code: 'custom',
      message: 'projectRoot must not contain empty, current, or parent path segments',
    });
  }
});

const GraphDraftAuthoritySchema = z
  .object({
    kind: z.literal('graph-draft'),
  })
  .strict();

const DbtProjectFilesAuthoritySchema = z
  .object({
    kind: z.literal('dbt-project-files'),
    projectRoot: WorkspaceRelativeProjectRootSchema,
  })
  .strict();

export const CanvasAuthoringAuthorityBindingSchema = z
  .object({
    schemaVersion: z.literal('canvas-authoring-authority-binding.v1'),
    canvasId: NonBlankStringSchema,
    authority: z.discriminatedUnion('kind', [
      GraphDraftAuthoritySchema,
      DbtProjectFilesAuthoritySchema,
    ]),
  })
  .strict();

export type CanvasAuthoringAuthorityBinding = z.infer<typeof CanvasAuthoringAuthorityBindingSchema>;
