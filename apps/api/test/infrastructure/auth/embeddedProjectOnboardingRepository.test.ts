import { describe, expect, it, vi } from 'vitest';

import {
  PROJECT_ONBOARDING_CREATE_SCOPE,
  PROJECT_ONBOARDING_DEFAULT_ENVIRONMENT_ID,
} from '../../../src/application/ports/projectOnboarding.js';
import { EmbeddedProjectOnboardingRepository } from '../../../src/infrastructure/auth/embeddedProjectOnboardingRepository.js';

describe('EmbeddedProjectOnboardingRepository', () => {
  it('grants workspace read actions to newly onboarded projects', async () => {
    let savedTenantAccess: unknown;
    const client = {
      release: vi.fn(),
      query: vi.fn(async (sql: string, params?: readonly unknown[]) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return { rows: [] };
        }
        if (sql.includes('FROM "dvt".project_creation_idempotency')) {
          return { rows: [] };
        }
        if (sql.includes('FROM "dvt".principal_grants')) {
          return {
            rows: [
              {
                principal_id: 'user-1',
                principal_type: 'user',
                suspended: false,
                tenant_access: [
                  {
                    tenantId: 'tenant-a',
                    allowedActions: [PROJECT_ONBOARDING_CREATE_SCOPE],
                    projectAccess: [],
                  },
                ],
              },
            ],
          };
        }
        if (sql.includes('FROM "dvt".projects')) {
          return { rows: [] };
        }
        if (sql.includes('INSERT INTO "dvt".projects')) {
          return { rows: [] };
        }
        if (sql.includes('UPDATE "dvt".principal_grants')) {
          savedTenantAccess = JSON.parse(String(params?.[2]));
          return { rows: [] };
        }
        if (sql.includes('INSERT INTO "dvt".project_creation_idempotency')) {
          return { rows: [] };
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      }),
    };
    const repository = new EmbeddedProjectOnboardingRepository({
      connect: vi.fn(async () => client as never),
      query: vi.fn(),
    });

    const outcome = await repository.createProject(
      {
        principalId: 'user-1',
        principalType: 'user',
        subjectId: 'user-1',
        issuer: 'issuer',
        audience: 'audience',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        rawScopes: [],
        assertedTenantIds: ['tenant-a'],
        assertedProjectIds: [],
      },
      { tenantId: 'tenant-a', name: 'Analytics', idempotencyKey: 'request-1' }
    );

    expect(outcome.kind).toBe('created');
    expect(savedTenantAccess).toEqual([
      {
        tenantId: 'tenant-a',
        allowedActions: [PROJECT_ONBOARDING_CREATE_SCOPE],
        projectAccess: [
          expect.objectContaining({
            allowedActions: expect.arrayContaining([
              'workspace:source-import:view',
              'workspace:source-import:import',
              'workspace:plugins:view',
            ]),
            environmentAccess: [
              expect.objectContaining({
                environmentId: PROJECT_ONBOARDING_DEFAULT_ENVIRONMENT_ID,
                allowedActions: expect.arrayContaining([
                  'workspace:source-import:view',
                  'workspace:source-import:import',
                  'workspace:plugins:view',
                ]),
              }),
            ],
          }),
        ],
      },
    ]);
  });
});
