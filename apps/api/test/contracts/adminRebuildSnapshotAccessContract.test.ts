import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RunNotFoundError } from '@dvt/engine';
import { Ajv2020 } from 'ajv/dist/2020.js';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { registerAdminRoutes } from '../../src/entrypoints/http/adminRoutes.js';
import {
  type RebuildSnapshot,
  type WorkflowSnapshotResult,
  makeWorkflowSnapshot,
} from '../fixtures/workflowSnapshotFixture.js';

type AdminRebuildSnapshotAccessContract = {
  readonly route: {
    readonly method: 'POST';
    readonly path: '/admin/runs/:runId/rebuild-snapshot';
  };
  readonly requiredAction: {
    readonly kind: 'command';
    readonly name: 'admin:rebuild-snapshot';
  };
  readonly adminActionPrefix: 'admin:';
  readonly pipeline: readonly [
    'parse_body.tenant_id',
    'validate_body.tenant_id',
    'authenticate_bearer_token',
    'authorize_execution_scope',
    'enforce_admin_action_prefix',
    'rebuild_snapshot',
  ];
  readonly responses: {
    readonly success: {
      readonly statusCode: 200;
      readonly body: {
        readonly runId: string;
        readonly status: WorkflowSnapshotResult['status'];
      };
    };
    readonly errors: readonly [
      {
        readonly statusCode: 400;
        readonly reason: 'invalid_body' | 'missing_tenant_id' | 'invalid_tenant_id';
      },
      {
        readonly statusCode: 401;
        readonly reason: 'missing_token' | 'invalid_token' | 'token_expired';
      },
      {
        readonly statusCode: 403;
        readonly reason:
          | 'principal_suspended'
          | 'tenant_not_granted'
          | 'project_not_granted'
          | 'environment_not_granted'
          | 'action_not_granted'
          | 'token_assertion_conflict';
      },
      {
        readonly statusCode: 404;
        readonly reason: 'run_not_found';
      },
      {
        readonly statusCode: 500;
        readonly reason: 'internal_error';
      },
    ];
  };
};

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../../../..');

function loadSchema(relativePath: string): object {
  return JSON.parse(readFileSync(join(REPO_ROOT, relativePath), 'utf8')) as object;
}

const ADMIN_REBUILD_SNAPSHOT_ACCESS_SCHEMA = loadSchema(
  'docs/contracts/shared/AdminRebuildSnapshotAccess.v1.schema.json'
);

const validateAdminRebuildSnapshotAccess = new Ajv2020({ strict: true, allErrors: true }).compile(
  ADMIN_REBUILD_SNAPSHOT_ACCESS_SCHEMA
);

const ADMIN_REBUILD_SNAPSHOT_ACCESS_CONTRACT: AdminRebuildSnapshotAccessContract = {
  route: {
    method: 'POST',
    path: '/admin/runs/:runId/rebuild-snapshot',
  },
  requiredAction: {
    kind: 'command',
    name: 'admin:rebuild-snapshot',
  },
  adminActionPrefix: 'admin:',
  pipeline: [
    'parse_body.tenant_id',
    'validate_body.tenant_id',
    'authenticate_bearer_token',
    'authorize_execution_scope',
    'enforce_admin_action_prefix',
    'rebuild_snapshot',
  ],
  responses: {
    success: {
      statusCode: 200,
      body: {
        runId: 'r-1',
        status: 'RUNNING',
      },
    },
    errors: [
      {
        statusCode: 400,
        reason: 'missing_tenant_id',
      },
      {
        statusCode: 401,
        reason: 'missing_token',
      },
      {
        statusCode: 403,
        reason: 'action_not_granted',
      },
      {
        statusCode: 404,
        reason: 'run_not_found',
      },
      {
        statusCode: 500,
        reason: 'internal_error',
      },
    ],
  },
};

function createApp(
  rebuildSnapshot: RebuildSnapshot,
  options?: {
    readonly authorize?: () => Promise<unknown>;
  }
): ReturnType<typeof Fastify> {
  const app = Fastify({ logger: false });
  const authorize =
    options?.authorize ??
    (async () => ({
      ok: true,
      context: {
        principal: {
          principalId: 'user-1',
          principalType: 'user',
        },
        scope: { tenantId: { value: 'tenant-a' } },
        action: { kind: 'command', name: 'admin:rebuild-snapshot' },
        requestId: 'req-1',
        authorizedAt: new Date('2026-04-03T00:00:00Z'),
      },
    }));
  registerAdminRoutes(
    app,
    { rebuildSnapshot },
    {
      authenticator: {
        authenticateBearerToken: async () => ({
          ok: true,
          principal: {
            principalId: 'user-1',
            subjectId: 'user-1',
            issuer: 'issuer',
            audience: 'audience',
            principalType: 'user',
            expiresAt: new Date('2030-01-01T00:00:00Z'),
            rawScopes: [],
            assertedTenantIds: ['tenant-a'],
            assertedProjectIds: [],
          },
        }),
      } as never,
      authorizer: {
        authorize,
      } as never,
    }
  );
  return app;
}

