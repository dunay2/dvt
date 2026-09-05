// @vitest-environment jsdom

import {
  DbtProjectImportResultSchema,
  DbtProjectImportValidationReportSchema,
  type DbtProjectImportCommand,
  type ValidateDbtProjectImportRequest,
} from '@dvt/contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApiDbtProjectImportPort } from './dbtProjectImport.api';
import type { ApiClient } from '../api/createApiClient';
import { createApiClientHarness, jsonResponse } from '../workspace/workspaceApiClient.test.harness';
import {
  buildWorkspaceScope,
  installWorkspaceScopeHarness,
  setWorkspaceScope,
} from '../workspace/workspaceScope.test.harness';

installWorkspaceScopeHarness();

const VALIDATE_REQUEST: ValidateDbtProjectImportRequest = {
  schemaVersion: 'validate-dbt-project-import-request.v1',
  projectRoot: 'analytics',
};

const VALIDATION_REPORT = DbtProjectImportValidationReportSchema.parse({
  schemaVersion: 'dbt-project-import-validation-report.v1',
  status: 'accepted',
  projectRoot: 'analytics',
  projectName: 'warehouse_analytics',
  adapterType: 'postgres',
  inventory: {
    fileCount: 1,
    totalBytes: 128,
    includedFileCount: 1,
    excludedFileCount: 0,
    files: [
      {
        path: 'analytics/dbt_project.yml',
        classification: 'project-config',
        byteSize: 128,
        decision: 'included',
      },
    ],
  },
  diagnostics: [],
  sourceTableDeclarations: [],
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

const IMPORT_COMMAND: DbtProjectImportCommand = {
  schemaVersion: 'import-dbt-project-command.v1',
  canvasId: 'warehouse-analytics',
  conflictPolicy: 'require-unbound-canvas',
  idempotencyKey: 'dbt-project-import:warehouse-analytics:1',
  validationReceipt:
    VALIDATION_REPORT.status === 'accepted'
      ? VALIDATION_REPORT.receipt
      : (() => {
          throw new Error('Expected accepted validation fixture.');
        })(),
};

const IMPORT_RESULT = DbtProjectImportResultSchema.parse({
  schemaVersion: 'dbt-project-import-result.v1',
  success: true,
  idempotencyKey: IMPORT_COMMAND.idempotencyKey,
  authorityBinding: {
    schemaVersion: 'canvas-authoring-authority-binding.v1',
    canvasId: IMPORT_COMMAND.canvasId,
    authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
  },
  projectRevision: {
    projectRoot: 'analytics',
    contentSetSha256: '1'.repeat(64),
    analyzedAt: '2026-07-15T10:00:01.000Z',
    analyzerVersion: 'dbt-cli-v1',
    dbtVersion: '1.9.0',
  },
  analysisSha256: '2'.repeat(64),
  projectedResourceCount: 8,
  importedAt: '2026-07-15T10:00:02.000Z',
});

describe('dbtProjectImport API port', () => {
  beforeEach(() => {
    setWorkspaceScope(buildWorkspaceScope());
  });

  it('executes validation and import through the protected scoped endpoints', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const responses = [VALIDATION_REPORT, IMPORT_RESULT];
    const postJsonImpl: ApiClient['postJson'] = async <TRequest, TResponse>() =>
      responses.shift() as TResponse;
    const { apiClient, postJson } = createApiClientHarness({
      postJson: postJsonImpl,
    });
    const port = createApiDbtProjectImportPort(apiClient);

    await expect(port.validateProject(VALIDATE_REQUEST)).resolves.toEqual(VALIDATION_REPORT);
    await expect(port.importProject(IMPORT_COMMAND)).resolves.toEqual(IMPORT_RESULT);

    const scopeQuery =
      `tenantId=${scope.tenantId}&projectId=${scope.projectId}` +
      `&environmentId=${scope.environmentId}`;
    expect(postJson).toHaveBeenNthCalledWith(
      1,
      `/workspace/dbt/import/validate?${scopeQuery}`,
      VALIDATE_REQUEST
    );
    expect(postJson).toHaveBeenNthCalledWith(
      2,
      `/workspace/dbt/import?${scopeQuery}`,
      IMPORT_COMMAND
    );
  });

  it('rejects malformed validation and import responses at the browser boundary', async () => {
    const postJsonImpl: ApiClient['postJson'] = async <TRequest, TResponse>() =>
      ({ success: true }) as TResponse;
    const { apiClient } = createApiClientHarness({
      postJson: postJsonImpl,
    });
    const port = createApiDbtProjectImportPort(apiClient);

    await expect(port.validateProject(VALIDATE_REQUEST)).rejects.toThrowError();
    await expect(port.importProject(IMPORT_COMMAND)).rejects.toThrowError();
  });
});
