/**
 * Owned concern: version Source Import results for mutually exclusive Canvas
 * authoring authorities.
 *
 * @baseline ADR-0060: dbt Project Authoring Authority
 * @decision Resolve authority on the server and return a discriminated outcome for the one mutated authority.
 * @consequence File-backed imports cannot masquerade as graph-draft mutations or create semantic draft nodes.
 * @version 2.0.0
 */
import { z } from 'zod';

import { isSha256HexString, SHA256_HEX_STRING_MESSAGE } from '../../utils/contractPrimitives.js';
import { CanvasAuthoringAuthorityBindingSchema } from '../planner/CanvasAuthoringAuthorityBinding.v1.js';
import { DbtProjectRevisionSchema } from '../planner/DbtProjectGraphProjection.v1.js';

import {
  ImportSourceObjectsRequestSchema,
  SourceImportOptionsSchema,
  SOURCE_IMPORT_GROUPING,
} from './SourceImportOperations.v1.js';

const NonBlankStringSchema = z.string().trim().min(1);
const PositiveSafeIntegerSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const Sha256HexStringSchema = NonBlankStringSchema.refine(isSha256HexString, {
  message: SHA256_HEX_STRING_MESSAGE,
});
const UniqueNonBlankStringListSchema = z
  .array(NonBlankStringSchema)
  .min(1)
  .superRefine((values, context) => {
    const seen = new Set<string>();
    values.forEach((value, index) => {
      if (seen.has(value)) {
        context.addIssue({
          code: 'custom',
          message: 'Values must be unique.',
          path: [index],
        });
      }
      seen.add(value);
    });
  });

export const ImportSourceObjectsRequestV2Schema = ImportSourceObjectsRequestSchema.extend({
  schemaVersion: z.literal('source-import-request.v2'),
  canvasId: NonBlankStringSchema,
  idempotencyKey: NonBlankStringSchema,
}).strict();

const GraphDraftSourceImportOutcomeSchema = z
  .object({
    kind: z.literal('graph-draft'),
    draftRevision: NonBlankStringSchema,
    importedNodeIds: UniqueNonBlankStringListSchema,
  })
  .strict();

const DbtProjectFilesSourceImportOutcomeSchema = z
  .object({
    kind: z.literal('dbt-project-files'),
    projectRevision: DbtProjectRevisionSchema,
    analysisSha256: Sha256HexStringSchema,
    projectedSourceUniqueIds: UniqueNonBlankStringListSchema,
  })
  .strict();

export const ImportSourceObjectsResultV2Schema = z
  .object({
    schemaVersion: z.literal('source-import-result.v2'),
    success: z.literal(true),
    idempotencyKey: NonBlankStringSchema,
    authorityBinding: CanvasAuthoringAuthorityBindingSchema,
    sourcesCreated: PositiveSafeIntegerSchema,
    objectsImported: PositiveSafeIntegerSchema,
    yamlFiles: UniqueNonBlankStringListSchema,
    grouping: z.enum(SOURCE_IMPORT_GROUPING),
    options: SourceImportOptionsSchema,
    outcome: z.discriminatedUnion('kind', [
      GraphDraftSourceImportOutcomeSchema,
      DbtProjectFilesSourceImportOutcomeSchema,
    ]),
  })
  .strict()
  .superRefine((result, context) => {
    if (result.sourcesCreated > result.objectsImported) {
      context.addIssue({
        code: 'custom',
        message: 'Created dbt source groups cannot exceed imported objects.',
        path: ['sourcesCreated'],
      });
    }

    if (result.authorityBinding.authority.kind !== result.outcome.kind) {
      context.addIssue({
        code: 'custom',
        message: 'Source Import outcome must match persisted Canvas authority.',
        path: ['outcome', 'kind'],
      });
      return;
    }

    if (
      result.outcome.kind === 'dbt-project-files' &&
      result.authorityBinding.authority.kind === 'dbt-project-files'
    ) {
      const projectRoot = result.authorityBinding.authority.projectRoot;
      if (result.outcome.projectRevision.projectRoot !== projectRoot) {
        context.addIssue({
          code: 'custom',
          message: 'Authority and refreshed project roots must match.',
          path: ['outcome', 'projectRevision', 'projectRoot'],
        });
      }

      if (
        projectRoot !== '.' &&
        result.yamlFiles.some((filePath) => !filePath.startsWith(`${projectRoot}/`))
      ) {
        context.addIssue({
          code: 'custom',
          message: 'File-backed Source Import YAML must remain inside the bound project root.',
          path: ['yamlFiles'],
        });
      }
    }
  });

export type ImportSourceObjectsRequestV2 = z.infer<typeof ImportSourceObjectsRequestV2Schema>;
export type ImportSourceObjectsResultV2 = z.infer<typeof ImportSourceObjectsResultV2Schema>;
