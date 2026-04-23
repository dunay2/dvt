import { parseExecutionSelection, parsePlanRef } from '@dvt/contracts';

import type {
  AuthorizedExecutionContext,
  AuthorizedCommandExecutionContext,
  DeniedReason,
  IAuthenticator,
} from '../../../src/application/ports/auth.js';
import type { IStartRunLatencyTelemetry } from '../../../src/application/ports/StartRunSlaTelemetry.js';
import type { IStartRunUseCase } from '../../../src/application/ports/startRunUseCasePort.js';
import { AuthorizeCommandScopeService } from '../../../src/application/services/authorizeCommandScopeService.js';
import { StartRunAuthorizedFacade } from '../../../src/application/services/startRunAuthorizedFacade.js';
import type {
  AuthenticatedPrincipal,
  AuthorizationAction,
  RequestedScope,
} from '../../../src/domain/auth/types.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

export const AUTHENTICATED_PRINCIPAL = {
  principalId: 'user-1',
  principalType: 'user' as const,
  subjectId: 'subject-1',
  issuer: 'https://issuer.example/',
  audience: 'dvt-api',
  expiresAt: new Date('2026-03-14T00:00:00Z'),
  rawScopes: [],
  assertedTenantIds: [],
  assertedProjectIds: [],
};

export const AUTHORIZED_CONTEXT = {
  principal: AUTHENTICATED_PRINCIPAL,
  scope: {
    tenantId: TenantId.unsafe('tenant-1'),
    projectId: ProjectId.unsafe('project-1'),
    environmentId: EnvironmentId.unsafe('env-1'),
  },
  action: { kind: 'command' as const, name: 'run:start' as const },
  requestId: 'req-1',
  authorizedAt: new Date('2026-03-14T00:00:00Z'),
} satisfies AuthorizedCommandExecutionContext;

export const START_RUN_FACADE_INPUT = {
  token: 'token',
  requestId: 'req-1',
  command: {
    planRef: parsePlanRef({
      uri: 'https://plans.example.com/plan.json',
      sha256: 'deadbeef',
      schemaVersion: '1.0.0',
      planId: 'plan-1',
      planVersion: '2.0',
    }),
    runId: 'run-1',
    targetAdapter: 'temporal' as const,
    selection: parseExecutionSelection({
      mode: 'explicit',
      nodeIds: ['step_a'],
    }),
  },
  requestedScope: {
    tenantId: TenantId.unsafe('tenant-1'),
    projectId: ProjectId.unsafe('project-1'),
    environmentId: EnvironmentId.unsafe('env-1'),
    action: { kind: 'command' as const, name: 'run:start' as const },
  },
};

type StartRunAuthorizer = Pick<AuthorizeCommandScopeService, 'authorize'>;

type FacadeOverrides = {
  readonly authenticator?: IAuthenticator;
  readonly authorizer?: StartRunAuthorizer;
  readonly useCase?: IStartRunUseCase;
  readonly telemetry?: IStartRunLatencyTelemetry;
};

export function buildStartRunAuthorizedFacade(
  overrides: FacadeOverrides = {}
): StartRunAuthorizedFacade {
  const authenticator: IAuthenticator = overrides.authenticator ?? {
    async authenticateBearerToken() {
      return { ok: true as const, principal: AUTHENTICATED_PRINCIPAL };
    },
  };
  const authorizer: StartRunAuthorizer = overrides.authorizer ?? {
    async authorize<TAction extends AuthorizationAction>(
      principal: AuthenticatedPrincipal,
      requestedScope: RequestedScope & { readonly action: TAction },
      requestId: string
    ): Promise<
      | { readonly ok: true; readonly context: AuthorizedExecutionContext<TAction> }
      | { readonly ok: false; readonly reason: DeniedReason }
    > {
      return {
        ok: true as const,
        context: {
          principal,
          scope: {
            tenantId: requestedScope.tenantId,
            ...(requestedScope.projectId === undefined
              ? {}
              : { projectId: requestedScope.projectId }),
            ...(requestedScope.environmentId === undefined
              ? {}
              : { environmentId: requestedScope.environmentId }),
          },
          action: requestedScope.action,
          requestId,
          authorizedAt: AUTHORIZED_CONTEXT.authorizedAt,
        },
      };
    },
  };
  const useCase: IStartRunUseCase = overrides.useCase ?? {
    async execute() {
      return {
        ok: true as const,
        value: { kind: 'accepted' as const, runId: 'run-1', accepted: true },
      };
    },
  };

  return new StartRunAuthorizedFacade(
    authenticator,
    authorizer as AuthorizeCommandScopeService,
    useCase,
    overrides.telemetry
  );
}
