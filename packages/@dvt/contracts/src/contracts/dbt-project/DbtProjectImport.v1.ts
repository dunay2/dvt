/**
 * Owned concern: version validation and explicit import of one existing dbt
 * project into file-backed Canvas authority.
 *
 * @baseline ADR-0060: dbt Project Authoring Authority
 * @decision Validation is read-only; import requires its content-addressed receipt and an unbound Canvas.
 * @consequence A client cannot silently overwrite graph authority or report an uninspected project as imported.
 * @version 1.0.0
 */
import { z } from 'zod';

import {
  isIsoUtcString,
  isSha256HexString,
  SHA256_HEX_STRING_MESSAGE,
  STRICT_ISO_UTC_STRING_MESSAGE,
} from '../../utils/contractPrimitives.js';
import {
  CanvasAuthoringAuthorityBindingSchema,
  WorkspaceRelativeProjectRootSchema,
} from '../planner/CanvasAuthoringAuthorityBinding.v1.js';
import { DbtProjectRevisionSchema } from '../planner/DbtProjectGraphProjection.v1.js';

export const DBT_PROJECT_IMPORT_FILE_CLASSIFICATION = [
  'project-config',
  'resource-sql',
  'resource-yaml',
  'seed-data',
  'documentation',
  'dependency-config',
  'runtime-artifact',
  'secret-material',
  'unsupported',
  'binary',
] as const;

export const DBT_PROJECT_IMPORT_DIAGNOSTIC_CODE = [
  'dbt_project_not_found',
  'dbt_project_root_invalid',
  'dbt_project_path_unsafe',
  'dbt_project_symlink_unsupported',
  'dbt_project_file_unsupported',
  'dbt_project_binary_file',
  'dbt_project_secret_material',
  'dbt_project_limits_exceeded',
  'dbt_project_invalid',
  'dbt_project_analysis_failed',
  'dbt_adapter_unavailable',
] as const;

const NonBlankStringSchema = z.string().trim().min(1);
const NonNegativeSafeIntegerSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const PositiveSafeIntegerSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const Sha256HexStringSchema = NonBlankStringSchema.refine(isSha256HexString, {
  message: SHA256_HEX_STRING_MESSAGE,
});
const IsoUtcStringSchema = NonBlankStringSchema.refine(isIsoUtcString, {
  message: STRICT_ISO_UTC_STRING_MESSAGE,
});
const WorkspaceRelativeFilePathSchema = WorkspaceRelativeProjectRootSchema.refine(
  (value) => value !== '.',
  'Expected a workspace-relative file path.'
);

export const DbtProjectSourceTableDeclarationSchema = z
  .object({
    uniqueId: NonBlankStringSchema,
    filePath: WorkspaceRelativeFilePathSchema,
    sourceName: NonBlankStringSchema,
    tableName: NonBlankStringSchema,
    database: NonBlankStringSchema.optional(),
    schema: NonBlankStringSchema.optional(),
    identifier: NonBlankStringSchema.optional(),
  })
  .strict();

