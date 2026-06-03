import { describe, expect, it, vi } from 'vitest';

import type { AuthorizedCommandExecutionContext } from '../../../src/application/ports/auth.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';
import {
  createPlanRouteHandler,
  executePlanRouteFacade,
} from '../../../src/entrypoints/http/executePlanRouteFacade.js';
import type { HttpResponseModel } from '../../../src/entrypoints/http/httpErrorContract.js';
import { HTTP_STATUS_CODE } from '../../../src/routes/httpStatus.js';

import { createPreviewRequest, createReply } from './planRouteHttpTestSupport.js';

function createHttpResponseModel(status: number, body: Record<string, unknown>): HttpResponseModel {
  return {
    status: status as HttpResponseModel['status'],
    body,
  };
}

function createAuthorizedCommandContext(): AuthorizedCommandExecutionContext {
  return {
    principal: {
      principalId: 'principal-1',
      principalType: 'user',
      subjectId: 'subject-1',
      issuer: 'issuer-1',
      audience: 'audience-1',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      rawScopes: [],
      assertedTenantIds: ['tenant-1'],
      assertedProjectIds: ['project-1'],
    },
    scope: {
      resource: 'environment',
      tenantId: TenantId.unsafe('tenant-1'),
      projectId: ProjectId.unsafe('project-1'),
      environmentId: EnvironmentId.unsafe('env-1'),
    },
    action: { kind: 'command', name: 'run:start' },
    requestId: 'req-plan-route',
    authorizedAt: new Date('2026-04-19T00:00:00.000Z'),
  };
}

