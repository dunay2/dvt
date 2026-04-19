import type { FastifyReply, FastifyRequest } from 'fastify';

import { HTTP_STATUS_CODE, type HttpStatusCode } from '../../routes/httpStatus.js';

import { sendHttpResponse, type HttpResponseModel } from './httpErrorContract.js';
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

export async function executePlanRouteFacade<TParsedRequest, TResult, TPayload>(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  options: {
    readonly logMessage: string;
    readonly resolveRequest: () => Promise<ResolvedAuthorizedPlanRouteRequest<TParsedRequest>>;
    readonly executeUseCase: (
      resolvedRequest: Extract<
        ResolvedAuthorizedPlanRouteRequest<TParsedRequest>,
        { readonly ok: true }
      >
    ) => Promise<TResult>;
    readonly mapResult: (
      result: TResult,
      resolvedRequest: Extract<
        ResolvedAuthorizedPlanRouteRequest<TParsedRequest>,
        { readonly ok: true }
      >
    ) => PlanRouteFacadeResponse<TPayload>;
    readonly mapInternalError: () => HttpResponseModel;
  }
): Promise<void> {
  const resolvedRequest = await options.resolveRequest();
  if (!resolvedRequest.ok) {
    sendHttpResponse(reply, resolvedRequest.response);
    return;
  }

  try {
    const result = await options.executeUseCase(resolvedRequest);
    const mappedResult = options.mapResult(result, resolvedRequest);
    if (mappedResult.kind === 'rejected') {
      sendHttpResponse(reply, mappedResult.response);
      return;
    }

    reply
      .code(mappedResult.statusCode ?? HTTP_STATUS_CODE.ok)
      .send(mappedResult.payload);
  } catch (error) {
    request.log.error({ err: error }, options.logMessage);
    sendHttpResponse(reply, options.mapInternalError());
  }
}
