import { describe, expect, it } from 'vitest';

import {
  DbtProjectImportCommandSchema,
  DbtProjectImportResultSchema,
  DbtProjectImportValidationReportSchema,
  ValidateDbtProjectImportRequestSchema,
} from '../src/index.js';

const VALIDATION_RECEIPT = {
  schemaVersion: 'dbt-project-import-validation-receipt.v1',
  projectRoot: 'analytics/orders',
  contentSetSha256: 'a'.repeat(64),
  analysisSha256: 'b'.repeat(64),
  validationSha256: 'c'.repeat(64),
  policyVersion: 'dbt-project-import-policy.v1',
  validatedAt: '2026-07-14T10:00:00.000Z',
} as const;

const ACCEPTED_REPORT = {
  schemaVersion: 'dbt-project-import-validation-report.v1',
  status: 'accepted',
  projectRoot: 'analytics/orders',
  projectName: 'orders',
  adapterType: 'postgres',
  inventory: {
    fileCount: 3,
    totalBytes: 512,
    includedFileCount: 2,
    excludedFileCount: 1,
    files: [
      {
        path: 'dbt_project.yml',
        classification: 'project-config',
        byteSize: 128,
        decision: 'included',
      },
      {
        path: 'models/orders.sql',
        classification: 'resource-sql',
        byteSize: 256,
        decision: 'included',
      },
      {
        path: 'target/manifest.json',
        classification: 'runtime-artifact',
        byteSize: 128,
        decision: 'excluded-runtime-artifact',
        reason: 'Generated dbt runtime artifact.',
      },
    ],
  },
  diagnostics: [],
  sourceTableDeclarations: [
    {
      uniqueId: 'source.orders.raw.orders',
      filePath: 'models/sources.yml',
      sourceName: 'raw',
      tableName: 'orders',
      database: 'analytics',
      schema: 'raw',
      identifier: 'orders_v2',
    },
  ],
  receipt: VALIDATION_RECEIPT,
} as const;

