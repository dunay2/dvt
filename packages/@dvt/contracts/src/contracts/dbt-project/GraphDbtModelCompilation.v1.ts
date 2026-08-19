/**
 * Owned concern: version the bounded request and native result for compiling
 * graph-authored DBT models without persisting a second compiled-code authority.
 *
 * @baseline ADR-0060: dbt Project Authoring Authority
 * @decision Compile only already-published Graph Draft artifacts through native DBT.
 * @consequence Compiled SQL is an ephemeral readiness read model, never graph state.
 * @version 1.0.0
 */
import { z } from 'zod';

import { CanvasAuthoringAuthorityBindingSchema } from '../planner/CanvasAuthoringAuthorityBinding.v1.js';
import { DbtProjectRevisionSchema } from '../planner/DbtProjectGraphProjection.v1.js';

const NonBlankStringSchema = z.string().trim().min(1);
const ModelSelectorSchema = NonBlankStringSchema.max(256).regex(/^[A-Za-z0-9_][A-Za-z0-9_.-]*$/u);

export const CompileGraphDbtModelsRequestSchema = z
  .object({
    canvasId: NonBlankStringSchema.max(256),
    selectors: z.array(ModelSelectorSchema).min(1).max(100),
  })
  .strict()
  .superRefine((request, context) => {
    if (new Set(request.selectors).size !== request.selectors.length) {
      context.addIssue({
        code: 'custom',
        message: 'Graph DBT model selectors must be unique.',
        path: ['selectors'],
      });
    }
  });

const GraphDbtCompilationDiagnosticSchema = z
  .object({
    code: NonBlankStringSchema.max(256),
    message: NonBlankStringSchema.max(4_096),
  })
  .strict();

const GraphDbtCompiledModelSchema = z
  .object({
    selector: ModelSelectorSchema,
    uniqueId: NonBlankStringSchema.max(512),
    compiledSql: NonBlankStringSchema.max(1_000_000),
  })
  .strict();

const GraphDbtModelCompilationCompiledSchema = z
  .object({
    schemaVersion: z.literal('graph-dbt-model-compilation.v1'),
    kind: z.literal('compiled'),
    canvasId: NonBlankStringSchema.max(256),
    authorityBinding: CanvasAuthoringAuthorityBindingSchema,
    projectRevision: DbtProjectRevisionSchema,
    analysisSha256: NonBlankStringSchema.regex(/^[a-f0-9]{64}$/u),
    models: z.array(GraphDbtCompiledModelSchema).min(1).max(100),
  })
  .strict()
  .superRefine((result, context) => {
    if (result.authorityBinding.authority.kind !== 'graph-draft') {
      context.addIssue({
        code: 'custom',
        message: 'Graph DBT compilation requires Graph Draft authority.',
        path: ['authorityBinding', 'authority'],
      });
    }
    const selectors = result.models.map((model) => model.selector);
    if (
      new Set(selectors).size !== selectors.length ||
      selectors.some((selector, index) => index > 0 && selectors[index - 1]! > selector)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Compiled graph DBT models must be unique and sorted by selector.',
        path: ['models'],
      });
    }
  });

const GraphDbtModelCompilationFailureSchema = z
  .object({
    schemaVersion: z.literal('graph-dbt-model-compilation.v1'),
    kind: z.enum(['invalid', 'unavailable']),
    canvasId: NonBlankStringSchema.max(256),
    diagnostics: z.array(GraphDbtCompilationDiagnosticSchema).min(1).max(100),
  })
  .strict();

const GraphDbtModelCompilationAuthorityRefusedSchema = z
  .object({
    schemaVersion: z.literal('graph-dbt-model-compilation.v1'),
    kind: z.literal('authority_refused'),
    canvasId: NonBlankStringSchema.max(256),
    reason: z.enum(['missing_authority', 'mixed_authority', 'dbt_project_files_authority']),
  })
  .strict();

export const GraphDbtModelCompilationResultSchema = z.union([
  GraphDbtModelCompilationCompiledSchema,
  GraphDbtModelCompilationFailureSchema,
  GraphDbtModelCompilationAuthorityRefusedSchema,
]);

export type CompileGraphDbtModelsRequest = z.infer<typeof CompileGraphDbtModelsRequestSchema>;
export type GraphDbtModelCompilationResult = z.infer<typeof GraphDbtModelCompilationResultSchema>;