describe('AdminRebuildSnapshot access contract', () => {
  it('keeps the canonical access contract schema-valid', () => {
    const valid = validateAdminRebuildSnapshotAccess(ADMIN_REBUILD_SNAPSHOT_ACCESS_CONTRACT);

    expect(validateAdminRebuildSnapshotAccess.errors).toBeNull();
    expect(valid).toBe(true);
  });

  it('rejects a non-admin required action mutation against the schema', () => {
    const mutatedContract = {
      ...ADMIN_REBUILD_SNAPSHOT_ACCESS_CONTRACT,
      requiredAction: {
        kind: 'command',
        name: 'run:cancel',
      },
    };

    const valid = validateAdminRebuildSnapshotAccess(mutatedContract);

    expect(valid).toBe(false);
    expect(validateAdminRebuildSnapshotAccess.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instancePath: '/requiredAction/name',
          keyword: 'const',
        }),
      ])
    );
  });

  it('rejects pipeline order drift against the schema', () => {
    const mutatedContract = {
      ...ADMIN_REBUILD_SNAPSHOT_ACCESS_CONTRACT,
      pipeline: [
        'authenticate_bearer_token',
        'validate_body.tenant_id',
        'parse_body.tenant_id',
        'authorize_execution_scope',
        'enforce_admin_action_prefix',
        'rebuild_snapshot',
      ],
    };

    const valid = validateAdminRebuildSnapshotAccess(mutatedContract);

    expect(valid).toBe(false);
    expect(validateAdminRebuildSnapshotAccess.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instancePath: '/pipeline/0',
          keyword: 'const',
        }),
      ])
    );
  });

  it('accepts normalized non-action authorization denials in the 403 contract slot', () => {
    const mutatedContract = {
      ...ADMIN_REBUILD_SNAPSHOT_ACCESS_CONTRACT,
      responses: {
        ...ADMIN_REBUILD_SNAPSHOT_ACCESS_CONTRACT.responses,
        errors: [
          ADMIN_REBUILD_SNAPSHOT_ACCESS_CONTRACT.responses.errors[0],
          ADMIN_REBUILD_SNAPSHOT_ACCESS_CONTRACT.responses.errors[1],
          {
            statusCode: 403,
            reason: 'tenant_not_granted',
          },
          ADMIN_REBUILD_SNAPSHOT_ACCESS_CONTRACT.responses.errors[3],
          ADMIN_REBUILD_SNAPSHOT_ACCESS_CONTRACT.responses.errors[4],
        ],
      },
    };

    const valid = validateAdminRebuildSnapshotAccess(mutatedContract);

    expect(validateAdminRebuildSnapshotAccess.errors).toBeNull();
    expect(valid).toBe(true);
  });

  it('exposes the documented success envelope', async () => {
    const app = createApp(async (_tenantId, runId) => makeWorkflowSnapshot(runId, 'RUNNING'));

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r-1/rebuild-snapshot',
        payload: { tenantId: 'tenant-a' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        runId: 'r-1',
        status: 'RUNNING',
      });
    } finally {
      await app.close();
    }
  });

  it('exposes bad_request envelope when tenantId is missing', async () => {
    const app = createApp(async (_tenantId, runId) => makeWorkflowSnapshot(runId));

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r-2/rebuild-snapshot',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: {
          type: 'bad_request',
          reason: 'missing_tenant_id',
          target: 'tenantId',
        },
      });
    } finally {
      await app.close();
    }
  });

  it('exposes forbidden envelope for non-admin authorization', async () => {
    const app = createApp(async (_tenantId, runId) => makeWorkflowSnapshot(runId), {
      authorize: async () => ({ ok: false, reason: 'ACTION_NOT_GRANTED' }),
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r-2/rebuild-snapshot',
        payload: { tenantId: 'tenant-a' },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({
        error: {
          type: 'forbidden',
          reason: 'action_not_granted',
        },
      });
    } finally {
      await app.close();
    }
  });

  it('exposes not_found envelope for missing run', async () => {
    const app = createApp(async (_tenantId, _runId) => {
      throw new RunNotFoundError('r-404');
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r-404/rebuild-snapshot',
        payload: { tenantId: 'tenant-a' },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: {
          type: 'not_found',
          reason: 'run_not_found',
          details: { runId: 'r-404' },
        },
      });
    } finally {
      await app.close();
    }
  });
});