describe('executePlanRouteFacade', () => {
  it('sends resolver rejection without delegating to the use case', async () => {
    const request = createPreviewRequest({ id: 'req-plan-route-facade-rejected' });
    const reply = createReply();
    const executeUseCase = vi.fn();
    const mapResult = vi.fn();

    await executePlanRouteFacade(request as never, reply as never, {
      logMessage: 'plan route failed',
      resolveRequest: async () => ({
        ok: false,
        response: createHttpResponseModel(HTTP_STATUS_CODE.badRequest, {
          error: { type: 'bad_request', reason: 'invalid_body' },
        }),
      }),
      executeUseCase,
      mapResult,
      mapInternalError: () =>
        createHttpResponseModel(HTTP_STATUS_CODE.internalServerError, {
          error: { type: 'internal_server_error', reason: 'unexpected' },
        }),
    });

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({
      error: { type: 'bad_request', reason: 'invalid_body' },
    });
    expect(executeUseCase).not.toHaveBeenCalled();
    expect(mapResult).not.toHaveBeenCalled();
  });

  it('sends accepted payloads with the default 200 status', async () => {
    const request = createPreviewRequest({ id: 'req-plan-route-facade-accepted' });
    const reply = createReply();
    const resolvedRequest = {
      ok: true as const,
      parsedRequest: { routeId: 'preview' },
      context: createAuthorizedCommandContext(),
    };

    await executePlanRouteFacade(request as never, reply as never, {
      logMessage: 'plan route failed',
      resolveRequest: async () => resolvedRequest,
      executeUseCase: async () => ({ planId: 'plan-1' }),
      mapResult: (result) => ({
        kind: 'accepted' as const,
        payload: { planId: result.planId },
      }),
      mapInternalError: () =>
        createHttpResponseModel(HTTP_STATUS_CODE.internalServerError, {
          error: { type: 'internal_server_error', reason: 'unexpected' },
        }),
    });

    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toEqual({ planId: 'plan-1' });
  });

  it('honors explicit accepted status codes from the route-owned mapper', async () => {
    const request = createPreviewRequest({ id: 'req-plan-route-facade-custom-status' });
    const reply = createReply();

    await executePlanRouteFacade(request as never, reply as never, {
      logMessage: 'plan route failed',
      resolveRequest: async () => ({
        ok: true,
        parsedRequest: { routeId: 'compile' },
        context: createAuthorizedCommandContext(),
      }),
      executeUseCase: async () => ({ accepted: true }),
      mapResult: () => ({
        kind: 'accepted',
        statusCode: HTTP_STATUS_CODE.accepted,
        payload: { accepted: true },
      }),
      mapInternalError: () =>
        createHttpResponseModel(HTTP_STATUS_CODE.internalServerError, {
          error: { type: 'internal_server_error', reason: 'unexpected' },
        }),
    });

    expect(reply.statusCode).toBe(202);
    expect(reply.payload).toEqual({ accepted: true });
  });

  it('sends rejected mapper responses without overriding the route-owned payload', async () => {
    const request = createPreviewRequest({ id: 'req-plan-route-facade-mapped-rejected' });
    const reply = createReply();

    await executePlanRouteFacade(request as never, reply as never, {
      logMessage: 'plan route failed',
      resolveRequest: async () => ({
        ok: true,
        parsedRequest: { routeId: 'import' },
        context: createAuthorizedCommandContext(),
      }),
      executeUseCase: async () => ({ outcome: 'rejected' }),
      mapResult: () => ({
        kind: 'rejected',
        response: createHttpResponseModel(HTTP_STATUS_CODE.forbidden, {
          error: { type: 'forbidden', reason: 'tenant_access_denied' },
        }),
      }),
      mapInternalError: () =>
        createHttpResponseModel(HTTP_STATUS_CODE.internalServerError, {
          error: { type: 'internal_server_error', reason: 'unexpected' },
        }),
    });

    expect(reply.statusCode).toBe(403);
    expect(reply.payload).toEqual({
      error: { type: 'forbidden', reason: 'tenant_access_denied' },
    });
  });

  it('logs internal errors and sends the mapped failure response', async () => {
    const logError = vi.fn();
    const request = createPreviewRequest({
      id: 'req-plan-route-facade-internal-error',
      logError,
    });
    const reply = createReply();
    const internalError = new Error('boom');
    const mapResult = vi.fn();

    await executePlanRouteFacade(request as never, reply as never, {
      logMessage: 'plan route failed',
      resolveRequest: async () => ({
        ok: true,
        parsedRequest: { routeId: 'preview' },
        context: createAuthorizedCommandContext(),
      }),
      executeUseCase: async () => {
        throw internalError;
      },
      mapResult,
      mapInternalError: () =>
        createHttpResponseModel(HTTP_STATUS_CODE.internalServerError, {
          error: { type: 'internal_server_error', reason: 'preview_failed' },
        }),
    });

    expect(logError).toHaveBeenCalledWith({ err: internalError }, 'plan route failed');
    expect(reply.statusCode).toBe(500);
    expect(reply.payload).toEqual({
      error: { type: 'internal_server_error', reason: 'preview_failed' },
    });
    expect(mapResult).not.toHaveBeenCalled();
  });

  it('builds route handlers that delegate request resolution and result mapping through one shared shape', async () => {
    const reply = createReply();
    const request = createPreviewRequest({ id: 'req-plan-route-handler-ok' });
    const resolveRequest = vi.fn(async () => ({
      ok: true as const,
      parsedRequest: { command: { planId: 'plan-1' } },
      context: createAuthorizedCommandContext(),
    }));
    const executeUseCase = vi.fn(async () => ({ persisted: true }));
    const mapResult = vi.fn(() => ({
      kind: 'accepted' as const,
      payload: { persisted: true },
    }));
    const handler = createPlanRouteHandler({
      logMessage: 'plan route failed',
      resolveRequest,
      executeUseCase,
      mapResult,
      mapInternalError: () =>
        createHttpResponseModel(HTTP_STATUS_CODE.internalServerError, {
          error: { type: 'internal_server_error', reason: 'unexpected' },
        }),
    });
    const deps = { useCase: { kind: 'preview' } };

    await handler(request as never, reply as never, deps);

    expect(resolveRequest).toHaveBeenCalledWith(request, deps);
    expect(executeUseCase).toHaveBeenCalledWith(
      expect.objectContaining({
        parsedRequest: { command: { planId: 'plan-1' } },
      }),
      deps
    );
    expect(mapResult).toHaveBeenCalledWith(
      { persisted: true },
      expect.objectContaining({
        parsedRequest: { command: { planId: 'plan-1' } },
      }),
      deps
    );
    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toEqual({ persisted: true });
  });

  it('builds route handlers that reuse the shared executor internal-error branch', async () => {
    const logError = vi.fn();
    const request = createPreviewRequest({
      id: 'req-plan-route-handler-error',
      logError,
    });
    const reply = createReply();
    const internalError = new Error('boom');
    const handler = createPlanRouteHandler({
      logMessage: 'plan route failed',
      resolveRequest: async () => ({
        ok: true,
        parsedRequest: { command: { planId: 'plan-1' } },
        context: createAuthorizedCommandContext(),
      }),
      executeUseCase: async () => {
        throw internalError;
      },
      mapResult: () => ({
        kind: 'accepted',
        payload: { persisted: true },
      }),
      mapInternalError: () =>
        createHttpResponseModel(HTTP_STATUS_CODE.internalServerError, {
          error: { type: 'internal_server_error', reason: 'plan_route_failed' },
        }),
    });

    await handler(request as never, reply as never, {});

    expect(logError).toHaveBeenCalledWith({ err: internalError }, 'plan route failed');
    expect(reply.statusCode).toBe(500);
    expect(reply.payload).toEqual({
      error: { type: 'internal_server_error', reason: 'plan_route_failed' },
    });
  });
});
