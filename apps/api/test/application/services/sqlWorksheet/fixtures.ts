/** Shared real contract facts and isolated authorization inputs for SQL worksheet proofs. */
import { URLSearchParams } from 'node:url';

import {
  ExecuteWorkspaceSqlResponseSchema,
  WorkspaceSqlExecutionSchema,
  type WorkspaceSqlExecution,
  type ExecuteWorkspaceSqlResponse,
} from '@dvt/contracts';

import example from '../../../../../../packages/@dvt/contracts/src/contracts/sql-workspace/examples/WorkspaceSqlExecution.example.json' with { type: 'json' };
import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
  type AuthorizationAction,
} from '../../../../src/application/ports/accessDecision.js';
import type { AuthorizedExecutionContext } from '../../../../src/application/ports/auth.js';
import type { PrincipalGrantSnapshot } from '../../../../src/application/ports/principalGrantRepository.js';
import type { WarehouseConnectionCatalogEntry } from '../../../../src/application/ports/warehouseSourceImport.js';
import {
  EnvironmentId,
  ProjectId,
  TenantId,
  type AuthenticatedPrincipal,
} from '../../../../src/domain/auth/types.js';

export const SQL_SCOPE = { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' };
export const SQL_SCOPE_QUERY = new URLSearchParams(SQL_SCOPE).toString();
export const SQL_PRINCIPAL: AuthenticatedPrincipal = {
  principalId: 'editor',
  principalType: 'user',
  subjectId: 'sql-editor',
  issuer: 'https://issuer.test/',
  audience: 'dvt-api',
  expiresAt: new Date('2030-01-01T00:00:00Z'),
  rawScopes: ['workspace:sql:execute', 'workspace:sql-history:view'],
  assertedTenantIds: ['tenant'],
  assertedProjectIds: ['project'],
};
export const SQL_CONNECTION: WarehouseConnectionCatalogEntry = {
  id: 'warehouse',
  name: 'Analytics',
  type: 'postgres',
  database: 'analytics',
  credentialRef: 'postgres:warehouse',
  sourceObjects: [],
};

export function workspaceSqlExecution(
  overrides: Partial<WorkspaceSqlExecution> = {}
): WorkspaceSqlExecution {
  return WorkspaceSqlExecutionSchema.parse({ ...example, ...overrides });
}

export function workspaceSqlResponse(): ExecuteWorkspaceSqlResponse {
  const execution = workspaceSqlExecution();
  return ExecuteWorkspaceSqlResponseSchema.parse({
    schemaVersion: 'workspace-sql-execution-response.v1',
    execution,
    result: { columns: execution.columns, rows: [{ values: ['1'] }] },
  });
}

export function sqlContext(
  action: AuthorizationAction = AUTHORIZATION_ACTION.workspaceSqlExecute
): AuthorizedExecutionContext {
  return {
    principal: SQL_PRINCIPAL,
    scope: buildEnvironmentAccessScope(
      TenantId.unsafe(SQL_SCOPE.tenantId),
      ProjectId.unsafe(SQL_SCOPE.projectId),
      EnvironmentId.unsafe(SQL_SCOPE.environmentId)
    ),
    action,
    requestId: 'sql-request',
    authorizedAt: new Date(example.startedAt),
  };
}

export function sqlGrantSnapshot(allowedActions: readonly string[]): PrincipalGrantSnapshot {
  return {
    principal: SQL_PRINCIPAL,
    suspended: false,
    tenantAccess: [
      {
        tenantId: SQL_SCOPE.tenantId,
        allowedActions: [],
        projectAccess: [
          {
            projectId: SQL_SCOPE.projectId,
            allowedActions: [],
            environmentAccess: [{ environmentId: SQL_SCOPE.environmentId, allowedActions }],
          },
        ],
      },
    ],
  };
}
