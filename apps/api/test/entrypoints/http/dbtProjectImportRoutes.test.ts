import type { DbtProjectImportCommand, DbtProjectImportValidationReport } from '@dvt/contracts';
import {
  DbtProjectImportCommandSchema,
  DbtProjectImportValidationReportSchema,
} from '@dvt/contracts';
import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import {
  DbtProjectImportAuthorityConflictError,
  DbtProjectImportCanvasOccupiedError,
  DbtProjectImportIdempotencyMismatchError,
  DbtProjectImportProjectionError,
  DbtProjectImportRejectedError,
  DbtProjectImportStaleReceiptError,
} from '../../../src/application/ports/dbtProjectImport.js';
import { registerDbtProjectImportRoutes } from '../../../src/entrypoints/http/dbtProjectImportRoutes.js';

const SCOPE_QUERY = 'tenantId=tenant-a&projectId=project-a&environmentId=env-a';
const SCOPE = { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' };

describe('dbtProjectImportRoutes', () => {
  it('validates an existing project with file-read authority', async () => {
    const validate = vi.fn().mockResolvedValue(validationReport());
    const { app, authorize } = buildApp({ validate });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/import/validate?${SCOPE_QUERY}`,
      payload: {
        schemaVersion: 'validate-dbt-project-import-request.v1',
        projectRoot: 'analytics',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(validate).toHaveBeenCalledWith(SCOPE, {
      schemaVersion: 'validate-dbt-project-import-request.v1',
      projectRoot: 'analytics',
    });
    expect(authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: { kind: 'query', name: 'workspace:files:view' } }),
      expect.any(String)
    );
  });

  it('imports only a contract-valid command with file-save authority', async () => {
    const command = importCommand();
    const executeImport = vi.fn().mockResolvedValue({ success: true });
    const { app, authorize } = buildApp({ executeImport });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/import?${SCOPE_QUERY}`,
      payload: command,
    });

    expect(response.statusCode).toBe(200);
    expect(executeImport).toHaveBeenCalledWith(SCOPE, command);
    expect(authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: { kind: 'command', name: 'workspace:files:save' } }),
      expect.any(String)
    );
  });

  it.each([
    ['validation', '/workspace/dbt/import/validate', { projectRoot: '../outside' }],
    ['import', '/workspace/dbt/import', { canvasId: 'orders' }],
  ])(
    'rejects malformed %s input before invoking application services',
    async (_label, path, body) => {
      const validate = vi.fn();
      const executeImport = vi.fn();
      const { app } = buildApp({ validate, executeImport });

      const response = await app.inject({
        method: 'POST',
        url: `${path}?${SCOPE_QUERY}`,
        payload: body,
      });

      expect(response.statusCode).toBe(400);
      expect(validate).not.toHaveBeenCalled();
      expect(executeImport).not.toHaveBeenCalled();
    }
  );

  it('fails closed before validation when file-read authority is denied', async () => {
    const validate = vi.fn();
    const { app } = buildApp({ validate, authorized: false });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/import/validate?${SCOPE_QUERY}`,
      payload: {
        schemaVersion: 'validate-dbt-project-import-request.v1',
        projectRoot: 'analytics',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(validate).not.toHaveBeenCalled();
  });

  it.each([
    [new DbtProjectImportRejectedError(), 422, 'dbt_project_import_rejected'],
    [new DbtProjectImportStaleReceiptError(), 409, 'dbt_project_import_stale_receipt'],
    [new DbtProjectImportCanvasOccupiedError(), 409, 'dbt_project_import_canvas_occupied'],
    [new DbtProjectImportAuthorityConflictError(), 409, 'dbt_project_import_authority_conflict'],
    [
      new DbtProjectImportIdempotencyMismatchError(),
      409,
      'dbt_project_import_idempotency_mismatch',
    ],
    [new DbtProjectImportProjectionError(), 422, 'dbt_project_import_projection_failed'],
  ])('maps %s to a stable HTTP conflict', async (error, status, reason) => {
    const { app } = buildApp({ executeImport: vi.fn().mockRejectedValue(error) });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/import?${SCOPE_QUERY}`,
      payload: importCommand(),
    });

    expect(response.statusCode).toBe(status);
    expect(response.json()).toEqual({
      error: {
        type: status === 409 ? 'conflict' : 'unprocessable_entity',
        reason,
      },
    });
  });
});

function buildApp(
  input: {
    readonly validate?: ReturnType<typeof vi.fn>;
    readonly executeImport?: ReturnType<typeof vi.fn>;
    readonly authorized?: boolean;
  } = {}
): {
  readonly app: ReturnType<typeof Fastify>;
  readonly authorize: ReturnType<typeof vi.fn>;
} {
  const app = Fastify({ logger: false });
  const authorize = vi.fn().mockImplementation((_principal, requestedScope) =>
    input.authorized === false
      ? { ok: false, reason: 'ACTION_NOT_GRANTED' }
      : {
          ok: true,
          context: {
            principal: principal(),
            scope: { resource: 'environment', tenantId: { value: 'tenant-a' } },
            action: requestedScope.action,
            requestId: 'req-1',
            authorizedAt: new Date('2026-07-14T00:00:00Z'),
          },
        }
  );
  registerDbtProjectImportRoutes(app, {
    authenticator: {
      authenticateBearerToken: vi.fn().mockResolvedValue({ ok: true, principal: principal() }),
    } as never,
    authorizer: { authorize } as never,
    validateUseCase: { execute: input.validate ?? vi.fn() } as never,
    importUseCase: { execute: input.executeImport ?? vi.fn() } as never,
    rateLimit: { max: 100, timeWindow: 60_000 },
  });
  return { app, authorize };
}

function validationReport(): DbtProjectImportValidationReport {
  return DbtProjectImportValidationReportSchema.parse({
    schemaVersion: 'dbt-project-import-validation-report.v1',
    status: 'accepted',
    projectRoot: 'analytics',
    projectName: 'analytics',
    inventory: {
      fileCount: 1,
      totalBytes: 10,
      includedFileCount: 1,
      excludedFileCount: 0,
      files: [
        {
          path: 'analytics/dbt_project.yml',
          classification: 'project-config',
          byteSize: 10,
          decision: 'included',
        },
      ],
    },
    diagnostics: [],
    receipt: importCommand().validationReceipt,
  });
}

function importCommand(): DbtProjectImportCommand {
  return DbtProjectImportCommandSchema.parse({
    schemaVersion: 'import-dbt-project-command.v1',
    canvasId: 'orders-canvas',
    conflictPolicy: 'require-unbound-canvas',
    idempotencyKey: 'import-orders',
    validationReceipt: {
      schemaVersion: 'dbt-project-import-validation-receipt.v1',
      projectRoot: 'analytics',
      contentSetSha256: 'a'.repeat(64),
      analysisSha256: 'b'.repeat(64),
      validationSha256: 'c'.repeat(64),
      policyVersion: 'dbt-project-import-policy.v1',
      validatedAt: '2026-07-14T00:00:00.000Z',
    },
  });
}

function principal(): Record<string, unknown> {
  return {
    principalId: 'user-1',
    subjectId: 'user-1',
    issuer: 'issuer',
    audience: 'audience',
    principalType: 'user',
    expiresAt: new Date('2030-01-01T00:00:00Z'),
    rawScopes: [],
    assertedTenantIds: ['tenant-a'],
    assertedProjectIds: ['project-a'],
  };
}
