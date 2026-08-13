import { describe, expect, it } from 'vitest';

import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';
import { resolveAuthorizedPlanRouteRequest } from '../../../src/entrypoints/http/planRouteRequestResolver.js';
import { badRequestResult } from '../../../src/entrypoints/http/routeParseIssue.js';

import { createPreviewRequest, okAuthDeps } from './planRouteHttpTestSupport.js';

type ParsedPlanRouteRequest = {
  readonly routeContext: {
    readonly tenantId: TenantId;
    readonly projectId: ProjectId;
    readonly environmentId: EnvironmentId;
  };
  readonly bodyKind: 'preview';
};

function buildParsedRequest(): ParsedPlanRouteRequest {
  return {
    routeContext: {
      tenantId: TenantId.unsafe('tenant-1'),
      projectId: ProjectId.unsafe('project-1'),
      environmentId: EnvironmentId.unsafe('env-1'),
    },
    bodyKind: 'preview',
  };
}

describe('resolveAuthorizedPlanRouteRequest', () => {
  it('returns parse failures directly without calling authentication or authorization', async () => {
    const deps = okAuthDeps();
    const request = createPreviewRequest({ id: 'req-plan-route-parse-failure' });

    const result = await resolveAuthorizedPlanRouteRequest(
      request as never,
      deps as never,
      badRequestResult<ParsedPlanRouteRequest>('invalid_body'),
      {
        selectRequestedScope: (parsedRequest) => parsedRequest.routeContext,
      }
    );

    expect(result).toEqual({
      ok: false,
      response: {
        status: 400,
        body: {
          error: { type: 'bad_request', reason: 'invalid_body' },
        },
      },
    });
    expect(deps.authenticator.authenticateBearerToken).not.toHaveBeenCalled();
    expect(deps.authorizer.authorize).not.toHaveBeenCalled();
  });

  it('authorizes the requested scope with the canonical plan command action', async () => {
    const deps = okAuthDeps();
    const request = createPreviewRequest({
      id: 'req-plan-route-authorized',
      authorization: 'Bearer shared-token',
    });
    const parsedRequest = buildParsedRequest();
    const action = { kind: 'command', name: 'run:start' } as const;

    const result = await resolveAuthorizedPlanRouteRequest(
      request as never,
      deps as never,
      { ok: true, value: parsedRequest },
      {
        selectRequestedScope: (value) => value.routeContext,
      }
    );

    expect(deps.authenticator.authenticateBearerToken).toHaveBeenCalledWith('shared-token');
    expect(deps.authorizer.authorize).toHaveBeenCalledWith(
      expect.objectContaining({ principalId: 'principal-1' }),
      {
        resource: 'environment',
        tenantId: parsedRequest.routeContext.tenantId,
        projectId: parsedRequest.routeContext.projectId,
        environmentId: parsedRequest.routeContext.environmentId,
        action,
      },
      'req-plan-route-authorized'
    );
    expect(result).toMatchObject({
      ok: true,
      parsedRequest,
      context: expect.objectContaining({
        principal: { principalId: 'principal-1' },
      }),
    });
  });

  it('returns authorization failures as HTTP responses without exposing a resolved request', async () => {
    const deps = okAuthDeps();
    deps.authorizer.authorize.mockResolvedValueOnce({
      ok: false,
      reason: 'ACTION_NOT_GRANTED',
    });
    const request = createPreviewRequest({ id: 'req-plan-route-forbidden' });

    const result = await resolveAuthorizedPlanRouteRequest(
      request as never,
      deps as never,
      { ok: true, value: buildParsedRequest() },
      {
        selectRequestedScope: (value) => value.routeContext,
      }
    );

    expect(result).toEqual({
      ok: false,
      response: {
        status: 403,
        body: {
          error: { type: 'forbidden', reason: 'action_not_granted' },
        },
      },
    });
  });
});