const DbtProjectSourceTableDeclarationListSchema = z
  .array(DbtProjectSourceTableDeclarationSchema)
  .superRefine((declarations, context) => {
    const uniqueIds = new Set<string>();
    declarations.forEach((declaration, index) => {
      if (uniqueIds.has(declaration.uniqueId)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate dbt source table declaration: ${declaration.uniqueId}`,
          path: [index, 'uniqueId'],
        });
      }
      uniqueIds.add(declaration.uniqueId);
      if (index > 0 && declarations[index - 1]!.uniqueId.localeCompare(declaration.uniqueId) > 0) {
        context.addIssue({
          code: 'custom',
          message: 'dbt source table declarations must be ordered by unique ID.',
          path: [index, 'uniqueId'],
        });
      }
    });
  });

const IncludedProjectFileSchema = z
  .object({
    path: WorkspaceRelativeFilePathSchema,
    classification: z.enum(DBT_PROJECT_IMPORT_FILE_CLASSIFICATION),
    byteSize: NonNegativeSafeIntegerSchema,
    decision: z.literal('included'),
  })
  .strict();

const ExcludedProjectFileSchema = z
  .object({
    path: WorkspaceRelativeFilePathSchema,
    classification: z.enum(DBT_PROJECT_IMPORT_FILE_CLASSIFICATION),
    byteSize: NonNegativeSafeIntegerSchema,
    decision: z.enum(['excluded-runtime-artifact', 'rejected']),
    reason: NonBlankStringSchema,
  })
  .strict();

export const DbtProjectImportFileSchema = z.discriminatedUnion('decision', [
  IncludedProjectFileSchema,
  ExcludedProjectFileSchema,
]);

export const DbtProjectImportInventorySchema = z
  .object({
    fileCount: NonNegativeSafeIntegerSchema,
    totalBytes: NonNegativeSafeIntegerSchema,
    includedFileCount: NonNegativeSafeIntegerSchema,
    excludedFileCount: NonNegativeSafeIntegerSchema,
    files: z.array(DbtProjectImportFileSchema),
  })
  .strict()
  .superRefine((inventory, context) => {
    const uniquePaths = new Set<string>();
    inventory.files.forEach((file, index) => {
      if (uniquePaths.has(file.path)) {
        context.addIssue({
          code: 'custom',
          message: 'Project inventory paths must be unique.',
          path: ['files', index, 'path'],
        });
      }
      uniquePaths.add(file.path);
    });

    const includedFileCount = inventory.files.filter((file) => file.decision === 'included').length;
    const totalBytes = inventory.files.reduce((sum, file) => sum + file.byteSize, 0);
    const expected = {
      fileCount: inventory.files.length,
      totalBytes,
      includedFileCount,
      excludedFileCount: inventory.files.length - includedFileCount,
    };

    (Object.keys(expected) as Array<keyof typeof expected>).forEach((field) => {
      if (inventory[field] !== expected[field]) {
        context.addIssue({
          code: 'custom',
          message: `${field} must match the file inventory.`,
          path: [field],
        });
      }
    });
  });

export const DbtProjectImportDiagnosticSchema = z
  .object({
    code: z.enum(DBT_PROJECT_IMPORT_DIAGNOSTIC_CODE),
    severity: z.enum(['info', 'warning', 'error']),
    message: NonBlankStringSchema,
    path: WorkspaceRelativeFilePathSchema.optional(),
    line: PositiveSafeIntegerSchema.optional(),
    column: PositiveSafeIntegerSchema.optional(),
  })
  .strict();

export const DbtProjectImportValidationReceiptSchema = z
  .object({
    schemaVersion: z.literal('dbt-project-import-validation-receipt.v1'),
    projectRoot: WorkspaceRelativeProjectRootSchema,
    contentSetSha256: Sha256HexStringSchema,
    analysisSha256: Sha256HexStringSchema,
    validationSha256: Sha256HexStringSchema,
    policyVersion: z.literal('dbt-project-import-policy.v1'),
    validatedAt: IsoUtcStringSchema,
  })
  .strict();

export const ValidateDbtProjectImportRequestSchema = z
  .object({
    schemaVersion: z.literal('validate-dbt-project-import-request.v1'),
    projectRoot: WorkspaceRelativeProjectRootSchema,
  })
  .strict();

const AcceptedDbtProjectImportValidationReportSchema = z
  .object({
    schemaVersion: z.literal('dbt-project-import-validation-report.v1'),
    status: z.literal('accepted'),
    projectRoot: WorkspaceRelativeProjectRootSchema,
    projectName: NonBlankStringSchema,
    adapterType: NonBlankStringSchema.optional(),
    inventory: DbtProjectImportInventorySchema,
    diagnostics: z.array(DbtProjectImportDiagnosticSchema),
    sourceTableDeclarations: DbtProjectSourceTableDeclarationListSchema,
    receipt: DbtProjectImportValidationReceiptSchema,
  })
  .strict();

const RejectedDbtProjectImportValidationReportSchema = z
  .object({
    schemaVersion: z.literal('dbt-project-import-validation-report.v1'),
    status: z.literal('rejected'),
    projectRoot: WorkspaceRelativeProjectRootSchema,
    projectName: NonBlankStringSchema.optional(),
    adapterType: NonBlankStringSchema.optional(),
    inventory: DbtProjectImportInventorySchema,
    diagnostics: z.array(DbtProjectImportDiagnosticSchema).min(1),
  })
  .strict();

export const DbtProjectImportValidationReportSchema = z
  .discriminatedUnion('status', [
    AcceptedDbtProjectImportValidationReportSchema,
    RejectedDbtProjectImportValidationReportSchema,
  ])
  .superRefine((report, context) => {
    if (report.status === 'accepted') {
      if (report.receipt.projectRoot !== report.projectRoot) {
        context.addIssue({
          code: 'custom',
          message: 'Validation receipt and report project roots must match.',
          path: ['receipt', 'projectRoot'],
        });
      }
      if (report.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
        context.addIssue({
          code: 'custom',
          message: 'An accepted validation report cannot contain errors.',
          path: ['diagnostics'],
        });
      }
      return;
    }

    if (!report.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
      context.addIssue({
        code: 'custom',
        message: 'A rejected validation report requires an error diagnostic.',
        path: ['diagnostics'],
      });
    }
  });

export const DbtProjectImportCommandSchema = z
  .object({
    schemaVersion: z.literal('import-dbt-project-command.v1'),
    canvasId: NonBlankStringSchema,
    conflictPolicy: z.literal('require-unbound-canvas'),
    idempotencyKey: NonBlankStringSchema,
    validationReceipt: DbtProjectImportValidationReceiptSchema,
  })
  .strict();

export const DbtProjectImportResultSchema = z
  .object({
    schemaVersion: z.literal('dbt-project-import-result.v1'),
    success: z.literal(true),
    idempotencyKey: NonBlankStringSchema,
    authorityBinding: CanvasAuthoringAuthorityBindingSchema,
    projectRevision: DbtProjectRevisionSchema,
    analysisSha256: Sha256HexStringSchema,
    projectedResourceCount: NonNegativeSafeIntegerSchema,
    importedAt: IsoUtcStringSchema,
  })
  .strict()
  .superRefine((result, context) => {
    if (result.authorityBinding.authority.kind !== 'dbt-project-files') {
      context.addIssue({
        code: 'custom',
        message: 'A dbt project import result requires file-backed authority.',
        path: ['authorityBinding', 'authority'],
      });
      return;
    }

    if (result.authorityBinding.authority.projectRoot !== result.projectRevision.projectRoot) {
      context.addIssue({
        code: 'custom',
        message: 'Authority and imported project roots must match.',
        path: ['projectRevision', 'projectRoot'],
      });
    }
  });

export type DbtProjectImportFileClassification =
  (typeof DBT_PROJECT_IMPORT_FILE_CLASSIFICATION)[number];
export type DbtProjectImportDiagnosticCode = (typeof DBT_PROJECT_IMPORT_DIAGNOSTIC_CODE)[number];
export type DbtProjectImportFile = z.infer<typeof DbtProjectImportFileSchema>;
export type DbtProjectImportInventory = z.infer<typeof DbtProjectImportInventorySchema>;
export type DbtProjectImportDiagnostic = z.infer<typeof DbtProjectImportDiagnosticSchema>;
export type DbtProjectSourceTableDeclaration = z.infer<
  typeof DbtProjectSourceTableDeclarationSchema
>;
export type DbtProjectImportValidationReceipt = z.infer<
  typeof DbtProjectImportValidationReceiptSchema
>;
export type ValidateDbtProjectImportRequest = z.infer<typeof ValidateDbtProjectImportRequestSchema>;
export type DbtProjectImportValidationReport = z.infer<
  typeof DbtProjectImportValidationReportSchema
>;
export type DbtProjectImportCommand = z.infer<typeof DbtProjectImportCommandSchema>;
export type DbtProjectImportResult = z.infer<typeof DbtProjectImportResultSchema>;
