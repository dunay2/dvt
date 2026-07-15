import {
  DbtProjectImportResultSchema,
  DbtProjectImportValidationReportSchema,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { buildDbtProjectImportPresentationModel } from './dbtProjectImportPresentationModel';

const ACCEPTED_REPORT = DbtProjectImportValidationReportSchema.parse({
  schemaVersion: 'dbt-project-import-validation-report.v1',
  status: 'accepted',
  projectRoot: 'analytics',
  projectName: 'warehouse_analytics',
  adapterType: 'postgres',
  inventory: {
    fileCount: 2,
    totalBytes: 2304,
    includedFileCount: 1,
    excludedFileCount: 1,
    files: [
      {
        path: 'analytics/dbt_project.yml',
        classification: 'project-config',
        byteSize: 256,
        decision: 'included',
      },
      {
        path: 'analytics/target/manifest.json',
        classification: 'runtime-artifact',
        byteSize: 2048,
        decision: 'excluded-runtime-artifact',
        reason: 'Generated runtime artifact.',
      },
    ],
  },
  diagnostics: [
    {
      code: 'dbt_adapter_unavailable',
      severity: 'warning',
      message: 'The adapter is not available for execution yet.',
    },
  ],
  receipt: {
    schemaVersion: 'dbt-project-import-validation-receipt.v1',
    projectRoot: 'analytics',
    contentSetSha256: '1'.repeat(64),
    analysisSha256: '2'.repeat(64),
    validationSha256: '3'.repeat(64),
    policyVersion: 'dbt-project-import-policy.v1',
    validatedAt: '2026-07-15T10:00:00.000Z',
  },
});

const IMPORT_RESULT = DbtProjectImportResultSchema.parse({
  schemaVersion: 'dbt-project-import-result.v1',
  success: true,
  idempotencyKey: 'dbt-project-import:warehouse-analytics:1',
  authorityBinding: {
    schemaVersion: 'canvas-authoring-authority-binding.v1',
    canvasId: 'warehouse-analytics',
    authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
  },
  projectRevision: {
    projectRoot: 'analytics',
    contentSetSha256: '1'.repeat(64),
    analyzedAt: '2026-07-15T10:00:01.000Z',
    analyzerVersion: 'dbt-cli-v1',
  },
  analysisSha256: '2'.repeat(64),
  projectedResourceCount: 12,
  importedAt: '2026-07-15T10:00:02.000Z',
});

describe('dbt project import presentation model', () => {
  it('blocks validation and import until the required identity is present', () => {
    const model = buildDbtProjectImportPresentationModel({
      phase: 'idle',
      projectRoot: '',
      canvasId: '',
      report: null,
      result: null,
      failureMessage: null,
    });

    expect(model.canValidate).toBe(false);
    expect(model.canImport).toBe(false);
    expect(model.inventory).toBeNull();
    expect(model.status).toMatchObject({ label: 'Not validated', tone: 'neutral' });
  });

  it('presents accepted inventory, exclusions, diagnostics, and import readiness', () => {
    const model = buildDbtProjectImportPresentationModel({
      phase: 'accepted',
      projectRoot: 'analytics',
      canvasId: 'warehouse-analytics',
      report: ACCEPTED_REPORT,
      result: null,
      failureMessage: null,
    });

    expect(model.canValidate).toBe(true);
    expect(model.canImport).toBe(true);
    expect(model.status).toMatchObject({ label: 'Ready to import', tone: 'success' });
    expect(model.project).toEqual({
      name: 'warehouse_analytics',
      adapter: 'postgres',
    });
    expect(model.inventory).toMatchObject({
      fileCount: 2,
      includedFileCount: 1,
      excludedFileCount: 1,
      totalBytesLabel: '2.25 KiB',
    });
    expect(model.inventory?.files[1]).toMatchObject({
      path: 'analytics/target/manifest.json',
      decisionLabel: 'Excluded',
      reason: 'Generated runtime artifact.',
    });
    expect(model.diagnostics).toEqual([
      expect.objectContaining({
        severity: 'warning',
        message: 'The adapter is not available for execution yet.',
      }),
    ]);
  });

  it('keeps rejected and in-flight states non-importable', () => {
    const rejected = DbtProjectImportValidationReportSchema.parse({
      schemaVersion: 'dbt-project-import-validation-report.v1',
      status: 'rejected',
      projectRoot: ACCEPTED_REPORT.projectRoot,
      projectName: ACCEPTED_REPORT.projectName,
      adapterType: ACCEPTED_REPORT.adapterType,
      inventory: ACCEPTED_REPORT.inventory,
      diagnostics: [
        {
          code: 'dbt_project_invalid',
          severity: 'error',
          message: 'dbt_project.yml is invalid.',
          path: 'analytics/dbt_project.yml',
          line: 4,
        },
      ],
    });

    expect(
      buildDbtProjectImportPresentationModel({
        phase: 'rejected',
        projectRoot: 'analytics',
        canvasId: 'warehouse-analytics',
        report: rejected,
        result: null,
        failureMessage: null,
      }).canImport
    ).toBe(false);
    expect(
      buildDbtProjectImportPresentationModel({
        phase: 'importing',
        projectRoot: 'analytics',
        canvasId: 'warehouse-analytics',
        report: ACCEPTED_REPORT,
        result: null,
        failureMessage: null,
      }).canImport
    ).toBe(false);
  });

  it('allows an idempotent retry after an accepted import attempt fails', () => {
    const model = buildDbtProjectImportPresentationModel({
      phase: 'failed',
      projectRoot: 'analytics',
      canvasId: 'warehouse-analytics',
      report: ACCEPTED_REPORT,
      result: null,
      failureMessage: 'The API could not be reached.',
    });

    expect(model.canImport).toBe(true);
    expect(model.canValidate).toBe(true);
  });

  it('presents the server receipt instead of synthesizing import success', () => {
    const model = buildDbtProjectImportPresentationModel({
      phase: 'imported',
      projectRoot: 'analytics',
      canvasId: 'warehouse-analytics',
      report: ACCEPTED_REPORT,
      result: IMPORT_RESULT,
      failureMessage: null,
    });

    expect(model.status).toMatchObject({ label: 'Imported', tone: 'success' });
    expect(model.canValidate).toBe(false);
    expect(model.canImport).toBe(false);
    expect(model.receipt).toEqual({
      canvasId: 'warehouse-analytics',
      projectRoot: 'analytics',
      projectedResourceCount: 12,
      revision: '111111111111',
    });
  });
});
