/**
 * Owned concern: version the complete, revision-guarded publication request
 * and immutable result for graph-derived dbt workspace artifacts.
 *
 * @baseline ADR-0060: dbt Project Authoring Authority
 * @decision Publish the complete graph-derived dbt artifact set through one specific atomic command.
 * @consequence A browser cannot partially publish graph-derived dbt project files.
 * @version 1.0.0
 */
import { sha256HexUtf8 } from '@dvt/crypto';
import { z } from 'zod';

const NonBlankStringSchema = z.string().trim().min(1);
const Sha256HexStringSchema = z.string().regex(/^[a-f0-9]{64}$/u);
const GraphDbtArtifactPathSchema = NonBlankStringSchema.max(4_096);
export const GRAPH_DBT_MODEL_DIVERGENCE_MARKER_PREFIX = '-- dvt:graph-draft-content-sha256=';
const GRAPH_DBT_MODEL_DIVERGENCE_MARKER_PATTERN =
  /^-- dvt:graph-draft-content-sha256=([a-f0-9]{64})\r?\n([\s\S]*)$/u;

export type GraphDbtModelDivergenceMarker = Readonly<{
  contentSha256: string;
  payload: string;
  valid: boolean;
}>;

export function parseGraphDbtModelDivergenceMarker(
  content: string
): GraphDbtModelDivergenceMarker | null {
  const match = GRAPH_DBT_MODEL_DIVERGENCE_MARKER_PATTERN.exec(content);
  if (!match) return null;

  const contentSha256 = match[1]!;
  const payload = match[2]!;
  return {
    contentSha256,
    payload,
    valid: sha256HexUtf8(payload) === contentSha256,
  };
}

export const GraphDbtWorkspaceArtifactExpectedRevisionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('absent') }).strict(),
  z
    .object({
      kind: z.literal('content_sha256'),
      value: Sha256HexStringSchema,
    })
    .strict(),
]);

export const GraphDbtWorkspaceArtifactPublicationItemSchema = z
  .object({
    path: GraphDbtArtifactPathSchema,
    content: z.string().max(1_000_000),
    language: z.enum(['sql', 'yaml']),
    expectedRevision: GraphDbtWorkspaceArtifactExpectedRevisionSchema,
    writeRequired: z.boolean(),
  })
  .strict()
  .superRefine((artifact, context) => {
    const isYamlPath = artifact.path === 'dbt_project.yml' || artifact.path === 'models/schema.yml';
    const isSqlPath = /^models\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.sql$/u.test(artifact.path);
    if (
      (artifact.language === 'yaml' && !isYamlPath) ||
      (artifact.language === 'sql' && !isSqlPath)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Graph-derived dbt artifacts must use the governed project or model paths.',
        path: ['path'],
      });
    }
    if (artifact.language === 'sql') {
      const marker = parseGraphDbtModelDivergenceMarker(artifact.content);
      if (!marker) {
        context.addIssue({
          code: 'custom',
          message: 'Graph-derived dbt model SQL must carry the graph-draft divergence marker.',
          path: ['content'],
        });
      } else if (!marker.valid) {
        context.addIssue({
          code: 'custom',
          message: 'Graph-derived dbt model SQL divergence marker must match its payload.',
          path: ['content'],
        });
      }
    }
  });

export const PublishGraphDbtWorkspaceArtifactsRequestSchema = z
  .object({
    canvasId: NonBlankStringSchema.max(256),
    artifacts: z.array(GraphDbtWorkspaceArtifactPublicationItemSchema).min(3).max(500),
    idempotencyKey: NonBlankStringSchema.max(256),
  })
  .strict()
  .superRefine((request, context) => {
    const paths = request.artifacts.map((artifact) => artifact.path);
    if (new Set(paths).size !== paths.length) {
      context.addIssue({
        code: 'custom',
        message: 'Graph-derived dbt artifact paths must be unique.',
        path: ['artifacts'],
      });
    }
    if (!paths.includes('dbt_project.yml') || !paths.includes('models/schema.yml')) {
      context.addIssue({
        code: 'custom',
        message: 'The complete graph-derived dbt project YAML set is required.',
        path: ['artifacts'],
      });
    }
    if (!request.artifacts.some((artifact) => artifact.language === 'sql')) {
      context.addIssue({
        code: 'custom',
        message: 'At least one graph-derived dbt model SQL artifact is required.',
        path: ['artifacts'],
      });
    }
  });

const GraphDbtWorkspaceArtifactPublishedWriteSchema = z
  .object({
    path: GraphDbtArtifactPathSchema,
    contentSha256: Sha256HexStringSchema,
  })
  .strict();

export const GraphDbtWorkspaceArtifactPublicationAppliedSchema = z
  .object({
    schemaVersion: z.literal('graph-dbt-workspace-artifact-publication.v1'),
    kind: z.literal('applied'),
    idempotencyKey: NonBlankStringSchema.max(256),
    requestHash: Sha256HexStringSchema,
    deduplicated: z.boolean(),
    writes: z.array(GraphDbtWorkspaceArtifactPublishedWriteSchema).max(500),
  })
  .strict();

export const GraphDbtWorkspaceArtifactPublicationConflictSchema = z
  .object({
    schemaVersion: z.literal('graph-dbt-workspace-artifact-publication.v1'),
    kind: z.literal('conflict'),
    conflicts: z
      .array(
        z
          .object({
            path: GraphDbtArtifactPathSchema,
            currentContentSha256: Sha256HexStringSchema.nullable(),
          })
          .strict()
      )
      .min(1)
      .max(500),
  })
  .strict();

export const GraphDbtWorkspaceArtifactPublicationAuthorityRefusedSchema = z
  .object({
    schemaVersion: z.literal('graph-dbt-workspace-artifact-publication.v1'),
    kind: z.literal('authority_refused'),
    canvasId: NonBlankStringSchema.max(256),
    reason: z.enum(['missing_authority', 'mixed_authority', 'dbt_project_files_authority']),
  })
  .strict();

export const GraphDbtWorkspaceArtifactPublicationResultSchema = z.discriminatedUnion('kind', [
  GraphDbtWorkspaceArtifactPublicationAppliedSchema,
  GraphDbtWorkspaceArtifactPublicationConflictSchema,
  GraphDbtWorkspaceArtifactPublicationAuthorityRefusedSchema,
]);

export type GraphDbtWorkspaceArtifactExpectedRevision = z.infer<
  typeof GraphDbtWorkspaceArtifactExpectedRevisionSchema
>;
export type GraphDbtWorkspaceArtifactPublicationItem = z.infer<
  typeof GraphDbtWorkspaceArtifactPublicationItemSchema
>;
export type PublishGraphDbtWorkspaceArtifactsRequest = z.infer<
  typeof PublishGraphDbtWorkspaceArtifactsRequestSchema
>;
export type GraphDbtWorkspaceArtifactPublicationApplied = z.infer<
  typeof GraphDbtWorkspaceArtifactPublicationAppliedSchema
>;
export type GraphDbtWorkspaceArtifactPublicationConflict = z.infer<
  typeof GraphDbtWorkspaceArtifactPublicationConflictSchema
>;
export type GraphDbtWorkspaceArtifactPublicationAuthorityRefused = z.infer<
  typeof GraphDbtWorkspaceArtifactPublicationAuthorityRefusedSchema
>;
export type GraphDbtWorkspaceArtifactPublicationResult = z.infer<
  typeof GraphDbtWorkspaceArtifactPublicationResultSchema
>;
