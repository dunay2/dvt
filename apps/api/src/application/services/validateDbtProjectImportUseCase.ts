import { createHash } from 'node:crypto';

import {
  DbtProjectImportValidationReportSchema,
  type DbtProjectImportDiagnostic,
  type DbtProjectImportValidationReport,
  type ValidateDbtProjectImportRequest,
} from '@dvt/contracts';

import type { IDbtProjectAnalyzerPort } from '../ports/dbtProjectAnalysis.js';
import type { IDbtProjectImportInspectorPort } from '../ports/dbtProjectImport.js';
import type { WorkspaceStorageScope } from '../ports/workspaceFiles.js';

export class ValidateDbtProjectImportUseCase {
  public constructor(
    private readonly deps: {
      readonly inspector: IDbtProjectImportInspectorPort;
      readonly analyzer: IDbtProjectAnalyzerPort;
      readonly now: () => Date;
    }
  ) {}

  public async execute(
    scope: WorkspaceStorageScope,
    request: ValidateDbtProjectImportRequest
  ): Promise<DbtProjectImportValidationReport> {
    const inspection = await this.deps.inspector.inspect({
      scope,
      projectRoot: request.projectRoot,
    });
    if (inspection.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
      return DbtProjectImportValidationReportSchema.parse({
        schemaVersion: 'dbt-project-import-validation-report.v1',
        status: 'rejected',
        projectRoot: request.projectRoot,
        ...(inspection.projectName === undefined ? {} : { projectName: inspection.projectName }),
        ...(inspection.adapterType === undefined ? {} : { adapterType: inspection.adapterType }),
        inventory: inspection.inventory,
        diagnostics: inspection.diagnostics,
      });
    }

    const analysis = await this.deps.analyzer.analyze({ scope, projectRoot: request.projectRoot });
    if (
      analysis.status !== 'valid' ||
      analysis.projectRevision.projectRoot !== request.projectRoot
    ) {
      return DbtProjectImportValidationReportSchema.parse({
        schemaVersion: 'dbt-project-import-validation-report.v1',
        status: 'rejected',
        projectRoot: request.projectRoot,
        ...(inspection.projectName === undefined ? {} : { projectName: inspection.projectName }),
        ...(inspection.adapterType === undefined ? {} : { adapterType: inspection.adapterType }),
        inventory: inspection.inventory,
        diagnostics: [
          analysis.projectRevision.projectRoot !== request.projectRoot
            ? {
                code: 'dbt_project_analysis_failed',
                severity: 'error',
                message: 'The analyzer returned a revision for another project root.',
              }
            : analysisDiagnostic(analysis.status, analysis.diagnostics),
        ],
      });
    }

    const validatedAt = this.deps.now().toISOString();
    const validationSha256 = sha256({
      policyVersion: 'dbt-project-import-policy.v1',
      projectRoot: request.projectRoot,
      projectName: inspection.projectName,
      inventory: inspection.inventory,
      contentSetSha256: analysis.projectRevision.contentSetSha256,
      analysisSha256: analysis.analysisSha256,
    });
    return DbtProjectImportValidationReportSchema.parse({
      schemaVersion: 'dbt-project-import-validation-report.v1',
      status: 'accepted',
      projectRoot: request.projectRoot,
      projectName: inspection.projectName,
      ...(inspection.adapterType === undefined ? {} : { adapterType: inspection.adapterType }),
      inventory: inspection.inventory,
      diagnostics: inspection.diagnostics,
      receipt: {
        schemaVersion: 'dbt-project-import-validation-receipt.v1',
        projectRoot: request.projectRoot,
        contentSetSha256: analysis.projectRevision.contentSetSha256,
        analysisSha256: analysis.analysisSha256,
        validationSha256,
        policyVersion: 'dbt-project-import-policy.v1',
        validatedAt,
      },
    });
  }
}

function analysisDiagnostic(
  status: 'valid' | 'invalid' | 'unavailable',
  diagnostics: readonly { readonly code: string; readonly message: string }[]
): DbtProjectImportDiagnostic {
  const first = diagnostics[0];
  if (status === 'invalid') {
    return {
      code: 'dbt_project_invalid',
      severity: 'error',
      message: first?.message ?? 'dbt parse rejected the project.',
    };
  }
  const adapterUnavailable = first?.code.includes('analyzer') || first?.code.includes('profiles');
  return {
    code: adapterUnavailable ? 'dbt_adapter_unavailable' : 'dbt_project_analysis_failed',
    severity: 'error',
    message: first?.message ?? 'The dbt project could not be analyzed.',
  };
}

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
}
