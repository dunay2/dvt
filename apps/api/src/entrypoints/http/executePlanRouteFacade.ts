/**
 * Owned concern: generic protected plan-route execution seam that resolves the
 * request, delegates use-case execution, and emits mapped HTTP responses
 * without leaking route-local reply wiring.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';

import { HTTP_STATUS_CODE, type HttpStatusCode } from '../../routes/httpStatus.js';

import type { HttpResponseModel } from './httpErrorContract.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import type { ResolvedAuthorizedPlanRouteRequest } from './planRouteRequestResolver.js';

export type PlanRouteFacadeAccepted<TPayload> = {
  readonly kind: 'accepted';
  readonly payload: TPayload;
  readonly statusCode?: HttpStatusCode;
};

export type PlanRouteFacadeRejected = {
  readonly kind: 'rejected';
  readonly response: HttpResponseModel;
};

export type PlanRouteFacadeResponse<TPayload> =
  | PlanRouteFacadeAccepted<TPayload>
  | PlanRouteFacadeRejected;

export type ResolvedPlanRouteRequestOk<TParsedRequest> = Extract<
  ResolvedAuthorizedPlanRouteRequest<TParsedRequest>,
  { readonly ok: true }
>;

export function createPlanRouteHandler<TDeps, TParsedRequest, TResult, TPayload>(options: {
  readonly logMessage: string;
  readonly resolveRequest: (
    request: FastifyRequest<{ Body: unknown }>,
    deps: TDeps
  ) => Promise<ResolvedAuthorizedPlanRouteRequest<TParsedRequest>>;
  readonly executeUseCase: (
    resolvedRequest: ResolvedPlanRouteRequestOk<TParsedRequest>,
    deps: TDeps
  ) => Promise<TResult>;
  readonly mapResult: (
    result: TResult,
    resolvedRequest: ResolvedPlanRouteRequestOk<TParsedRequest>,
    deps: TDeps
  ) => PlanRouteFacadeResponse<TPayload>;
  readonly mapInternalError: (deps: TDeps) => HttpResponseModel;
}): (
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  deps: TDeps
) => Promise<void> {
  return async (
    request: FastifyRequest<{ Body: unknown }>,
    reply: FastifyReply,
    deps: TDeps
  ): Promise<void> => {
    await executePlanRouteFacade(request, reply, {
      logMessage: options.logMessage,
      resolveRequest: () => options.resolveRequest(request, deps),
      executeUseCase: (resolvedRequest) => options.executeUseCase(resolvedRequest, deps),
      mapResult: (result, resolvedRequest) => options.mapResult(result, resolvedRequest, deps),
      mapInternalError: () => options.mapInternalError(deps),
    });
  };
}

export async function executePlanRouteFacade<TParsedRequest, TResult, TPayload>(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  options: {
    readonly logMessage: string;
    readonly resolveRequest: () => Promise<ResolvedAuthorizedPlanRouteRequest<TParsedRequest>>;
    readonly executeUseCase: (
      resolvedRequest: ResolvedPlanRouteRequestOk<TParsedRequest>
    ) => Promise<TResult>;
    readonly mapResult: (
      result: TResult,
      resolvedRequest: ResolvedPlanRouteRequestOk<TParsedRequest>
    ) => PlanRouteFacadeResponse<TPayload>;
    readonly mapInternalError: () => HttpResponseModel;
  }
): Promise<void> {
  const resolvedRequest = await options.resolveRequest();
  if (!resolvedRequest.ok) {
    httpErrorTranslation.respond(reply, resolvedRequest.response);
    return;
  }

  try {
    const result = await options.executeUseCase(resolvedRequest);
    const mappedResult = options.mapResult(result, resolvedRequest);
    if (mappedResult.kind === 'rejected') {
      httpErrorTranslation.respond(reply, mappedResult.response);
      return;
    }

    reply
      .code(mappedResult.statusCode ?? HTTP_STATUS_CODE.ok)
      .send(mappedResult.payload);
  } catch (error) {
    request.log.error({ err: error }, options.logMessage);
    httpErrorTranslation.respond(reply, options.mapInternalError());
  }
}