describe('DbtProjectImport.v1', () => {
  it('accepts a normalized validation query and a complete accepted report', () => {
    expect(
      ValidateDbtProjectImportRequestSchema.parse({
        schemaVersion: 'validate-dbt-project-import-request.v1',
        projectRoot: 'analytics/orders',
      })
    ).toEqual({
      schemaVersion: 'validate-dbt-project-import-request.v1',
      projectRoot: 'analytics/orders',
    });
    expect(DbtProjectImportValidationReportSchema.parse(ACCEPTED_REPORT)).toEqual(ACCEPTED_REPORT);
  });

  it.each([
    '/analytics',
    '../analytics',
    'analytics/../other',
    'C:/analytics',
    'analytics\\orders',
  ])('rejects unsafe project root %s', (projectRoot) => {
    expect(
      ValidateDbtProjectImportRequestSchema.safeParse({
        schemaVersion: 'validate-dbt-project-import-request.v1',
        projectRoot,
      }).success
    ).toBe(false);
  });

  it('keeps accepted and rejected validation outcomes disjoint', () => {
    expect(
      DbtProjectImportValidationReportSchema.safeParse({
        ...ACCEPTED_REPORT,
        receipt: undefined,
      }).success
    ).toBe(false);

    expect(
      DbtProjectImportValidationReportSchema.safeParse({
        schemaVersion: 'dbt-project-import-validation-report.v1',
        status: 'rejected',
        projectRoot: 'analytics/orders',
        inventory: {
          fileCount: 1,
          totalBytes: 64,
          includedFileCount: 0,
          excludedFileCount: 1,
          files: [
            {
              path: 'profiles.yml',
              classification: 'secret-material',
              byteSize: 64,
              decision: 'rejected',
              reason: 'profiles.yml is outside project import authority.',
            },
          ],
        },
        diagnostics: [
          {
            code: 'dbt_project_secret_material',
            severity: 'error',
            message: 'Project contains profiles.yml.',
            path: 'profiles.yml',
          },
        ],
        receipt: VALIDATION_RECEIPT,
      }).success
    ).toBe(false);
  });

  it('requires a deterministic inventory entry for every imported dbt source table', () => {
    expect(
      DbtProjectImportValidationReportSchema.parse(ACCEPTED_REPORT).sourceTableDeclarations
    ).toEqual([
      {
        uniqueId: 'source.orders.raw.orders',
        filePath: 'models/sources.yml',
        sourceName: 'raw',
        tableName: 'orders',
        database: 'analytics',
        schema: 'raw',
        identifier: 'orders_v2',
      },
    ]);
    expect(
      DbtProjectImportValidationReportSchema.safeParse({
        ...ACCEPTED_REPORT,
        sourceTableDeclarations: [
          ...ACCEPTED_REPORT.sourceTableDeclarations,
          ACCEPTED_REPORT.sourceTableDeclarations[0],
        ],
      }).success
    ).toBe(false);
    expect(
      DbtProjectImportValidationReportSchema.safeParse({
        ...ACCEPTED_REPORT,
        sourceTableDeclarations: [
          { ...ACCEPTED_REPORT.sourceTableDeclarations[0], filePath: '../sources.yml' },
        ],
      }).success
    ).toBe(false);
  });

  it('rejects dishonest inventory counters and non-file inventory paths', () => {
    expect(
      DbtProjectImportValidationReportSchema.safeParse({
        ...ACCEPTED_REPORT,
        inventory: { ...ACCEPTED_REPORT.inventory, totalBytes: 511 },
      }).success
    ).toBe(false);
    expect(
      DbtProjectImportValidationReportSchema.safeParse({
        ...ACCEPTED_REPORT,
        inventory: {
          fileCount: 1,
          totalBytes: 1,
          includedFileCount: 1,
          excludedFileCount: 0,
          files: [
            {
              path: '.',
              classification: 'project-config',
              byteSize: 1,
              decision: 'included',
            },
          ],
        },
      }).success
    ).toBe(false);
  });

  it('requires an accepted receipt, unbound-canvas policy, and idempotency key', () => {
    const command = {
      schemaVersion: 'import-dbt-project-command.v1',
      canvasId: 'canvas-orders',
      conflictPolicy: 'require-unbound-canvas',
      idempotencyKey: 'import-orders-20260714',
      validationReceipt: VALIDATION_RECEIPT,
    } as const;

    expect(DbtProjectImportCommandSchema.parse(command)).toEqual(command);
    expect(
      DbtProjectImportCommandSchema.safeParse({ ...command, conflictPolicy: 'overwrite' }).success
    ).toBe(false);
    expect(
      DbtProjectImportCommandSchema.safeParse({ ...command, idempotencyKey: '' }).success
    ).toBe(false);
  });

  it('accepts only a file-backed import receipt whose roots agree', () => {
    const result = {
      schemaVersion: 'dbt-project-import-result.v1',
      success: true,
      idempotencyKey: 'import-orders-20260714',
      authorityBinding: {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'canvas-orders',
        authority: { kind: 'dbt-project-files', projectRoot: 'analytics/orders' },
      },
      projectRevision: {
        projectRoot: 'analytics/orders',
        contentSetSha256: 'a'.repeat(64),
        analyzedAt: '2026-07-14T10:01:00.000Z',
        analyzerVersion: 'dvt-dbt-analyzer.v1',
      },
      analysisSha256: 'b'.repeat(64),
      projectedResourceCount: 12,
      importedAt: '2026-07-14T10:01:00.000Z',
    } as const;

    expect(DbtProjectImportResultSchema.parse(result)).toEqual(result);
    expect(
      DbtProjectImportResultSchema.safeParse({
        ...result,
        authorityBinding: {
          ...result.authorityBinding,
          authority: { kind: 'graph-draft' },
        },
      }).success
    ).toBe(false);
    expect(
      DbtProjectImportResultSchema.safeParse({
        ...result,
        projectRevision: { ...result.projectRevision, projectRoot: 'analytics/other' },
      }).success
    ).toBe(false);
  });
});
